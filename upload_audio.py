#!/usr/bin/env python3
"""Upload encoded audio to the R2 bucket using the keys from a manifest.

Run encode_audio.py first. Keys carry a random prefix so the bucket cannot be
walked by guessing paths. The EP's prefix necessarily becomes public because the
player fetches it; the album's must stay out of the repo until release.

    python3 upload_audio.py /tmp/audio-dist/ep-manifest.json
    python3 upload_audio.py /tmp/audio-dist/lp1-manifest.json --dry-run
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

BUCKET = "lockslip"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("manifest")
    ap.add_argument("--bucket", default=BUCKET)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    m = json.loads(Path(args.manifest).read_text())
    local = Path(m["localDir"])
    tracks = m["tracks"]

    print(f"{m['title']}: {len(tracks)} files -> r2://{args.bucket}/")
    failed = []
    for t in tracks:
        key = t["file"]
        src = local / Path(key).name
        if not src.exists():
            sys.exit(f"missing local file: {src}")
        cmd = ["npx", "wrangler", "r2", "object", "put", f"{args.bucket}/{key}",
               "--file", str(src), "--content-type", "audio/mp4", "--remote"]
        if args.dry_run:
            print("  DRY " + " ".join(cmd))
            continue
        r = subprocess.run(cmd, capture_output=True, text=True)
        ok = r.returncode == 0
        mb = src.stat().st_size / 1048576
        print(f"  {'ok ' if ok else 'FAIL'} {key}  ({mb:.1f} MB)")
        if not ok:
            failed.append((key, (r.stderr or r.stdout).strip().splitlines()[-3:]))

    if failed:
        print(f"\n{len(failed)} failed:")
        for key, err in failed:
            print(f"  {key}: {' | '.join(err)}")
        sys.exit(1)
    if not args.dry_run:
        print("all uploaded")


if __name__ == "__main__":
    main()
