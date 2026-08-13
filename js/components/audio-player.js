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

    register(id, data) {
        this.pending[id] = data;
    },

    mount(id) {
        return `<div class="audio-player" data-player="${id}"></div>`;
    },

    initAll() {
        document.querySelectorAll('.audio-player[data-player]').forEach(el => {
            const data = this.pending[el.dataset.player];
            if (data && !el.dataset.ready) new PlayerInstance(el, data);
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

        if (!this.tracks.length) return;

        // A release can list its tracks before the audio exists, the way Bandcamp
        // shows an upcoming record. No baseUrl or no per-track file means the
        // tracklist renders but nothing plays.
        this.playable = Boolean(this.baseUrl) && this.tracks.every(t => t.file);

        if (this.playable) {
            this.audio = new Audio();
            this.audio.preload = 'auto';
        }

        root.dataset.ready = '1';
        this.build();
        this.wire();
        this.renderTrack();
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
                <span class="ap-counter"></span>
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
            counter: this.root.querySelector('.ap-counter'),
        };

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
            if (this.playable) li.addEventListener('click', () => this.playTrack(i));
            this.el.list.appendChild(li);
        });
    }

    wire() {
        if (!this.playable) return;

        const a = this.audio;

        a.addEventListener('play', () => { this.setPlaying(true); this.loop(); });
        a.addEventListener('pause', () => { this.setPlaying(false); this.tick(); });
        // Deliberately no 'waiting'/'canplay' status. A loading line that comes and
        // goes reflows the whole player on every track change.
        a.addEventListener('loadedmetadata', () => this.tick());
        a.addEventListener('error', () => { this.el.status.textContent = 'Playback error'; });

        a.addEventListener('ended', () => {
            if (this.index < this.tracks.length - 1) {
                this.playTrack(this.index + 1);
            } else {
                this.index = 0;
                a.removeAttribute('src');
                a.load();
                this.renderTrack();
            }
        });

        this.el.play.addEventListener('click', () => this.toggle());
        this.el.prev.addEventListener('click', () => this.prev());
        this.el.next.addEventListener('click', () => this.next());

        const seekFrom = e => {
            const rect = this.el.seek.getBoundingClientRect();
            const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
            const dur = this.dur();
            if (dur) this.audio.currentTime = Math.max(0, Math.min(1, x / rect.width)) * dur;
            this.tick();
        };
        this.el.seek.addEventListener('mousedown', e => { this.seeking = true; seekFrom(e); });
        this.el.seek.addEventListener('touchstart', e => { this.seeking = true; seekFrom(e); }, { passive: true });
        document.addEventListener('mousemove', e => { if (this.seeking) seekFrom(e); });
        document.addEventListener('touchmove', e => { if (this.seeking) seekFrom(e); }, { passive: true });
        document.addEventListener('mouseup', () => { this.seeking = false; });
        document.addEventListener('touchend', () => { this.seeking = false; });
    }

    playTrack(i) {
        if (this.preloadAbort) this.preloadAbort.abort();
        this.index = i;
        this.audio.src = this.trackUrl(i);
        this.renderTrack();
        this.audio.play().catch(() => {});
        this.preloadNext();
    }

    // Warms the browser cache for the next track so the gap at the boundary is
    // network latency free. Abortable so skipping around doesn't pile up requests.
    preloadNext() {
        const next = this.index + 1;
        if (next >= this.tracks.length) return;
        this.preloadAbort = new AbortController();
        fetch(this.trackUrl(next), { signal: this.preloadAbort.signal }).catch(() => {});
    }

    toggle() {
        if (!this.audio.src) return this.playTrack(this.index);
        if (this.audio.paused) this.audio.play().catch(() => {});
        else this.audio.pause();
    }

    prev() {
        if (this.audio.currentTime > 3 || this.index === 0) this.audio.currentTime = 0;
        else this.playTrack(this.index - 1);
    }

    next() {
        if (this.index < this.tracks.length - 1) this.playTrack(this.index + 1);
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
        this.el.counter.textContent = `${this.index + 1} / ${this.tracks.length}`;
        [...this.el.list.children].forEach((li, i) => {
            li.classList.toggle('ap-active', i === this.index);
            // Rows that stopped playing go back to showing just their length.
            if (i !== this.index) {
                li.querySelector('.ap-dur').textContent = this.fmt(this.tracks[i].duration || 0);
            }
        });
        this.tick();
    }

    tick() {
        const dur = this.dur();
        const cur = (this.audio && this.audio.currentTime) || 0;
        this.el.fill.style.width = (dur ? Math.min(100, cur / dur * 100) : 0) + '%';

        // The clock lives on the playing row, next to that track's length.
        const row = this.el.list.children[this.index];
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
            if (!this.audio.paused) this.raf = requestAnimationFrame(step);
        };
        step();
    }
}
