// Generic Modal Component - Works for posters, photos, and other gallery items
class Modal {
    constructor(config) {
        this.config = config; // { modalId, classPrefix, renderInfo }
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
        this.show();
    }

    createModal() {
        if (this.modal) return;

        const classPrefix = this.config.classPrefix;
        this.modal = document.createElement('div');
        this.modal.id = this.config.modalId;
        this.modal.className = classPrefix;
        this.modal.innerHTML = `
            <div class="${classPrefix}-overlay"></div>
            <div class="${classPrefix}-content">
                <button class="${classPrefix}-close" onclick="${this.config.modalId}.close()">&times;</button>
                <button class="${classPrefix}-nav prev" onclick="${this.config.modalId}.navigate(-1)">‹</button>
                <button class="${classPrefix}-nav next" onclick="${this.config.modalId}.navigate(1)">›</button>
                <img class="${classPrefix}-image" src="" alt="Item">
                <div class="${classPrefix}-info"></div>
            </div>
        `;
        document.body.appendChild(this.modal);
        this.setupOverlayListener();
        this.setupTouchListeners();
    }

    setupOverlayListener() {
        if (!this.modal) return;

        const classPrefix = this.config.classPrefix;
        const overlay = this.modal.querySelector(`.${classPrefix}-overlay`);
        const content = this.modal.querySelector(`.${classPrefix}-content`);
        const image = this.modal.querySelector(`.${classPrefix}-image`);
        const info = this.modal.querySelector(`.${classPrefix}-info`);
        const navButtons = this.modal.querySelectorAll(`.${classPrefix}-nav, .${classPrefix}-close`);

        // Close when clicking on overlay or content
        overlay.addEventListener('click', () => this.close());
        content.addEventListener('click', () => this.close());

        // Prevent close when clicking on image, info, or nav buttons
        image.addEventListener('click', (e) => e.stopPropagation());
        info.addEventListener('click', (e) => e.stopPropagation());
        navButtons.forEach(btn => btn.addEventListener('click', (e) => e.stopPropagation()));
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

        const classPrefix = this.config.classPrefix;
        const imageEl = this.modal.querySelector(`.${classPrefix}-image`);
        const infoEl = this.modal.querySelector(`.${classPrefix}-info`);
        const counterEl = this.modal.querySelector(`.${classPrefix}-counter`);

        // Update image
        if (imageEl) {
            imageEl.src = item.poster || item.image;
            imageEl.alt = this.config.getAlt ? this.config.getAlt(item) : 'Item';
        }

        // Update info using config renderer
        if (infoEl) {
            infoEl.innerHTML = this.config.renderInfo(item, this);
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
    }

    updateNavigation() {
        const classPrefix = this.config.classPrefix;
        const prevBtn = this.modal.querySelector(`.${classPrefix}-nav.prev`);
        const nextBtn = this.modal.querySelector(`.${classPrefix}-nav.next`);

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

        const classPrefix = this.config.classPrefix;
        const content = this.modal.querySelector(`.${classPrefix}-content`);

        this.modal.addEventListener('touchstart', (e) => {
            if (e.target.closest(`.${classPrefix}-content`)) {
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
