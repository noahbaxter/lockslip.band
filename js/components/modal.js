// Generic Modal Component - Works for posters, photos, and other gallery items
class Modal {
    constructor(config) {
        this.config = config; // { modalId, variant, renderInfo }
        this.currentIndex = 0;
        this.data = [];
        this.modal = null;
        this.touchStartX = null;
        this.touchStartY = null;
        this.setupKeyboardListeners();
    }

    setData(data) {
        this.data = data;
        window[this.config.modalId + '_data'] = data;
    }

    open(index) {
        console.log(`Opening ${this.config.modalId} for index:`, index);

        if (!this.data || this.data.length === 0) {
            console.error(`No data available for ${this.config.modalId}`);
            return;
        }

        this.currentIndex = index;
        this.createModal();
        this.updateContent();
        // Details up front. A caption you have to know to ask for is one nobody
        // reads; a tap on the picture puts it away when it is in the way.
        this.toggleDetail(true);
        this.show();
    }

    createModal() {
        if (this.modal) return;

        this.modal = document.createElement('div');
        this.modal.id = this.config.modalId;
        // One family of classes for every lightbox; the variant is a modifier
        // for the handful of rules that genuinely differ (see modal.css).
        this.modal.className = `modal modal-${this.config.variant || 'photo'}`;
        this.modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <button class="modal-close" onclick="${this.config.modalId}.close()">&times;</button>
                <button class="modal-nav prev" onclick="${this.config.modalId}.navigate(-1)">&larr;</button>
                <button class="modal-nav next" onclick="${this.config.modalId}.navigate(1)">&rarr;</button>
                <img class="modal-image" src="" alt="Item">
                <div class="modal-info"></div>
            </div>
        `;
        document.body.appendChild(this.modal);
        this.setupOverlayListener();
        this.setupTouchListeners();

        // A picture has no height until it has loaded, and the frame is drawn
        // around what is on screen.
        this.modal.querySelector('.modal-image').addEventListener('load', () => this.alignFrame());
        window.addEventListener('resize', () => this.alignFrame());
    }

    setupOverlayListener() {
        if (!this.modal) return;
        const overlay = this.modal.querySelector('.modal-overlay');
        const content = this.modal.querySelector('.modal-content');
        const image = this.modal.querySelector('.modal-image');
        const info = this.modal.querySelector('.modal-info');
        const navButtons = this.modal.querySelectorAll('.modal-nav, .modal-close');

        // Close when clicking on overlay or content
        overlay.addEventListener('click', () => this.close());
        content.addEventListener('click', () => this.close());

        // Prevent close when clicking on image, info, or nav buttons
        image.addEventListener('click', (e) => {
            e.stopPropagation();
            // On a phone the image is the whole screen, so there is nothing
            // beside it to put the caption in: it sits over the bottom of the
            // picture and a tap puts it away. The close button is the way out
            // there, which is why it is the one control always on screen.
            if (Modal.isPhone()) this.toggleDetail();
        });
        info.addEventListener('click', (e) => e.stopPropagation());
        navButtons.forEach(btn => btn.addEventListener('click', (e) => e.stopPropagation()));
    }

    // Matches the phone breakpoint in modal.css. One number, named in both
    // places, rather than a second breakpoint that can drift from the first.
    static isPhone() {
        return window.matchMedia('(max-width: 48rem)').matches;
    }

    // The controls make a frame around the content: an arrow down each side, the
    // close at its top right corner. The frame is drawn for the whole set, not
    // for the item on screen, so it does not shuffle about as you page through
    // pictures of different shapes. That means the tallest item in the set: high
    // enough to clear that one, and every shorter one hangs below it.
    //
    // Only the close needs this. The arrows are centred, which is the same line
    // whatever the picture is doing.
    alignFrame() {
        if (!this.modal) return;
        const close = this.modal.querySelector('.modal-close');
        const image = this.modal.querySelector('.modal-image');
        if (!close || !image) return;

        if (Modal.isPhone()) {
            close.style.removeProperty('top');
            return;
        }

        // The variable is authored in rem, and a computed custom property comes
        // back as the text that was written, so parseFloat alone reads "2rem" as
        // two pixels.
        const raw = getComputedStyle(this.modal).getPropertyValue('--modal-space').trim();
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        const gap = raw.endsWith('rem') ? parseFloat(raw) * rem : parseFloat(raw) || 32;

        // The cell the picture is fitted into, not the picture: its own size is
        // whatever this one item came out at, which is exactly what must not
        // decide where the frame sits.
        const area = image.parentElement.getBoundingClientRect();
        const info = this.modal.querySelector('.modal-info');
        const panel = info && getComputedStyle(info).display !== 'none'
            ? info.getBoundingClientRect() : null;
        const beside = panel && panel.left >= area.left + area.width / 2;

        const room = {
            w: area.width - (beside ? panel.width + gap : 0),
            h: area.height - (panel && !beside ? panel.height + gap : 0),
        };

        // What the tallest picture in the set comes out at in this window.
        let tallest = 0;
        for (const size of this.naturalSizes()) {
            const scale = Math.min(room.w / size.w, room.h / size.h, 1);
            tallest = Math.max(tallest, size.h * scale);
        }
        if (!tallest) return;

        const top = area.top + (room.h - tallest) / 2;
        close.style.top = `${Math.max(24, top - gap - close.getBoundingClientRect().height)}px`;
    }

    // Natural sizes for the whole set, measured once. The pictures are already on
    // the page that opened this, so these come from cache rather than the network.
    // Anything not decoded yet is skipped and folded in on a later pass.
    naturalSizes() {
        if (!this.sizes) this.sizes = new Map();

        for (const item of this.data) {
            const src = item.poster || item.image;
            if (!src || this.sizes.has(src)) continue;

            const probe = new Image();
            probe.src = src;
            if (probe.complete && probe.naturalHeight) {
                this.sizes.set(src, { w: probe.naturalWidth, h: probe.naturalHeight });
            } else {
                probe.addEventListener('load', () => {
                    this.sizes.set(src, { w: probe.naturalWidth, h: probe.naturalHeight });
                    this.alignFrame();
                }, { once: true });
            }
        }

        return this.sizes.values();
    }

    // In the details rather than floating over the picture. Only the press kit
    // and the live shots offer one, and on those it belongs with the credit it
    // is attached to rather than as a button loose on the artwork. Appended
    // after renderInfo, which owns that innerHTML.
    addDownload(infoEl, item) {
        if (!this.config.getDownload) return;
        const url = this.config.getDownload(item);
        if (!url) return;

        const link = document.createElement('a');
        link.className = 'modal-download';
        link.href = url;
        link.download = '';
        link.title = 'Download photo';
        link.innerHTML = `${DOWNLOAD_ICON_SVG}<span>Download</span>`;
        link.addEventListener('click', e => e.stopPropagation());
        infoEl.appendChild(link);
    }

    toggleDetail(force) {
        if (!this.modal) return;
        const open = force !== undefined ? force : !this.modal.classList.contains('is-detail-open');
        this.modal.classList.toggle('is-detail-open', open && this.modal.classList.contains('has-info'));
    }

    updateContent() {
        console.log(`Updating ${this.config.modalId} content for index:`, this.currentIndex);

        if (!this.modal) {
            console.error('Modal not found');
            return;
        }

        const item = this.data[this.currentIndex];

        if (!item) {
            console.error(`No item found at index: ${this.currentIndex}`);
            return;
        }

        console.log('Item data:', item);
        const imageEl = this.modal.querySelector('.modal-image');
        const infoEl = this.modal.querySelector('.modal-info');
        const counterEl = this.modal.querySelector('.modal-counter');

        // Update image
        if (imageEl) {
            imageEl.src = item.poster || item.image;
            imageEl.alt = this.config.getAlt ? this.config.getAlt(item) : 'Item';
        }

        // Update info using config renderer. An item with nothing to say gets no
        // panel and no gap held open for one.
        if (infoEl) {
            infoEl.innerHTML = this.config.renderInfo(item, this);
            this.addDownload(infoEl, item);
            this.modal.classList.toggle('has-info', infoEl.textContent.trim().length > 0);
        }

        // Update counter
        if (counterEl) {
            const counterText = this.config.calculateCounter
                ? this.config.calculateCounter(this.currentIndex, this.data.length, this)
                : `${this.currentIndex + 1} of ${this.data.length}`;
            counterEl.textContent = counterText;
        }

        // Update navigation button visibility
        this.updateNavigation();
        this.alignFrame();
    }

    updateNavigation() {
        const prevBtn = this.modal.querySelector('.modal-nav.prev');
        const nextBtn = this.modal.querySelector('.modal-nav.next');

        if (prevBtn) prevBtn.style.display = this.currentIndex > 0 ? 'flex' : 'none';
        if (nextBtn) nextBtn.style.display = this.currentIndex < this.data.length - 1 ? 'flex' : 'none';
    }

    navigate(direction) {
        const newIndex = this.currentIndex + direction;
        if (newIndex >= 0 && newIndex < this.data.length) {
            this.currentIndex = newIndex;
            this.updateContent();
        }
    }

    show() {
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    close() {
        if (this.modal) {
            this.modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    setupTouchListeners() {
        if (!this.modal) return;
        const content = this.modal.querySelector('.modal-content');

        this.modal.addEventListener('touchstart', (e) => {
            if (e.target.closest('.modal-content')) {
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        this.modal.addEventListener('touchend', (e) => {
            if (!this.touchStartX || !this.touchStartY) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const deltaX = touchEndX - this.touchStartX;
            const deltaY = touchEndY - this.touchStartY;

            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                e.preventDefault();
                if (deltaX > 0) {
                    this.navigate(-1);
                } else {
                    this.navigate(1);
                }
            }

            this.touchStartX = null;
            this.touchStartY = null;
        }, { passive: false });
    }

    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.modal && this.modal.style.display === 'flex') {
                if (e.key === 'Escape') {
                    this.close();
                } else if (e.key === 'ArrowLeft') {
                    this.navigate(-1);
                } else if (e.key === 'ArrowRight') {
                    this.navigate(1);
                }
            }
        });
    }
}
