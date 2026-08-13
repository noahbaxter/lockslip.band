// Now Playing bar and zen mode
//
// The release card's player is where you start a record. Once it is playing you
// are scrolling somewhere else, so the transport follows you as a bar along the
// bottom, and expands to fill the screen when the record is all you want.
//
// It owns no audio of its own: it reads whichever PlayerInstance currently holds
// the shared element and calls that instance's methods, so there is one source of
// truth for what is playing.

const NowPlaying = {
    built: false,
    // Declared rather than left undefined: classList.toggle(name, undefined)
    // ignores the second argument and flips the class, so an unset flag turns
    // into a control that lights up on its own.
    lyricsOpen: false,
    pickerOpen: false,
    pickerRelease: '',
    pickerSig: '',

    owner() {
        const owner = AudioPlayer.owner;
        return owner && !owner.stopped ? owner : null;
    },

    build() {
        if (this.built) return;
        this.built = true;

        const bar = document.createElement('div');
        bar.className = 'np-bar';
        bar.hidden = true;
        bar.innerHTML = `
            <div class="np-progress"><div class="np-progress-fill"></div></div>
            <div class="np-bar-start">
                <button class="np-queue" type="button" aria-label="Choose a track or release">
                    <svg viewBox="0 0 24 24"><path d="M4 6h11M4 12h11M4 18h8M17 12v7M17 12l4 2-4 2" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>
                </button>
                <button class="np-open" type="button" title="Open full screen player"
                        aria-label="Open full screen player">
                    <img class="np-art" alt="">
                    <span class="np-text">
                        <span class="np-title"></span>
                        <span class="np-release"></span>
                    </span>
                    <svg class="np-open-hint" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M7 14l5-5 5 5" stroke="currentColor" stroke-width="2" fill="none"
                              stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
            <div class="np-controls">
                <button class="np-prev" type="button" aria-label="Previous track">
                    <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                </button>
                <button class="np-play" type="button" aria-label="Pause">
                    <svg class="np-icon-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    <svg class="np-icon-pause" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                </button>
                <button class="np-next" type="button" aria-label="Next track">
                    <svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                </button>
            </div>
            <div class="np-bar-end">
                <span class="np-time">
                    <span class="np-elapsed">00:00</span> / <span class="np-total">00:00</span>
                </span>
                <button class="np-stop" type="button" aria-label="Stop playback">
                    <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                </button>
            </div>
        `;

        const zen = document.createElement('div');
        zen.className = 'np-zen';
        zen.hidden = true;
        zen.innerHTML = `
            <div class="np-zen-stage">
                <img class="np-zen-art" alt="">
                <div class="np-zen-lyrics" hidden></div>
            </div>
            <div class="np-zen-meta">
                <div class="np-zen-title"></div>
                <div class="np-zen-release"></div>
            </div>
            <div class="np-zen-seek"><div class="np-zen-seek-fill"></div></div>
            <div class="np-zen-times"><span class="np-zen-elapsed">00:00</span><span class="np-zen-total">00:00</span></div>
            <div class="np-zen-transport">
                <span class="np-zen-side">
                    <button class="np-zen-queue" type="button" aria-pressed="false"
                            aria-label="Choose a track or release">
                        <svg viewBox="0 0 24 24"><path d="M4 6h11M4 12h11M4 18h8M17 12v7M17 12l4 2-4 2" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>
                    </button>
                </span>
                <div class="np-zen-buttons">
                    <button class="np-zen-prev" type="button" aria-label="Previous track">
                        <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                    </button>
                    <button class="np-zen-play" type="button" aria-label="Pause">
                        <svg class="np-icon-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        <svg class="np-icon-pause" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    </button>
                    <button class="np-zen-next" type="button" aria-label="Next track">
                        <svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                    </button>
                </div>
                <span class="np-zen-side">
                    <button class="np-zen-lyrics-toggle" type="button" aria-pressed="false" aria-label="Show lyrics" hidden>
                        <img src="assets/icons/lyrics.png" alt="">
                    </button>
                </span>
            </div>
            <button class="np-zen-close" type="button" aria-label="Leave full screen player">
                <svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" fill="none"/></svg>
            </button>
        `;

        // One picker, moved between the two places it can appear: over the artwork
        // in zen mode, and sliding up off the bar's left end otherwise. Two copies
        // would mean two lists to keep in step.
        const picker = document.createElement('div');
        picker.className = 'np-picker';
        picker.hidden = true;
        picker.innerHTML = `
            <div class="np-picker-releases"></div>
            <ol class="np-picker-tracks"></ol>
        `;

        document.body.append(bar, zen, picker);
        this.bar = bar;
        this.zen = zen;
        this.picker = picker;
        this.el = {
            art: bar.querySelector('.np-art'),
            title: bar.querySelector('.np-title'),
            release: bar.querySelector('.np-release'),
            fill: bar.querySelector('.np-progress-fill'),
            progress: bar.querySelector('.np-progress'),
            elapsed: bar.querySelector('.np-elapsed'),
            total: bar.querySelector('.np-total'),
            play: bar.querySelector('.np-play'),
            zenArt: zen.querySelector('.np-zen-art'),
            zenLyrics: zen.querySelector('.np-zen-lyrics'),
            zenTitle: zen.querySelector('.np-zen-title'),
            zenRelease: zen.querySelector('.np-zen-release'),
            zenSeek: zen.querySelector('.np-zen-seek'),
            zenFill: zen.querySelector('.np-zen-seek-fill'),
            zenElapsed: zen.querySelector('.np-zen-elapsed'),
            zenTotal: zen.querySelector('.np-zen-total'),
            zenPlay: zen.querySelector('.np-zen-play'),
            zenLyricsToggle: zen.querySelector('.np-zen-lyrics-toggle'),
            zenQueue: zen.querySelector('.np-zen-queue'),
            queue: bar.querySelector('.np-queue'),
            pickerReleases: picker.querySelector('.np-picker-releases'),
            pickerTracks: picker.querySelector('.np-picker-tracks'),
        };

        const act = fn => e => {
            e.preventDefault();
            e.stopPropagation();
            const owner = this.owner();
            if (owner) fn(owner);
        };

        bar.querySelector('.np-open').addEventListener('click', () => this.openZen());
        bar.querySelector('.np-queue').addEventListener('click', e => {
            e.stopPropagation();
            this.togglePicker();
        });
        this.el.zenQueue.addEventListener('click', () => this.togglePicker());

        // Clicks inside the panel never reach the dismiss handler below. Testing the
        // target's ancestors there is not enough: switching release rebuilds the tab
        // row, so by the time the event bubbles the button you pressed has been
        // detached and reads as though it came from outside.
        picker.addEventListener('click', e => e.stopPropagation());

        // Anywhere else dismisses the popover, the way a menu behaves. In zen mode
        // the picker is part of the layout, so it stays until you press the button.
        document.addEventListener('click', e => {
            if (!this.pickerOpen || !this.zen.hidden) return;
            if (e.target.closest('.np-queue')) return;
            this.pickerOpen = false;
            this.sync();
        });
        bar.querySelector('.np-prev').addEventListener('click', act(o => o.prev()));
        bar.querySelector('.np-next').addEventListener('click', act(o => o.next()));
        bar.querySelector('.np-play').addEventListener('click', act(o => o.toggle()));
        // Stop, not pause: the record goes back to the top, every row deselects and
        // the bar leaves. Pausing is what the play button is for.
        bar.querySelector('.np-stop').addEventListener('click', act(o => o.stop()));

        zen.querySelector('.np-zen-close').addEventListener('click', () => this.closeZen());
        zen.querySelector('.np-zen-prev').addEventListener('click', act(o => o.prev()));
        zen.querySelector('.np-zen-next').addEventListener('click', act(o => o.next()));
        zen.querySelector('.np-zen-play').addEventListener('click', act(o => o.toggle()));
        this.el.zenLyricsToggle.addEventListener('click', () => this.toggleLyrics());

        // Both progress bars scrub, off whichever one the drag started on. The bar
        // at the foot of the page is a transport, so it takes a scrub like any
        // other, not just the full screen one.
        const seek = e => {
            const owner = this.owner();
            const dur = owner && owner.dur();
            if (!owner || !dur || !owner.audio || !this.seekEl) return;
            const rect = this.seekEl.getBoundingClientRect();
            const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
            // Scrubbing a paused track to its end must not advance the record.
            if (owner.audio.paused) owner.suppressAdvance = true;
            owner.audio.currentTime = Math.max(0, Math.min(1, x / rect.width)) * dur;
            this.sync();
        };

        // A knob follows the pointer along the track so you can see where a click
        // would land before you commit to it.
        // Pixels off the track's left edge, written straight to a transform. No
        // rAF in between: the pointer event is already frame-aligned, and queuing
        // it would put the marker a frame behind the cursor.
        const mark = (track, e) => {
            const rect = track.getBoundingClientRect();
            const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
            track.style.setProperty('--np-hover-x', x + 'px');
        };

        [this.el.zenSeek, this.el.progress].forEach(track => {
            track.addEventListener('mousedown', e => {
                e.preventDefault();
                this.seekEl = track;
                track.classList.add('is-scrubbing');
                seek(e);
            });
            track.addEventListener('touchstart', e => { this.seekEl = track; seek(e); }, { passive: true });
            track.addEventListener('mousemove', e => mark(track, e));
            document.addEventListener('mousemove', e => { if (this.seekEl === track) mark(track, e); });
        });

        document.addEventListener('mousemove', e => { if (this.seekEl) seek(e); });
        document.addEventListener('touchmove', e => { if (this.seekEl) seek(e); }, { passive: true });
        const endScrub = () => {
            if (!this.seekEl) return;
            this.seekEl.classList.remove('is-scrubbing');
            this.seekEl = null;
        };
        document.addEventListener('mouseup', endScrub);
        document.addEventListener('touchend', endScrub);

        document.addEventListener('keydown', e => {
            // Escape is the way out, not a step back through layers: it leaves the
            // full screen player and takes the lyrics or the list with it, the same
            // as pressing the chevron.
            if (e.key === 'Escape') {
                if (!this.zen.hidden) this.closeZen();
                return;
            }
            if (e.key !== ' ' && e.key !== 'Spacebar') return;

            // Space is the transport key while a record is up, wherever you are on
            // the page and whatever you last clicked. Only typing outranks it.
            //
            // It deliberately takes the key off focused buttons too. Otherwise the
            // last thing you clicked keeps the spacebar, and clicking a tab or a
            // lyrics toggle silently costs you play/pause. Enter still presses
            // whatever has focus, so nothing becomes unreachable.
            const el = e.target;
            const tag = el && el.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
                || (el && el.isContentEditable)) return;

            const owner = this.owner();
            if (!owner) return;
            e.preventDefault();
            owner.toggle();
        });
    },

    openZen() {
        if (!this.owner()) return;
        this.zen.hidden = false;
        document.body.classList.add('np-zen-open');
        UrlState.zen(true);
        this.sync();
    },

    // Leaving takes the lyrics and the list with it. They belong to the full screen
    // view, and a list left open would reappear as a popover over the page.
    closeZen() {
        this.zen.hidden = true;
        this.pickerOpen = false;
        this.lyricsOpen = false;
        document.body.classList.remove('np-zen-open');
        UrlState.zen(false);
        this.sync();
    },

    // Lyrics stand in for the artwork rather than sitting under it, so a verse gets
    // the height on a phone. The picker uses the same space, so only one is up.
    toggleLyrics() {
        this.lyricsOpen = !this.lyricsOpen;
        if (this.lyricsOpen) this.pickerOpen = false;
        this.sync();
    },

    togglePicker() {
        this.pickerOpen = !this.pickerOpen;
        if (this.pickerOpen) this.lyricsOpen = false;
        this.sync();
    },

    // Every release on the page and the tracks of whichever one you are looking
    // at. Picking a track from another record hands it the shared element, which
    // is the same path the release card's own rows take.
    // Zen mode gives it the artwork's slot; otherwise it slides up off the bar's
    // left end. Moved rather than duplicated, so there is one list either way.
    placePicker() {
        const inZen = !this.zen.hidden;
        const home = inZen ? this.zen.querySelector('.np-zen-stage') : document.body;
        if (this.picker.parentElement !== home) home.appendChild(this.picker);
        this.picker.classList.toggle('is-in-zen', inZen);
        this.picker.classList.toggle('is-popover', !inZen);
    },

    renderPicker(owner) {
        const players = AudioPlayer.instances.filter(i => i.tracks.length);
        const shown = players.find(i => i.id === this.pickerRelease) || owner;
        this.pickerRelease = shown.id;

        // sync() runs every animation frame while a track plays. Rebuilding the
        // list that often churns the DOM and, worse, swaps the row out from under
        // a click, so it only redraws when what it shows has actually changed.
        const sig = [shown.id, owner.id, owner.index, players.length].join('|');
        if (sig === this.pickerSig) return;
        this.pickerSig = sig;

        this.el.pickerReleases.textContent = '';
        players.forEach(inst => {
            const tab = document.createElement('button');
            tab.type = 'button';
            tab.className = 'np-picker-release';
            tab.classList.toggle('is-shown', inst === shown);
            tab.classList.toggle('is-playing', inst === owner);
            tab.textContent = inst.releaseTitle || inst.id;
            tab.addEventListener('click', () => {
                this.pickerRelease = inst.id;
                this.sync();
            });
            this.el.pickerReleases.appendChild(tab);
        });

        this.el.pickerTracks.textContent = '';
        shown.tracks.forEach((track, i) => {
            const row = document.createElement('li');
            row.className = 'np-picker-track';
            const playable = shown.canPlay(i);
            row.classList.toggle('is-unavailable', !playable);
            row.classList.toggle('is-current', shown === owner && i === owner.index);

            const num = document.createElement('span');
            num.className = 'np-picker-num';
            num.textContent = track.num;
            const name = document.createElement('span');
            name.className = 'np-picker-name';
            name.textContent = shown.title(track);
            const dur = document.createElement('span');
            dur.className = 'np-picker-dur';
            dur.textContent = shown.fmt(track.duration || 0);
            row.append(num, name, dur);

            if (playable) row.addEventListener('click', () => shown.playTrack(i));
            else row.setAttribute('aria-disabled', 'true');
            this.el.pickerTracks.appendChild(row);
        });
    },

    lyricsFor(owner) {
        if (typeof ReleasesComponent === 'undefined' || !owner.id) return null;
        const set = ReleasesComponent.lyricsFor(owner.id);
        if (!set) return null;
        const track = owner.tracks[owner.index];
        const body = (set.tracks || {})[String(track.num)];
        if (body) return body;
        return (set.instrumental || []).includes(track.num) ? 'Instrumental' : 'Lyrics not available yet';
    },

    sync() {
        if (!this.built) return;
        const owner = this.owner();

        if (!owner) {
            // Handing the shared element from one release to another passes through
            // a moment with no owner: claim() stops the old instance before the new
            // one marks itself playing. Acting on that instant tore the bar down and
            // dropped you out of zen every time you picked a track from another
            // record, so the idle state has to survive a frame to count.
            cancelAnimationFrame(this.idleRaf);
            this.idleRaf = requestAnimationFrame(() => {
                if (this.owner()) return this.sync();
                this.bar.hidden = true;
                document.body.classList.remove('np-playing');
                this.pickerOpen = false;
                this.picker.hidden = true;
                if (!this.zen.hidden) this.closeZen();
            });
            return;
        }
        cancelAnimationFrame(this.idleRaf);

        const track = owner.tracks[owner.index] || {};
        const title = owner.title ? owner.title(track) : track.name;
        const dur = owner.dur();
        const cur = (owner.audio && owner.audio.currentTime) || 0;
        const playing = !!(owner.audio && !owner.audio.paused);

        this.bar.hidden = !this.zen.hidden;
        document.body.classList.add('np-playing');

        // Putting a different record on makes it the record the site is about, so
        // the tab behind, the accent, the URL and what a return visit opens on all
        // follow it. Picking from zen's own list is the case that needs this:
        // there is no tab to click in there. Sync runs every frame, so this is the
        // one comparison that gates all of it.
        if (owner.id && owner.id !== this.followed) {
            this.followed = owner.id;
            if (typeof ReleasesComponent !== 'undefined' && ReleasesComponent.openRelease) {
                ReleasesComponent.openRelease(owner.id);
            }
            UrlState.zenRecord(owner.id);
        }

        this.placePicker();
        this.picker.hidden = !this.pickerOpen;
        this.picker.classList.toggle('is-open', Boolean(this.pickerOpen));
        this.el.queue.classList.toggle('is-open', Boolean(this.pickerOpen) && this.zen.hidden);
        if (this.pickerOpen) this.renderPicker(owner);

        if (owner.coverImage && this.el.art.getAttribute('src') !== owner.coverImage) {
            this.el.art.src = owner.coverImage;
            this.el.zenArt.src = owner.coverImage;
        }
        this.el.art.hidden = !owner.coverImage;
        this.el.title.textContent = title;
        this.el.release.textContent = owner.releaseTitle || '';
        this.el.fill.style.width = (dur ? Math.min(100, cur / dur * 100) : 0) + '%';
        this.el.elapsed.textContent = owner.fmt(cur);
        this.el.total.textContent = owner.fmt(dur);
        this.el.play.classList.toggle('is-playing', playing);
        this.el.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');

        if (this.zen.hidden) return;

        const lyrics = this.lyricsFor(owner);
        this.el.zenLyricsToggle.hidden = !lyrics;
        if (!lyrics) this.lyricsOpen = false;

        // Lyrics sit over the cover rather than replacing it, so the record is
        // still the thing you are looking at.
        this.el.zenLyrics.hidden = !this.lyricsOpen;
        this.el.zenArt.hidden = !owner.coverImage;
        if (this.lyricsOpen) this.el.zenLyrics.textContent = lyrics;

        this.el.zenLyricsToggle.classList.toggle('is-open', Boolean(this.lyricsOpen));
        this.el.zenLyricsToggle.setAttribute('aria-pressed', String(this.lyricsOpen));
        this.el.zenQueue.classList.toggle('is-open', Boolean(this.pickerOpen));
        this.el.zenQueue.setAttribute('aria-pressed', String(this.pickerOpen));

        this.el.zenTitle.textContent = title;
        this.el.zenRelease.textContent = owner.releaseTitle || '';
        this.el.zenFill.style.width = (dur ? Math.min(100, cur / dur * 100) : 0) + '%';
        this.el.zenElapsed.textContent = owner.fmt(cur);
        this.el.zenTotal.textContent = owner.fmt(dur);
        this.el.zenPlay.classList.toggle('is-playing', playing);
        this.el.zenPlay.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    },
};

// `const` at script scope is not a window property, so the player has to be given
// an explicit handle to call back through.
window.NowPlaying = NowPlaying;

document.addEventListener('DOMContentLoaded', () => NowPlaying.build());
