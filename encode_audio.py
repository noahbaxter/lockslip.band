#!/usr/bin/env python3
"""Encode mastered WAVs to web-ready AAC and emit a track manifest.

AAC in MP4 rather than MP3 because MP4 carries a sample table, so seeking lands on
the exact sample. MP3 has no index and browsers estimate byte offsets from average
bitrate, which puts seeks tens of seconds off on a long file. That matters now for
scrubbing and it matters more for the gapless work in BACKLOG.md.

Source WAVs stay where they are. This only writes derivatives.

Needs Pillow for the cover art, so run it from the venv:
    .venv/bin/python encode_audio.py ep
    .venv/bin/python encode_audio.py album
    .venv/bin/python encode_audio.py both --outdir /tmp/upload
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

FINALS = Path(
    "/Users/noahbaxter/Dropbox/Audio/Sessions/music projects/1 primary/22- lockslip"
    "/music/_FINALS_"
)

ART_DIR = Path(__file__).parent / "assets" / "releases"

RELEASES = {
    "ep": {
        "src": FINALS / "2024 EP1 Lockslip",
        "prefix": "ep",
        "title": "Lockslip - EP",
        "cover": "2024-ep-cover.jpg",
    },
    "album": {
        "src": FINALS / "2026 LP1 The Conversation",
        "prefix": "lp1",
        "title": "The Conversation",
        "cover": "2026-lp1-cover.jpg",
        # Titles come from the filenames. Guest credits are not part of the title,
        # they render as a badge next to it, keyed by track number.
        "features": {1: "King Yosef", 7: "Kathryn Edwards", 10: "Todd Jones"},
        # The master is filed as "Inglorius"; the record spells it Inglorious.
        "names": {6: "Inglorious"},
    },
}

# Random CDN path prefixes, so the bucket cannot be walked by guessing paths. Kept
# in a local-only file rather than here: this script is committed to a public repo,
# and the album's prefix must not ship while the record is unreleased.
PREFIX_FILE = Path(__file__).parent / "audio-prefixes.json"

BITRATE = "192k"
ART_MAX = 1200      # matches the releases target in CLAUDE.md
ART_QUALITY = 85


def slug(name):
    name = re.sub(r"[''`]", "", name)
    name = re.sub(r"[^a-zA-Z0-9]+", "-", name)
    return name.strip("-").lower()


def parse(path):
    """Pull track number and title out of 'Artist - Album - 01 - Title.wav'."""
    parts = [p.strip() for p in path.stem.split(" - ")]
    for i, p in enumerate(parts):
        if p.isdigit():
            return int(p), " - ".join(parts[i + 1:])
    return None, path.stem


def duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(path)],
        capture_output=True, text=True,
    ).stdout.strip()
    return round(float(out), 3) if out else 0.0


def encode(key, outroot):
    cfg = RELEASES[key]
    src = cfg["src"]
    if not src.is_dir():
        sys.exit(f"source not found: {src}")

    # Skip zero-byte files; the EP folder has an empty 'Full EP.wav' placeholder.
    wavs = sorted(w for w in src.glob("*.wav") if w.stat().st_size > 0)
    if not wavs:
        sys.exit(f"no wavs in {src}")

    outdir = outroot / cfg["prefix"]
    outdir.mkdir(parents=True, exist_ok=True)

    if not PREFIX_FILE.exists():
        sys.exit(f"missing {PREFIX_FILE.name}; it holds the CDN path prefixes and is "
                 f"deliberately untracked. Ask Noah or generate new ones.")
    cdn = json.loads(PREFIX_FILE.read_text())[key]

    features = cfg.get("features", {})
    names = cfg.get("names", {})

    tracks = []
    print(f"\n{cfg['title']}  ({len(wavs)} tracks)")
    for w in wavs:
        num, title = parse(w)
        if num is None:
            print(f"  skip (no track number): {w.name}")
            continue
        dest = outdir / f"{num:02d}-{slug(title)}.m4a"
        fresh = dest.exists() and dest.stat().st_mtime >= w.stat().st_mtime
        if not fresh:
            subprocess.run(
                ["ffmpeg", "-y", "-v", "error", "-i", str(w),
                 "-c:a", "aac", "-b:a", BITRATE, "-movflags", "+faststart",
                 str(dest)],
                check=True,
            )
        entry = {
            "num": num,
            "name": names.get(num, title),
            "file": f"{cdn}/{dest.name}",
            "duration": duration(dest),
        }
        if num in features:
            entry["feature"] = features[num]
        tracks.append(entry)
        mb = dest.stat().st_size / 1048576
        feat = f"   ft. {features[num]}" if num in features else ""
        print(f"  {num:02d}  {title[:38]:<38} {mb:6.1f} MB{feat}")

    # Cover art lives beside the masters. Copied into the repo rather than the CDN
    # so it loads without going through the referer gate.
    cover = None
    art_src = sorted(src.glob("*.jpg")) + sorted(src.glob("*.png"))
    if art_src and cfg.get("cover"):
        from PIL import Image
        ART_DIR.mkdir(parents=True, exist_ok=True)
        dest = ART_DIR / cfg["cover"]
        im = Image.open(art_src[0]).convert("RGB")
        # Same targets optimize_images.py uses for releases. Done here rather than
        # left to that script, which only resizes and would skip these as already
        # small enough while they are still ~900KB.
        im.thumbnail((ART_MAX, ART_MAX), Image.LANCZOS)
        im.save(dest, "JPEG", quality=ART_QUALITY, optimize=True, progressive=True)
        cover = f"assets/releases/{dest.name}"
        print(f"  cover {art_src[0].name} -> {cover} "
              f"({im.size[0]}x{im.size[1]}, {dest.stat().st_size / 1024:.0f} KB)")

    manifest = {"title": cfg["title"], "prefix": cfg["prefix"],
                "coverImage": cover, "localDir": str(outdir), "tracks": tracks}
    (outroot / f"{cfg['prefix']}-manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n"
    )
    total = sum((outdir / Path(t["file"]).name).stat().st_size for t in tracks)
    print(f"  total {total / 1048576:.1f} MB")
    return manifest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("which", choices=["ep", "album", "both"])
    ap.add_argument("--outdir", default="./audio-dist")
    args = ap.parse_args()

    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found")

    outroot = Path(args.outdir).expanduser().resolve()
    outroot.mkdir(parents=True, exist_ok=True)

    for key in (["ep", "album"] if args.which == "both" else [args.which]):
        encode(key, outroot)

    print(f"\nwrote to {outroot}")


if __name__ == "__main__":
    main()
