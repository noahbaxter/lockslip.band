// Carousel Manager Component
class CarouselManager {
    constructor() {
        this.currentCollectionIndex = 0;
    }

    // Navigate individual item carousel (merch item image carousel)
    navigateItemCarousel(itemId, direction) {
        const carousel = document.querySelector(`[data-item-id="${itemId}"] .merch-image-carousel`);
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
        const carousel = document.querySelector(`[data-item-id="${itemId}"] .merch-image-carousel`);
        if (!carousel) return;
        
        const images = carousel.querySelectorAll('.carousel-image');
        const dots = carousel.querySelectorAll('.carousel-dot');
        
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