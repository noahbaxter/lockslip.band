// Sends what is being listened to, and for how long, to the worker in
// analytics/. Nothing is stored on the device and no id is generated here: the
// worker derives one from the request and forgets it again (see MEMORY_DAYS).
//
// sendBeacon rather than fetch, as text/plain: it survives the page being
// closed mid-track, and a plain body is a simple request, so there is no
// preflight and no CORS round trip before every beat.

const Analytics = {
    ENDPOINT: 'https://stats.lockslip.band/',

    // A beat is the resolution of "how long did they listen". Long enough to be
    // a handful of writes per song, short enough that closing the tab loses
    // little.
    BEAT_MS: 15000,

    send(payload) {
        if (!this.ENDPOINT) return;
        try {
            navigator.sendBeacon(this.ENDPOINT, new Blob([JSON.stringify(payload)], { type: 'text/plain' }));
        } catch (e) {
            // Stats are never worth an error on the page.
        }
    },

    // What is playing right now, or null. Reads the same owner the bar reads, so
    // it cannot disagree with what the listener sees.
    playing() {
        const owner = typeof AudioPlayer !== 'undefined' && AudioPlayer.owner;
        if (!owner || owner.stopped || !AudioPlayer.el || AudioPlayer.el.paused) return null;

        const track = owner.tracks[owner.index];
        if (!track) return null;
        // The number is what the row is keyed by; the name is only a label. The
        // length rides along so time listened can be read as a share of the
        // track rather than a bare count of minutes.
        return {
            r: owner.id,
            n: track.num || owner.index + 1,
            k: track.name || '',
            d: Math.round(track.duration || 0) || undefined,
        };
    },

    // Set by the press kit, which is the one page where who is listening is a
    // question worth asking. Empty everywhere else.
    ref: '',

    // Host only. The full URL is a page someone was reading, which is more than
    // is needed to tell Instagram apart from a search.
    source() {
        try {
            const host = document.referrer && new URL(document.referrer).host;
            return host && host !== location.host ? host : undefined;
        } catch (e) {
            return undefined;
        }
    },

    beat() {
        const now = this.playing();
        if (!now) { this.last = null; return; }

        // A track change inside one beat is credited as a start on the new track
        // rather than silently adding the time to the old one.
        const started = !this.last || this.last.r !== now.r || this.last.n !== now.n;
        this.send({
            t: 'l', r: now.r, n: now.n, k: now.k, d: now.d,
            s: this.BEAT_MS / 1000, st: started ? 1 : 0, p: this.ref || undefined,
        });
        this.last = now;
    },

    init() {
        if (this.started) return;
        this.started = true;

        // A press open is its own event: one row per open rather than one per
        // person per day, because coming back to it a week later is the signal.
        if (this.ref) this.send({ t: 'p', p: this.ref });
        else this.send({ t: 'v', s: this.source() });

        setInterval(() => this.beat(), this.BEAT_MS);

        // The tail of the last beat, so a two minute listen does not round down
        // to one and a half.
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') this.beat();
        });
    },
};

document.addEventListener('DOMContentLoaded', () => Analytics.init());
