// Carousel Manager Component
class CarouselManager {
    constructor() {
        this.currentCollectionIndex = 0;
        this.watchSwipes();
        this.watchWidth();
    }

    // Items per view is a CSS variable and changes with the window, so the row
    // has to be re-measured on resize: three dots lit on a desktop is one dot lit
    // on a phone, and an index that was in range can fall out of it.
    watchWidth() {
        let pending = null;
        window.addEventListener('resize', () => {
            clearTimeout(pending);
            pending = setTimeout(() => this.refreshCollection(), 150);
        });
    }

    // A move of nothing: clamps the index, re-applies the transform, and puts the
    // arrows and dots in step with whatever the width is now.
    refreshCollection() {
        if (document.querySelector('.merch-carousel-track')) this.navigateCollectionCarousel(0);
    }

    // Swiping a photo steps through that item's photos, since a phone has no
    // hover and the dots are a small thing to aim at while holding a phone.
    // Delegated, so it covers cards the merch component renders later.
    watchSwipes() {
        let start = null;

        document.addEventListener('touchstart', e => {
            start = null;
            if (!e.target.closest) return;

            // Found through the card, not from the target: the card's link is
            // laid over the whole thing, so a finger on the photo lands on that
            // rather than on the carousel underneath it.
            const card = e.target.closest('.merch-item');
            const carousel = card && card.querySelector('.merch-image-carousel');
            if (!carousel) return;

            const y = e.changedTouches[0].clientY;
            const photo = carousel.getBoundingClientRect();
            if (y < photo.top || y > photo.bottom) return;

            start = { x: e.changedTouches[0].clientX, y, carousel };
        }, { passive: true });

        document.addEventListener('touchend', e => {
            const from = start;
            start = null;
            if (!from) return;

            const dx = e.changedTouches[0].clientX - from.x;
            const dy = e.changedTouches[0].clientY - from.y;
            // Sideways, and meant: anything shorter is a tap and anything more
            // vertical is the page being scrolled.
            if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;

            this.navigateItemCarousel(from.carousel.dataset.itemId, dx < 0 ? 1 : -1);

            // The whole card is a link, so the click that follows a swipe would
            // otherwise open the shop.
            const card = from.carousel.closest('.merch-item');
            if (!card) return;
            card.classList.add('is-swiping');
            setTimeout(() => card.classList.remove('is-swiping'), 500);
        }, { passive: true });

        document.addEventListener('click', e => {
            if (e.target.closest && e.target.closest('.merch-item.is-swiping')) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
    }

    // The id sits on the carousel, not on something around it.
    itemCarousel(itemId) {
        return document.querySelector(`.merch-image-carousel[data-item-id="${itemId}"]`);
    }

    // Navigate individual item carousel (merch item image carousel)
    navigateItemCarousel(itemId, direction) {
        const carousel = this.itemCarousel(itemId);
        if (!carousel) return;
        
        const images = carousel.querySelectorAll('.carousel-image');
        const dots = carousel.querySelectorAll('.carousel-dot');
        const currentActive = carousel.querySelector('.carousel-image.active');
        const currentIndex = parseInt(currentActive.dataset.index);
        
        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = images.length - 1;
        if (newIndex >= images.length) newIndex = 0;
        
        // Update images
        images.forEach(img => img.classList.remove('active'));
        images[newIndex].classList.add('active');
        
        // Update dots
        dots.forEach(dot => dot.classList.remove('active'));
        dots[newIndex].classList.add('active');
    }

    // Go to specific item image
    goToItemImage(itemId, index) {
        const carousel = this.itemCarousel(itemId);
        if (!carousel) return;

        const images = carousel.querySelectorAll('.carousel-image');
        const dots = carousel.querySelectorAll('.carousel-dot');
        if (!images[index]) return;

        // Update images
        images.forEach(img => img.classList.remove('active'));
        images[index].classList.add('active');
        
        // Update dots
        dots.forEach(dot => dot.classList.remove('active'));
        dots[index].classList.add('active');
    }

    // Navigate collection carousel (main merch collection)
    navigateCollectionCarousel(direction) {
        const track = document.querySelector('.merch-carousel-track');
        const items = document.querySelectorAll('.merch-item');
        const totalItems = items.length;
        
        // Read CSS variables for consistent calculation
        const computedStyle = getComputedStyle(document.documentElement);
        const itemsPerView = parseInt(computedStyle.getPropertyValue('--carousel-items-per-view'));
        const gapValue = computedStyle.getPropertyValue('--carousel-gap').trim();
        const gapRem = parseFloat(gapValue); // Convert "2rem" to 2
        
        const maxIndex = Math.max(0, totalItems - itemsPerView);
        const shouldLoop = totalItems > 3; // Only loop if more than 3 items
        
        this.currentCollectionIndex += direction;
        
        if (shouldLoop) {
            // Infinite looping for carousels with enough items
            if (this.currentCollectionIndex < 0) {
                this.currentCollectionIndex = maxIndex;
            }
            if (this.currentCollectionIndex > maxIndex) {
                this.currentCollectionIndex = 0;
            }
        } else {
            // Stop at boundaries for small carousels
            if (this.currentCollectionIndex < 0) {
                this.currentCollectionIndex = 0;
            }
            if (this.currentCollectionIndex > maxIndex) {
                this.currentCollectionIndex = maxIndex;
            }
        }

        // Each step moves by (100% / items) + (gap / items)
        const stepPercent = 100 / itemsPerView; // 33.333% for 3 items
        const stepGapRem = gapRem / itemsPerView; // 2rem / 3 = 0.667rem
        const translatePercent = this.currentCollectionIndex * stepPercent;
        const translateGapRem = this.currentCollectionIndex * stepGapRem;
        track.style.transform = `translateX(calc(-${translatePercent}% - ${translateGapRem}rem))`;
        
        // Update nav button visibility
        this.updateCollectionNavigation(shouldLoop, maxIndex);
        this.updateCollectionDots(itemsPerView, totalItems);
    }

    // One dot per item, so the row says how much there is as well as where you
    // are in it. The ones on screen are lit; the rest are not.
    updateCollectionDots(itemsPerView, totalItems) {
        const dots = document.querySelectorAll('.merch-dot');
        if (!dots.length) return;

        const first = this.currentCollectionIndex;
        const last = Math.min(first + itemsPerView, totalItems) - 1;
        dots.forEach((dot, index) => {
            dot.classList.toggle('is-showing', index >= first && index <= last);
        });
    }

    updateCollectionNavigation(shouldLoop, maxIndex) {
        const prevBtn = document.querySelector('.collection-nav.prev');
        const nextBtn = document.querySelector('.collection-nav.next');
        
        if (shouldLoop) {
            // Always show both buttons for infinite carousels
            if (prevBtn) prevBtn.style.display = 'flex';
            if (nextBtn) nextBtn.style.display = 'flex';
        } else {
            // Show/hide based on position for small carousels
            if (prevBtn) prevBtn.style.display = this.currentCollectionIndex > 0 ? 'flex' : 'none';
            if (nextBtn) nextBtn.style.display = this.currentCollectionIndex < maxIndex ? 'flex' : 'none';
        }
    }
}

// Create global instance
const carouselManager = new CarouselManager();

// Legacy global functions for backwards compatibility
window.navigateItemCarousel = (itemId, direction) => carouselManager.navigateItemCarousel(itemId, direction);
window.goToItemImage = (itemId, index) => carouselManager.goToItemImage(itemId, index);
window.navigateCollectionCarousel = (direction) => carouselManager.navigateCollectionCarousel(direction);