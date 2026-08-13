// Client-side router.
//
// The site is three real pages (/, /press/, /plugin/) that each work on a direct
// hit. This keeps them feeling like one document so playback survives moving
// between them: a normal navigation tears down the JS heap, and the shared
// <audio> element goes with it.
//
// Panels are cached, not rebuilt. Leaving the home page hides its <main> rather
// than destroying it, so when you come back the player's DOM is the same DOM
// that has been driving the audio the whole time. Rebuilding it would mean
// re-deriving "which track is playing, how far in" from an element that never
// stopped, which is a resync bug waiting to happen.

// Inactive panels move off screen rather than being display:none'd.
//
// Two reasons, both learned the hard way. `hidden` alone is only a UA-stylesheet
// `display: none`, so an author rule that sets display (the plugin page uses
// flex) silently beats it and the panel stays visible. And `display: none` tears
// down the rendering context of anything live inside a panel: it stops the
// guillotine plugin demo dead even though its DOM is untouched.
//
// Off screen keeps them laid out and painting, which is the whole point of
// caching panels in the first place.
const PANEL_HIDDEN_CSS = `
main.router-inactive {
    /* Fixed, not absolute: an absolutely positioned panel still counts toward the
       document's scrollable height, so the tall home panel left a page of dead
       space under the short ones. Fixed positioning is out of that calculation
       while still laying the panel out, which is what keeps its contents alive. */
    position: fixed !important;
    top: 0 !important;
    left: -200vw !important;
    width: 100% !important;
    pointer-events: none !important;
}`;

const Router = {
    // path -> { main, title, bodyClass }
    panels: new Map(),
    current: null,

    // Each panel's one-time boot. Keyed by the section the page mounts into.
    BOOTS: [
        { test: main => main.querySelector('#music'), init: main => window.initHomePanel(main) },
        { test: main => main.querySelector('#press'), init: main => window.initPressPanel(main) },
        { test: main => main.querySelector('.plugin-showcase'), init: main => window.initPluginPanel(main) },
    ],

    normalise(url) {
        const path = new URL(url, location.href).pathname;
        return path.endsWith('/') || path.endsWith('.html') ? path : path + '/';
    },

    init() {
        const main = document.querySelector('main');
        if (!main) return;

        const style = document.createElement('style');
        style.textContent = PANEL_HIDDEN_CSS;
        document.head.appendChild(style);

        this.current = this.normalise(location.pathname);
        this.panels.set(this.current, {
            main,
            title: document.title,
            bodyClass: document.body.className,
        });
        this.boot(main);

        document.addEventListener('click', e => this.onClick(e));
        window.addEventListener('popstate', () => this.show(this.normalise(location.pathname), false));
    },

    boot(main) {
        const match = this.BOOTS.find(b => b.test(main));
        if (match) match.init(main);
    },

    // Off-screen panels are still in the accessibility tree and still focusable,
    // so they have to be marked as well as moved.
    setActive(main, active) {
        main.classList.toggle('router-inactive', !active);
        if (active) main.removeAttribute('aria-hidden');
        else main.setAttribute('aria-hidden', 'true');
        main.inert = !active;
    },

    onClick(e) {
        // Leave modified clicks alone: they mean open in a tab or download.
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        const link = e.target.closest('a');
        if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

        const url = new URL(href, location.href);
        if (url.origin !== location.origin) return;

        const path = this.normalise(url.pathname);
        if (!this.routable(path)) return;

        e.preventDefault();
        if (path === this.current) {
            if (url.hash) this.scrollToHash(url.hash);
            return;
        }
        this.go(url);
    },

    // Only the three pages that share this shell. Anything else, including the
    // plugin demo iframe and the hidden octopus page, navigates normally.
    routable(path) {
        return ['/', '/press/', '/plugin/'].includes(path);
    },

    async go(url) {
        const path = this.normalise(url.pathname);
        try {
            await this.show(path, true, url.hash);
        } catch (err) {
            // Any failure falls back to a real navigation rather than stranding
            // the visitor on a half-swapped page.
            console.error('Router failed, falling back:', err);
            location.href = url.href;
        }
    },

    async show(path, push, hash) {
        if (!this.panels.has(path)) await this.build(path);

        const next = this.panels.get(path);
        if (!next) { location.href = path; return; }

        const previous = this.panels.get(this.current);
        if (previous) this.setActive(previous.main, false);

        this.setActive(next.main, true);
        document.title = next.title;
        document.body.className = next.bodyClass;
        this.current = path;

        if (push) history.pushState({}, '', path + (hash || ''));
        if (hash) this.scrollToHash(hash, 'instant');
        else window.scrollTo(0, 0);

        if (window.ImageLoader) ImageLoader.refresh(next.main);
        if (window.ReleasesComponent) ReleasesComponent.fitDescriptions();
    },

    async build(path) {
        const res = await fetch(path, { headers: { 'X-Requested-With': 'router' } });
        if (!res.ok) throw new Error(`${res.status} for ${path}`);

        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        const main = doc.querySelector('main');
        if (!main) throw new Error(`no <main> in ${path}`);

        this.setActive(main, false);
        document.querySelector('main').parentNode.insertBefore(
            main, document.querySelector('footer') || null);

        this.panels.set(path, {
            main,
            title: doc.title,
            bodyClass: doc.body.className,
        });
        this.boot(main);
    },

    // Smooth only when already on the page: gliding to a section you can see is
    // the point. Coming from another page there is nothing to glide past, and
    // animating from the top of a freshly shown panel just adds a delay.
    scrollToHash(hash, behavior = 'smooth') {
        const target = document.querySelector(hash);
        if (!target) return;

        // Same offset UIHelpers.setupSmoothScrolling uses, or the section lands
        // under the fixed header.
        const header = document.querySelector('header');
        const top = target.getBoundingClientRect().top + window.scrollY
                  - (header ? header.offsetHeight : 0) - 20;
        window.scrollTo({ top, behavior });
    },
};

document.addEventListener('DOMContentLoaded', async () => {
    HeaderComponent.init({ basePath: '/' });

    // Header and footer are the shell: built once, shared by every panel.
    try {
        const config = await fetch('content/site-config.json').then(r => r.json());
        FooterComponent.init(config);
    } catch (e) {
        console.error('Footer config failed to load:', e);
    }

    Router.init();
});
