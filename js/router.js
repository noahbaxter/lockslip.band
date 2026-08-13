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

// `hidden` is only a UA-stylesheet `display: none`, so any author rule that sets
// display on a panel (the plugin page uses flex) silently beats it and the panel
// stays on screen. Panels are hidden by class instead, with the rule living next
// to the router that depends on it.
const PANEL_HIDDEN_CSS = 'main.router-inactive { display: none !important; }';

const Router = {
    // path -> { main, title, bodyClass }
    panels: new Map(),
    current: null,

    // Each panel's one-time boot. Keyed by the section the page mounts into.
    BOOTS: [
        { test: main => main.querySelector('#music'), init: main => window.initHomePanel(main) },
        { test: main => main.querySelector('#press'), init: main => window.initPressPanel(main) },
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
        if (previous) previous.main.classList.add('router-inactive');

        next.main.classList.remove('router-inactive');
        document.title = next.title;
        document.body.className = next.bodyClass;
        this.current = path;

        if (push) history.pushState({}, '', path + (hash || ''));
        if (hash) this.scrollToHash(hash);
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

        main.classList.add('router-inactive');
        document.querySelector('main').parentNode.insertBefore(
            main, document.querySelector('footer') || null);

        this.panels.set(path, {
            main,
            title: doc.title,
            bodyClass: doc.body.className,
        });
        this.boot(main);
    },

    scrollToHash(hash) {
        const target = document.querySelector(hash);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
    },
};

document.addEventListener('DOMContentLoaded', () => {
    HeaderComponent.init({ basePath: '/' });
    Router.init();
});
