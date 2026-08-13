// The address bar as somewhere you can get back to.
//
// Where you are is the path; zen is a mode on top of it, so it is the hash:
//
//   /music                          a section
//   /music/the-conversation         the section, and the record open in it
//   /music/the-conversation#zen     that record, full screen
//   /shows /store /news /extras     the other sections
//   /press/ /plugin/                real pages, the router's business
//
// Paths rather than a hash because a hash never reaches a server: it cannot be
// redirected, and a link to it can never carry its own preview image. These are
// real URLs that keep working if the site stops being one page. Deploy writes a
// copy of the home page at each of them, see build_routes.py.
//
// A record, and where you are looking at it. Not a track: which one is playing
// is playback state, and pinning it in the URL means a link that means something
// different the moment the record moves on.
//
// A page with no music section, like the press player, has no path to hang zen
// off, so there #zen and #zen/<record> stand on their own.

const UrlState = {
    // Read off the page: a section is linkable because it exists. Scoped to main
    // so a modal or a control's id can't be linked to as if it were a place.
    isSection(id) {
        return Boolean(id && document.querySelector(`main section[id="${CSS.escape(id)}"]`));
    },

    parse(url = location) {
        const parts = (url.pathname || '').split('/').filter(Boolean).map(decodeURIComponent);
        const hash = (url.hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
        const zen = hash[0] === 'zen';

        if (this.isSection(parts[0])) {
            return { section: parts[0], release: parts[1] || '', zen };
        }
        // No section in the path: the short form, which is all a standalone page
        // has. #zen or #zen/<record>.
        if (zen) return { zen: true, release: hash[1] || '' };
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

    here() {
        return location.pathname + location.search + location.hash;
    },

    write(url, push) {
        if (url === this.here()) return;
        history[push ? 'pushState' : 'replaceState']({}, '', url);
    },

    // A section click carries the open record with it, so the URL describes the
    // whole view rather than only the part you clicked.
    section(id) {
        if (this.applying) return;
        const release = id === 'music' ? this.openRelease() : '';
        this.write('/' + id + (release ? '/' + release : ''), true);
    },

    release(id) {
        if (this.applying) return;
        // Not while zen is up: the record behind it is not what the URL is about.
        if (this.parse().zen) return;
        this.write('/music/' + id, false);
    },

    zen(on) {
        if (this.applying) return;

        if (!on) {
            // Backing out rather than pushing again, so leaving zen doesn't leave
            // a dead entry you have to press back through twice. A zen URL opened
            // cold has nothing behind it, so that one is replaced instead.
            if (this.zenPushed) { this.zenPushed = false; return history.back(); }
            return this.write(this.placeUrl(), false);
        }

        this.zenPushed = true;
        this.write(this.zenUrl(), true);
    },

    // The record's own URL, with no mode on it.
    placeUrl(id) {
        const rec = id || this.openRelease();
        if (this.isSection('music')) return rec ? '/music/' + rec : '/music';
        return location.pathname + location.search;
    },

    // Zen hangs off the record's path where there is one, and stands alone where
    // there isn't, which is how the press player addresses it.
    zenUrl(id) {
        const owner = typeof NowPlaying !== 'undefined' && NowPlaying.owner();
        const rec = id || (owner ? owner.id : '');

        if (this.isSection('music')) return this.placeUrl(rec) + '#zen';
        return location.pathname + location.search + '#zen' + (rec ? '/' + rec : '');
    },

    // Zen can change record under you, from its own picker, and the URL follows.
    // Called only when the record actually changes.
    zenRecord(id) {
        if (this.applying || !this.parse().zen) return;
        this.write(this.zenUrl(id), false);
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

        const wanted = state.release || this.openRelease();
        const inst = wanted && AudioPlayer.instances.find(i => i.id === wanted);
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
        if (NowPlaying.owner()) this.write(this.zenUrl(), false);
    },

    scrollTo(id, behavior) {
        const target = document.getElementById(id);
        if (!target) return;

        const header = document.querySelector('header');
        const top = target.getBoundingClientRect().top + window.scrollY
                  - (header ? header.offsetHeight : 0) - 20;
        window.scrollTo({ top, behavior });
    },

    // Old hash links, from before these were paths. Translated once on arrival so
    // anything already shared keeps working, and the address bar ends up saying
    // the current thing.
    migrateHash() {
        const legacy = location.hash.match(/^#\/?(news|music|shows|store|extras)(?:\/([^/]+))?(?:\/(zen))?$/);
        if (!legacy) return false;

        const [, section, release, zen] = legacy;
        const path = '/' + section + (release ? '/' + release : '');
        history.replaceState({}, '', path + (zen ? '#zen' : ''));
        return true;
    },

    init() {
        if (this.started) return;
        this.started = true;
        this.migrateHash();

        // Both, because zen lives in the hash and the place lives in the path.
        window.addEventListener('hashchange', () => {
            if (!this.applying) this.apply(this.parse());
        });
        window.addEventListener('popstate', () => {
            if (!this.applying) this.apply(this.parse());
        });

        const state = this.parse();
        if (state.section || state.zen) this.apply(state, 'instant');
    },
};
