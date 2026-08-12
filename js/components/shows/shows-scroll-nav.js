// Shows Scroll Nav - jump arrows, year readout and hover handling for the
// past-shows poster wall.
//
// The wall runs ~9 viewports on mobile and grows with every show added, so the
// arrows in the left gutter jump to its ends. The grid is one unbroken mosaic,
// so the year comes from a single sticky label updated on scroll rather than
// from separators between the rows.
//
// Also owns the measured layout vars the sticky offsets depend on, since the
// header changes height across breakpoints.

const ShowsScrollNav = {
    // Re-resolved on every render; see refresh().
    indicatorBox: null,
    indicator: null,
    detail: null,
    items: [],
    upBtn: null,
    downBtn: null,
    year: null,

    // Posters currently allowed to paint over the year rule, each mapped to its
    // pending lower timer. More than one can be raised at once: slide from one
    // poster to the next and the one you left is still shrinking, so it keeps
    // its raise until that finishes.
    raised: new Map(),

    // Fallback for browsers without scrollend: how long we assume our own
    // smooth scroll runs before considering it finished.
    SETTLE_MS: 600,
    // How long after the last scroll input we treat the user as still
    // scrolling. Nothing auto-scrolls during that window.
    SCROLL_GRACE_MS: 220,

    init() {
        this.measure();

        window.addEventListener('resize', () => {
            this.measure();
            this.requestUpdate();
        });
        window.addEventListener('scroll', () => this.requestUpdate(), { passive: true });

        // Arrows are re-rendered with the section, so delegate off the document
        // instead of rebinding on every render.
        document.addEventListener('click', (event) => {
            const button = event.target.closest('.poster-nav-btn');
            if (button) this.jump(button.dataset.dir);
        });

        // Any real user scroll wins over ours: stop dead wherever we've got to
        // rather than fighting the wheel or snapping back afterwards.
        const userScroll = () => {
            this.lastInputAt = Date.now();
            this.cancelScroll();
        };
        window.addEventListener('wheel', userScroll, { passive: true });
        window.addEventListener('touchmove', userScroll, { passive: true });
        window.addEventListener('keydown', userScroll);
        window.addEventListener('scrollend', () => { this.scrolling = false; });

        // mousemove rather than mouseover, for two reasons. Scrolling drags
        // posters under a stationary cursor and fires pointer events for each
        // one; those carry unchanged coordinates, so the check below ignores
        // them and we never settle against whoever is scrolling. And mouseover
        // fires only on entering an element, so a poster already hovered when a
        // scroll clipped it would stay stuck until you left and came back.
        if (window.matchMedia('(hover: hover)').matches) {
            document.addEventListener('mousemove', (event) => {
                if (event.clientX === this.lastX && event.clientY === this.lastY) return;
                this.lastX = event.clientX;
                this.lastY = event.clientY;

                if (this.hoverPending) return;
                const target = event.target;
                this.hoverPending = true;
                requestAnimationFrame(() => {
                    this.hoverPending = false;
                    const item = target.closest && target.closest('.poster-grid-item');
                    this.setHovered(item);
                    if (item) this.settle(item);
                });
            }, { passive: true });

            // mousemove stops firing once the cursor leaves the window, so
            // without these the readout stays stuck on the last poster.
            document.addEventListener('mouseleave', () => this.setHovered(null));
            window.addEventListener('blur', () => this.setHovered(null));
        }
    },

    userIsScrolling() {
        return Date.now() - (this.lastInputAt || 0) < this.SCROLL_GRACE_MS;
    },

    cancelScroll() {
        if (!this.scrolling) return;
        this.scrolling = false;
        clearTimeout(this.settleTimer);
        // Re-targeting the current position stops an in-flight smooth scroll.
        window.scrollTo({ top: window.scrollY, behavior: 'instant' });
    },

    // Viewport box ignoring transforms: a hovered poster carries the popout, so
    // getBoundingClientRect reports it ~11px higher than it really sits.
    layoutBox(item) {
        let top = 0;
        for (let node = item; node; node = node.offsetParent) top += node.offsetTop;
        top -= window.scrollY;
        return { top, bottom: top + item.offsetHeight };
    },

    // Hovering a poster the chrome is cutting off scrolls it clear.
    settle(item) {
        if (this.userIsScrolling()) return;

        const box = this.layoutBox(item);
        const line = this.offset();
        const clipped = box.top < line - 2 || box.bottom > window.innerHeight + 2;
        if (!clipped) return;

        // Round in whichever direction buries the neighbouring row: a sub-pixel
        // of slack the wrong way leaves a strip of it hoverable, which kicks off
        // another settle. scrollIntoView is no good here either, since html's
        // scroll-padding-top would stack on top of the target and overshoot.
        const target = box.top < line
            ? Math.ceil(box.top + window.scrollY - line)
            : Math.floor(box.bottom + window.scrollY - window.innerHeight);

        this.scrolling = true;
        window.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });

        clearTimeout(this.settleTimer);
        this.settleTimer = setTimeout(() => { this.scrolling = false; }, this.SETTLE_MS);
    },

    measure() {
        const header = document.querySelector('header');
        if (header) {
            const height = header.getBoundingClientRect().height;
            if (height > 0) this.setVar('--header-height', height);
        }

        const item = document.querySelector('.poster-grid-item');
        this.setVar('--poster-row-h', item ? item.getBoundingClientRect().height : 0);
    },

    setVar(name, value) {
        document.documentElement.style.setProperty(name, `${Math.round(value)}px`);
    },

    // Called after every shows render; the view toggle replaces the section.
    refresh() {
        this.indicatorBox = document.querySelector('.poster-year-indicator');
        this.indicator = document.querySelector('.poster-year-label');
        this.detail = document.querySelector('.poster-year-detail');
        this.items = Array.from(document.querySelectorAll('.poster-grid-item'));
        this.upBtn = document.querySelector('.poster-nav-btn[data-dir="up"]');
        this.downBtn = document.querySelector('.poster-nav-btn[data-dir="down"]');
        this.year = null;
        requestAnimationFrame(() => {
            this.measure();
            this.update();
        });
    },

    requestUpdate() {
        if (this.pending) return;
        this.pending = true;
        requestAnimationFrame(() => {
            this.pending = false;
            this.update();
        });
    },

    // The poster just under the sticky label decides the year shown. offset()
    // reads computed style, so resolve it once here and pass it down.
    update() {
        if (!this.indicator || !this.items.length) return;

        const line = this.offset();
        let year = this.items[0].dataset.year;
        for (const item of this.items) {
            if (item.getBoundingClientRect().top > line + 1) break;
            year = item.dataset.year;
        }

        if (year !== this.year) {
            this.year = year;
            this.renderYear();
        }

        this.updateArrows(line);
        this.markOverlap(line);
    },

    setHovered(item) {
        if (item === this.hovered) return;

        const leaving = this.hovered;
        this.hovered = item;
        this.showDetail(item);

        // Hold the one you left for the length of the shrink, so it isn't
        // dropped behind the rule while it is still animating down.
        if (leaving && this.raised.has(leaving)) {
            clearTimeout(this.raised.get(leaving));
            this.raised.set(leaving, setTimeout(() => this.lower(leaving), this.popoutMs()));
        }
        this.markOverlap();
    },

    // The hovered poster's date and city, read out beside the year rather than
    // over the art. The year comes from the label, which follows the hovered
    // poster while there is one so the two can't disagree on a boundary row.
    showDetail(item) {
        if (!this.detail) return;
        if (item) {
            this.detail.innerHTML = `<b>${item.dataset.date}</b> &middot; ${item.dataset.place}`;
        }
        this.detail.classList.toggle('is-shown', !!item);
        this.renderYear();
    },

    renderYear() {
        if (!this.indicator) return;
        this.indicator.textContent = this.hovered ? this.hovered.dataset.year : this.year;
    },

    popoutMs() {
        const value = getComputedStyle(document.documentElement)
            .getPropertyValue('--poster-popout-time').trim();
        return (parseFloat(value) || 0.22) * (value.endsWith('ms') ? 1 : 1000);
    },

    raise(item) {
        clearTimeout(this.raised.get(item));
        this.raised.set(item, null);
        item.classList.add('can-overlap');
    },

    lower(item) {
        clearTimeout(this.raised.get(item));
        this.raised.delete(item);
        item.classList.remove('can-overlap');
    },

    // A poster may paint over the year rule only while it is clear of the line.
    // Runs on hover AND on every scroll frame, because a raise outlives the
    // cursor: without the scroll pass, scrolling during a shrink would carry a
    // still-raised poster up over the red line.
    markOverlap(line = this.offset()) {
        const clear = (item) => this.layoutBox(item).top >= line - 1;

        for (const item of [...this.raised.keys()]) {
            // Immediate, not on the shrink timer: it is crossing the line now.
            if (!item.isConnected || !clear(item)) this.lower(item);
        }
        if (this.hovered && clear(this.hovered)) this.raise(this.hovered);
    },

    // An arrow retires as soon as any part of the row it points at is on
    // screen, since you can already see where it would take you.
    updateArrows(line) {
        const first = this.items[0].getBoundingClientRect();
        const last = this.items[this.items.length - 1].getBoundingClientRect();

        this.setArrow(this.upBtn, first.bottom > line);
        this.setArrow(this.downBtn,
            first.bottom > window.innerHeight || last.top < window.innerHeight || !this.downIsParked());
    },

    // Down is only ever shown sitting still at its resting spot: not while the
    // wall is scrolling into view with sticky still holding it against the top
    // of its box, and not on a window too short to seat it clear of the rule.
    downIsParked() {
        if (!this.downBtn) return false;

        const rect = this.downBtn.getBoundingClientRect();
        const inset = parseFloat(getComputedStyle(this.downBtn).bottom) || 0;
        const resting = window.innerHeight - inset - rect.height;

        return rect.top <= resting + 1 && rect.bottom <= window.innerHeight;
    },

    setArrow(button, hidden) {
        if (button) button.classList.toggle('is-hidden', hidden);
    },

    // First readable pixel below the pinned chrome. Read off the year rule's own
    // resolved sticky position rather than re-adding the parts, so this can't
    // drift from --poster-content-top in variables.css.
    offset() {
        if (!this.indicatorBox) return 0;
        return parseFloat(getComputedStyle(this.indicatorBox).top)
            + this.indicatorBox.getBoundingClientRect().height;
    },

    // Both ends land a row flush against the line. Up aims at the first row
    // rather than the top of the section, which would put the PAST heading and
    // the view toggle on screen instead of posters.
    jump(direction) {
        if (!this.items.length) return;

        const row = direction === 'up' ? this.items[0] : this.items[this.items.length - 1];
        const target = this.layoutBox(row).top + window.scrollY - this.offset();

        window.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    }
};

document.addEventListener('DOMContentLoaded', () => ShowsScrollNav.init());
