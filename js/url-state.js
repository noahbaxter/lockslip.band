// The address bar as somewhere you can get back to.
//
// It is all in the hash. A section is a position inside one document, and GitHub
// Pages will not serve a path it has no file for, so a bare /music would need
// either a 404 bounce or a copy of this page committed at every route. The real
// pages (/press/, /plugin/) stay real paths and belong to the router.
//
//   #music                    a section
//   #music/the-conversation   the section, and the record open in it
//   #zen                      the full screen player, on whatever is cued
//   #zen/the-conversation     the full screen player, on that record
//
// A record, and where you are looking at it. Not a track: which one is playing
// is playback state, and pinning it in the URL means a link that means something
// different the moment the record moves on.
//
// Reading and writing both come through here so the two cannot drift. Sections
// and zen push, since they are places worth backing out of; everything else
// refines the current URL in place rather than filling history with tab flips.

const UrlState = {
    // Read off the page: a section is linkable because it exists. Scoped to main
    // so a modal or a control's id can't be linked to as if it were a place.
    isSection(id) {
        return Boolean(id && document.querySelector(`main section[id="${CSS.escape(id)}"]`));
    },

    // zen is a mode of a record rather than a place of its own, so it reads as the
    // last segment: #music/the-conversation/zen. #zen and #zen/<record> are the
    // same thing said the short way, which is what a page with no music section
    // to sit under has to use.
    parse(hash = location.hash) {
        let parts = hash.replace(/^#\/?/, '').split('/')
            .filter(Boolean).map(decodeURIComponent);

        const zen = parts[0] === 'zen' || parts[parts.length - 1] === 'zen';
        if (parts[0] === 'zen') parts = parts.slice(1);
        else if (zen) parts = parts.slice(0, -1);

        const [head, ...rest] = parts;
        if (this.isSection(head)) return { section: head, release: rest[0] || '', zen };
        if (zen) return { zen: true, release: head || '' };
        return {};
    },

    // True while the page is being brought in line with the URL. Everything that
    // writes checks it, so applying a URL can drive the same code paths a click
    // does without those paths writing the URL back.
    applying: false,

    openRelease() {
        const tab = document.querySelector('.release-tab.is-active');
        return tab ? tab.dataset.target : '';
    },

    write(hash, push) {
        if (hash === location.hash) return;
        history[push ? 'pushState' : 'replaceState'](
            {}, '', hash || location.pathname + location.search);
    },

    // A section click carries the open record with it, so the URL describes the
    // whole view rather than only the part you clicked.
    section(id) {
        if (this.applying) return;
        const release = id === 'music' ? this.openRelease() : '';
        this.write('#' + id + (release ? '/' + release : ''), true);
    },

    release(id) {
        if (this.applying) return;
        // Not while zen is up: the record behind it is not what the URL is about.
        if (this.parse().zen) return;
        this.write('#music/' + id, false);
    },

    zen(on) {
        if (this.applying) return;

        if (!on) {
            // Backing out rather than pushing again, so leaving zen doesn't leave
            // a dead entry you have to press back through twice. A zen URL opened
            // cold has nothing behind it, so that one is replaced instead.
            if (this.zenPushed) { this.zenPushed = false; return history.back(); }
            const open = this.openRelease();
            return this.write(open ? '#music/' + open : '', false);
        }

        this.zenPushed = true;
        this.write(this.zenHash(), true);
    },

    // Under the record on a page that has one, on its own where there is no
    // music section to sit under, which is how the press page addresses it.
    zenHash(id) {
        const owner = NowPlaying.owner();
        const rec = id || (owner ? owner.id : '');
        if (rec && this.isSection('music')) return `#music/${rec}/zen`;
        return '#zen' + (rec ? '/' + rec : '');
    },

    // Zen can change record under you, from its own picker, and the URL follows.
    // Called only when the record actually changes.
    zenRecord(id) {
        if (this.applying || !this.parse().zen) return;
        this.write(this.zenHash(id), false);
    },

    // The components are declared with const, which is a global binding but not a
    // property of window, so they are reached by name and tested with typeof.
    // The press and plugin pages load a subset of them, hence the guards at all.
    apply(state, behavior = 'smooth') {
        this.applying = true;
        try {
            if (state.release && typeof ReleasesComponent !== 'undefined' && ReleasesComponent.openRelease) {
                ReleasesComponent.openRelease(state.release);
            }

            if (state.zen) this.enterZen(state);
            else if (typeof NowPlaying !== 'undefined' && NowPlaying.zen && !NowPlaying.zen.hidden) NowPlaying.closeZen();

            if (state.section) this.scrollTo(state.section, behavior);
        } finally {
            this.applying = false;
        }
    },

    // Cueing rather than playing: a browser will refuse to start audio nobody
    // asked for, which leaves the record loaded and paused. That is the right
    // landing anyway, since the URL says where to be, not to start.
    enterZen(state) {
        if (typeof NowPlaying === 'undefined' || typeof AudioPlayer === 'undefined') return;

        const inst = state.release && AudioPlayer.instances.find(i => i.id === state.release);
        // Already on this record, wherever it has got to: leave it there. Only a
        // record that isn't up yet gets cued, from its first playable track.
        if (inst && (!inst.owns() || inst.stopped)) {
            const first = inst.seek(0, 1);
            if (first >= 0) inst.playTrack(first);
        }

        if (!NowPlaying.owner()) {
            const first = AudioPlayer.instances.find(i => i.playable);
            if (first) first.playTrack(first.seek(0, 1));
        }

        NowPlaying.openZen();

        // Say what you actually landed on. A URL naming a record that has been
        // renamed or pulled lands on whatever is playable, and leaving the old
        // name in the address bar would be the page lying about itself.
        if (NowPlaying.owner()) this.write(this.zenHash(), false);
    },

    scrollTo(id, behavior) {
        const target = document.getElementById(id);
        if (!target) return;

        const header = document.querySelector('header');
        const top = target.getBoundingClientRect().top + window.scrollY
                  - (header ? header.offsetHeight : 0) - 20;
        window.scrollTo({ top, behavior });
    },

    init() {
        if (this.started) return;
        this.started = true;

        // hashchange, not popstate: it covers the back button and someone typing
        // in the address bar both, and the router's popstate handler leaves
        // same page moves alone.
        window.addEventListener('hashchange', () => {
            if (!this.applying) this.apply(this.parse());
        });

        const state = this.parse();
        if (state.section || state.zen) this.apply(state, 'instant');
    },
};
