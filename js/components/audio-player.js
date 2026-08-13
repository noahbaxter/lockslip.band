// Audio Player Component
//
// Self-hosted album player. Replaces the Bandcamp iframe so the site controls the
// listening experience end to end. Ported from the private octopus demo page, made
// data-driven so several can live on one page.
//
// One <audio> element per player, src swapped on track change. There is a small gap
// at track boundaries (~5ms measured); making it truly gapless is its own project,
// see BACKLOG.md.

const AudioPlayer = {
    // Populated by ReleasesComponent.render() before the markup is inserted, then
    // drained by initAll(). Needed because rendering is string-templated, so there
    // is no element to hang data off until after innerHTML lands.
    pending: {},

    instances: [],

    // One <audio> for the whole page, lent to whichever release is playing.
    // Separate elements per player would let two releases run at once, and would
    // also confuse MediaSession later: the OS keys its lock screen off a single
    // element and shows whichever it noticed last.
    el: null,
    owner: null,

    audio() {
        if (this.el) return this.el;
        this.el = new Audio();
        this.el.preload = 'auto';
        // Events go to whoever currently holds the element, so the players don't
        // need listeners of their own.
        const toOwner = method => () => { if (this.owner) this.owner[method](); };
        this.el.addEventListener('play', toOwner('onPlay'));
        this.el.addEventListener('pause', toOwner('onPause'));
        this.el.addEventListener('ended', toOwner('onEnded'));
        this.el.addEventListener('loadedmetadata', toOwner('onMeta'));
        this.el.addEventListener('error', toOwner('onError'));
        return this.el;
    },

    // Hands the element to a player. Whoever had it goes back to idle, so
    // returning to that release is the same as arriving at it fresh.
    claim(instance) {
        if (this.owner !== instance) {
            const previous = this.owner;
            if (previous && !previous.stopped) previous.stop();
            this.owner = instance;
        }
        return this.audio();
    },

    register(id, data) {
        this.pending[id] = data;
    },

    mount(id) {
        return `<div class="audio-player" data-player="${id}"></div>`;
    },

    initAll() {
        document.querySelectorAll('.audio-player[data-player]').forEach(el => {
            const data = this.pending[el.dataset.player];
            if (data && !el.dataset.ready) this.instances.push(new PlayerInstance(el, data));
        });
    }
};

class PlayerInstance {
    constructor(root, data) {
        this.root = root;
        this.tracks = data.tracks || [];
        this.baseUrl = data.baseUrl || '';
        this.coverImage = data.coverImage || '';
        this.index = 0;
        this.raf = null;
        this.seeking = false;
        this.preloadAbort = null;
        this.unavailableNote = data.unavailableNote || 'Not yet available';
        this.onArtClick = data.onArtClick || null;
        this.onLyrics = data.onLyrics || null;
        this.lyricsOpen = false;
        // Idle: cued to the first track but nothing playing and no row marked.
        // This is both the state a fresh player starts in and the one it returns
        // to when the record runs out, so the two are indistinguishable.
        this.stopped = true;
        // Scrubbing to the very end of a paused track fires 'ended'. That is not
        // the record moving on, so it must not advance.
        this.suppressAdvance = false;

        if (!this.tracks.length) return;

        // A release can list its tracks before the audio exists, the way Bandcamp
        // shows an upcoming record. Availability is per track, so a record can go
        // up with only its single playable and the rest listed but greyed out.
        this.playable = Boolean(this.baseUrl) && this.tracks.some(t => t.file);


        root.dataset.ready = '1';
        this.build();
        this.wire();
        this.renderTrack();
    }

    // True only while this player holds the shared element.
    owns() {
        return AudioPlayer.owner === this;
    }

    // The shared element, or null when another release has it. Reading playback
    // state off it while someone else owns it would report their position.
    get audio() {
        return this.owns() ? AudioPlayer.el : null;
    }

    canPlay(i) {
        const t = this.tracks[i];
        return Boolean(this.baseUrl && t && t.file);
    }

