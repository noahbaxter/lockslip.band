// Image fade-in with placeholder
// Injects placeholder div as sibling, fades out when image loads
const ImageLoader = {
    containers: [
        '.photo-placeholder',
        '.show-poster-preview',
        '.tour-poster-preview',
        '.carousel-poster',
        '.poster-grid-item',
        '.video-thumbnail',
        '.logo-preview',
        '.extras-card-image',
        '.hero-bg'
    ],

    init() {
        this.containers.forEach(sel => {
            document.querySelectorAll(`${sel} img, img${sel}`).forEach(img => this.setup(img));
        });
        document.querySelectorAll('.carousel-images').forEach(container => {
            container.querySelectorAll('img').forEach(img => this.setupCarouselImage(img, container));
        });
    },

    setup(img) {
        if (img.dataset.fadeInit) return;
        img.dataset.fadeInit = 'true';

        const placeholder = document.createElement('div');
        placeholder.className = 'img-placeholder';
        img.parentElement.insertBefore(placeholder, img);

        img.style.opacity = '0';
        img.style.transition = 'opacity 0.3s ease-in-out';

        const reveal = () => {
            img.style.opacity = '1';
            placeholder.style.opacity = '0';
            setTimeout(() => placeholder.remove(), 300);
        };

        if (img.complete && img.naturalHeight !== 0) {
            reveal();
        } else {
            img.onload = reveal;
            img.onerror = () => {
                img.style.display = 'none';
                placeholder.remove();
            };
        }
    },

    setupCarouselImage(img, container) {
        if (img.dataset.fadeInit) return;
        img.dataset.fadeInit = 'true';

        const markReady = () => {
            img.classList.add('img-ready');
            container.classList.add('img-loaded');
        };

        if (img.complete && img.naturalHeight !== 0) {
            markReady();
        } else {
            img.onload = markReady;
            img.onerror = () => { img.style.display = 'none'; };
        }
    },

    refresh(container = document) {
        this.containers.forEach(sel => {
            container.querySelectorAll(`${sel} img, img${sel}`).forEach(img => this.setup(img));
        });
        container.querySelectorAll('.carousel-images').forEach(carouselContainer => {
            carouselContainer.querySelectorAll('img').forEach(img => this.setupCarouselImage(img, carouselContainer));
        });
    }
};

window.ImageLoader = ImageLoader;