    // Next playable row in either direction, or -1. Skipping is what makes the
    // transport agree with the greyed rows: nothing gets you to a track that
    // isn't out.
    seek(from, step) {
        for (let i = from; i >= 0 && i < this.tracks.length; i += step) {
            if (this.canPlay(i)) return i;
        }
        return -1;
    }

    trackUrl(i) {
        return this.baseUrl + this.tracks[i].file.split('/').map(encodeURIComponent).join('/');
    }

    build() {
        this.root.innerHTML = `
            <div class="ap-art-wrap">
                <img class="ap-art" alt="" ${this.coverImage ? `src="${this.coverImage}"` : ''}>
            </div>
            <div class="ap-status"></div>
            <div class="ap-transport">
                <button class="ap-prev" type="button" aria-label="Previous track">
                    <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                </button>
                <button class="ap-play" type="button" aria-label="Play">
                    <svg class="ap-icon-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    <svg class="ap-icon-pause" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                </button>
                <button class="ap-next" type="button" aria-label="Next track">
                    <svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                </button>
            </div>
            <div class="ap-position">
                <div class="ap-seek"><div class="ap-seek-fill"></div></div>
                <div class="ap-meta">
                    <span class="ap-counter">
                        <span class="ap-counter-index"></span> / <span class="ap-counter-total"></span>
                    </span>
                    <button class="ap-lyrics" type="button" aria-pressed="false"
                            aria-label="Show lyrics" title="Lyrics" hidden>
                        <img src="assets/icons/lyrics.png" alt="">
                    </button>
                </div>
            </div>
            <div class="ap-list-wrap"><ol class="ap-list"></ol></div>
        `;

        this.el = {
            art: this.root.querySelector('.ap-art'),
            artWrap: this.root.querySelector('.ap-art-wrap'),
            status: this.root.querySelector('.ap-status'),
            seek: this.root.querySelector('.ap-seek'),
            fill: this.root.querySelector('.ap-seek-fill'),
            play: this.root.querySelector('.ap-play'),
            iconPlay: this.root.querySelector('.ap-icon-play'),
            iconPause: this.root.querySelector('.ap-icon-pause'),
            prev: this.root.querySelector('.ap-prev'),
            next: this.root.querySelector('.ap-next'),
            listWrap: this.root.querySelector('.ap-list-wrap'),
            list: this.root.querySelector('.ap-list'),
            lyrics: this.root.querySelector('.ap-lyrics'),
            counter: this.root.querySelector('.ap-counter'),
            counterIndex: this.root.querySelector('.ap-counter-index'),
            counterTotal: this.root.querySelector('.ap-counter-total'),
        };

        this.el.counterTotal.textContent = this.tracks.length;
        // Reserve the width of the widest index, so going 9 -> 10 doesn't shift
        // the end of the seek bar.
        this.el.counterIndex.style.minWidth = `${String(this.tracks.length).length}ch`;

        if (this.onLyrics) {
            this.el.lyrics.hidden = false;
            this.el.lyrics.addEventListener('click', () => {
                this.lyricsOpen = !this.lyricsOpen;
                this.el.lyrics.classList.toggle('is-open', this.lyricsOpen);
                this.el.lyrics.setAttribute('aria-pressed', String(this.lyricsOpen));
                this.onLyrics(this.lyricsOpen ? this.index : null);
            });
        }

        if (!this.coverImage) this.el.artWrap.hidden = true;
        this.el.art.onerror = () => { this.el.artWrap.hidden = true; };

        if (this.onArtClick && this.coverImage) {
            this.el.artWrap.classList.add('is-clickable');
            this.el.artWrap.setAttribute('role', 'button');
            this.el.artWrap.setAttribute('tabindex', '0');
            this.el.artWrap.setAttribute('aria-label', 'View cover artwork');
            this.el.artWrap.addEventListener('click', () => this.onArtClick());
            this.el.artWrap.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.onArtClick(); }
            });
        }

        if (!this.playable) {
            this.root.classList.add('ap-unavailable');
            this.el.status.textContent = this.unavailableNote;
            [this.el.play, this.el.prev, this.el.next].forEach(b => { b.disabled = true; });
        }

        // Built as nodes rather than a template string: track names contain
        // apostrophes and parentheses.
        this.tracks.forEach((track, i) => {
            const li = document.createElement('li');
            const num = document.createElement('span');
            num.className = 'ap-num';
            num.textContent = track.num;
            const name = document.createElement('span');
            name.className = 'ap-name';
            name.textContent = this.title(track);
            li.append(num, name);
            const dur = document.createElement('span');
            dur.className = 'ap-dur';
            dur.textContent = this.fmt(track.duration || 0);
            li.appendChild(dur);
            if (this.canPlay(i)) li.addEventListener('click', () => this.playTrack(i));
            else if (this.playable) {
                li.classList.add('is-unavailable');
                li.setAttribute('aria-disabled', 'true');
            }
            this.el.list.appendChild(li);
        });
    }

    onPlay() {
        this.suppressAdvance = false;
        this.setPlaying(true);
        this.loop();
    }

    onPause() {
        this.setPlaying(false);
        this.tick();
    }

    onMeta() { this.tick(); }

    onError() { this.el.status.textContent = 'Playback error'; }

    onEnded() {
        // Scrubbing a paused track to its end also fires this; that is not the
        // record moving on.
        if (this.suppressAdvance) { this.suppressAdvance = false; return; }
        const forward = this.seek(this.index + 1, 1);
        if (forward < 0) this.stop();
        else this.playTrack(forward);
    }

    wire() {
        if (!this.playable) return;

        this.el.play.addEventListener('click', () => this.toggle());
        this.el.prev.addEventListener('click', () => this.prev());
        this.el.next.addEventListener('click', () => this.next());

        const seekFrom = e => {
            const a = this.audio;
            const dur = this.dur();
            if (!a || !dur) return;
            const rect = this.el.seek.getBoundingClientRect();
            const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
            // Only playback advances the record. Scrubbing a paused track to the
            // end parks it there.
            if (a.paused) this.suppressAdvance = true;
            a.currentTime = Math.max(0, Math.min(1, x / rect.width)) * dur;
            this.tick();
        };
        this.el.seek.addEventListener('mousedown', e => { this.seeking = true; seekFrom(e); });
        this.el.seek.addEventListener('touchstart', e => { this.seeking = true; seekFrom(e); }, { passive: true });
        document.addEventListener('mousemove', e => { if (this.seeking) seekFrom(e); });
        document.addEventListener('touchmove', e => { if (this.seeking) seekFrom(e); }, { passive: true });
        document.addEventListener('mouseup', () => { this.seeking = false; });
        document.addEventListener('touchend', () => { this.seeking = false; });
    }

    // Back to the top of the record, idle. Not the same as pausing on track one:
    // nothing is cued and no row is marked.
    stop() {
        if (this.preloadAbort) this.preloadAbort.abort();
        this.stopped = true;
        this.index = 0;
        const a = this.audio;
        if (a) {
            a.pause();
            a.removeAttribute('src');
            a.load();
        }
        this.setPlaying(false);
        this.renderTrack();
    }

    playTrack(i) {
        // Landing on a track that isn't out yet rolls forward to one that is.
        const target = this.canPlay(i) ? i : this.seek(i, 1);
        if (target < 0) return this.stop();

        if (this.preloadAbort) this.preloadAbort.abort();
        // Takes the shared element, which idles whichever release had it.
        const a = AudioPlayer.claim(this);
        this.stopped = false;
        this.index = target;
        a.src = this.trackUrl(target);
        this.renderTrack();
        a.play().catch(() => {});
        this.preloadNext();
    }

    // Warms the browser cache for the next track so the gap at the boundary is
    // network latency free. Abortable so skipping around doesn't pile up requests.
    preloadNext() {
        const next = this.seek(this.index + 1, 1);
        if (next < 0) return;
        this.preloadAbort = new AbortController();
        fetch(this.trackUrl(next), { signal: this.preloadAbort.signal }).catch(() => {});
    }

    toggle() {
        const a = this.audio;
        if (this.stopped || !a || !a.src) return this.playTrack(this.index);
        if (a.paused) a.play().catch(() => {});
        else a.pause();
    }

    prev() {
        // Idle: any transport press starts the record from the top.
        if (this.stopped) return this.playTrack(0);
        const back = this.seek(this.index - 1, -1);
        if (this.audio.currentTime > 3 || back < 0) this.audio.currentTime = 0;
        else this.playTrack(back);
    }

    next() {
        if (this.stopped) return this.playTrack(0);
        const forward = this.seek(this.index + 1, 1);
        if (forward < 0) this.stop();
        else this.playTrack(forward);
    }

    dur() {
        const d = this.audio && this.audio.duration;
        if (isFinite(d) && d > 0) return d;
        return this.tracks[this.index].duration || 0;
    }

    title(track) {
        return track.feature ? `${track.name} (ft. ${track.feature})` : track.name;
    }

    fmt(s) {
        if (!isFinite(s) || s < 0) s = 0;
        return String(Math.floor(s / 60)).padStart(2, '0') + ':' +
               String(Math.floor(s % 60)).padStart(2, '0');
    }

    setPlaying(playing) {
        // `hidden` is an HTMLElement property. These icons are SVG elements, so
        // assigning it sets a JS property that never becomes an attribute and the
        // [hidden] selector never matches. Toggle a class on the button instead.
        this.el.play.classList.toggle('is-playing', playing);
        this.el.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
        if (!playing) cancelAnimationFrame(this.raf);
    }

    renderTrack() {
        if (!this.playable) this.el.status.textContent = this.unavailableNote;
        this.el.counterIndex.textContent = this.index + 1;
        // No lyrics for a track that isn't out. The button is the only way in,
        // so disabling it is the whole gate.
        if (this.el.lyrics && !this.el.lyrics.hidden) {
            this.el.lyrics.disabled = !this.canPlay(this.index);
        }
        [...this.el.list.children].forEach((li, i) => {
            li.classList.toggle('ap-active', !this.stopped && i === this.index);
            // Rows that stopped playing go back to showing just their length.
            if (this.stopped || i !== this.index) {
                li.querySelector('.ap-dur').textContent = this.fmt(this.tracks[i].duration || 0);
            }
        });
        this.revealActive();
        // Keep an open lyrics panel on the track you're actually hearing.
        if (this.lyricsOpen && this.onLyrics) this.onLyrics(this.index);
        this.tick();
    }

    // Scrolls the list, never the page: scrollIntoView would drag the document
    // around when a track changes while the player is off screen.
    revealActive() {
        const row = this.el.list.children[this.index];
        const wrap = this.el.listWrap;
        if (!row || !wrap) return;
        // Measured, not offsetTop: .release-item is positioned, so offsetTop is
        // relative to the whole card and the comparison never fires.
        const top = row.getBoundingClientRect().top
                  - wrap.getBoundingClientRect().top + wrap.scrollTop;
        const bottom = top + row.getBoundingClientRect().height;
        if (top < wrap.scrollTop) wrap.scrollTop = top;
        else if (bottom > wrap.scrollTop + wrap.clientHeight) wrap.scrollTop = bottom - wrap.clientHeight;
    }

    tick() {
        const dur = this.dur();
        const cur = (this.audio && this.audio.currentTime) || 0;
        this.el.fill.style.width = (dur ? Math.min(100, cur / dur * 100) : 0) + '%';

        // The clock lives on the playing row, next to that track's length. With the
        // record stopped there is no playing row.
        const row = this.stopped ? null : this.el.list.children[this.index];
        if (!row) return;
        const cell = row.querySelector('.ap-dur');
        cell.textContent = this.playable
            ? `${this.fmt(cur)} / ${this.fmt(dur)}`
            : this.fmt(dur);
    }

    loop() {
        cancelAnimationFrame(this.raf);
        const step = () => {
            this.tick();
            const a = this.audio;
            if (a && !a.paused) this.raf = requestAnimationFrame(step);
        };
        step();
    }
}
