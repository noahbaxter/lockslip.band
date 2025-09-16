// Poster Modal Component
class PosterModal {
    constructor() {
        this.currentIndex = 0;
        this.showsWithPosters = [];
        this.showingInfo = false;
        this.modal = null;
        this.setupKeyboardListeners();
    }

    setShows(showsWithPosters) {
        this.showsWithPosters = showsWithPosters;
        window.showsWithPosters = showsWithPosters; // Maintain global reference for compatibility
    }

    open(index) {
        console.log('Opening poster modal for index:', index);
        
        if (!this.showsWithPosters || this.showsWithPosters.length === 0) {
            console.error('No shows with posters available');
            return;
        }
        
        this.currentIndex = index;
        this.createModal();
        this.updateContent();
        this.show();
    }

    createModal() {
        if (this.modal) return;

        this.modal = document.createElement('div');
        this.modal.id = 'poster-modal';
        this.modal.className = 'poster-modal';
        this.modal.innerHTML = `
            <div class="poster-modal-overlay" onclick="posterModal.close()"></div>
            <div class="poster-modal-content">
                <button class="poster-modal-close" onclick="posterModal.close()">&times;</button>
                <button class="poster-modal-nav prev" onclick="posterModal.navigate(-1)">‹</button>
                <button class="poster-modal-nav next" onclick="posterModal.navigate(1)">›</button>
                <img class="poster-modal-image" src="" alt="Show Poster">
                <div class="poster-modal-info">
                    <h3 class="poster-modal-venue"></h3>
                    <p class="poster-modal-location"></p>
                    <p class="poster-modal-date"></p>
                    <p class="poster-modal-bands"></p>
                    <p class="poster-modal-counter"></p>
                </div>
            </div>
        `;
        document.body.appendChild(this.modal);
    }

    updateContent() {
        console.log('Updating modal content for index:', this.currentIndex);
        
        if (!this.modal) {
            console.error('Modal not found');
            return;
        }
        
        const show = this.showsWithPosters[this.currentIndex];
        
        if (!show) {
            console.error('No show found at index:', this.currentIndex);
            return;
        }
        
        console.log('Show data:', show);
        
        // Update modal content
        const imageEl = this.modal.querySelector('.poster-modal-image');
        const venueEl = this.modal.querySelector('.poster-modal-venue');
        const locationEl = this.modal.querySelector('.poster-modal-location');
        const dateEl = this.modal.querySelector('.poster-modal-date');
        const bandsEl = this.modal.querySelector('.poster-modal-bands');
        const counterEl = this.modal.querySelector('.poster-modal-counter');
        
        if (imageEl) imageEl.src = show.poster;
        
        // Check if this is a tour poster
        if (show.isTourPoster) {
            if (imageEl) imageEl.alt = `${show.name} tour poster`;
            if (venueEl) venueEl.textContent = show.name;
            if (locationEl) locationEl.textContent = '';
            if (dateEl) dateEl.textContent = `${show.startDate.month} ${show.startDate.day} - ${show.endDate.month} ${show.endDate.day}, ${show.startDate.year}`;
            if (bandsEl) bandsEl.textContent = '';
        } else {
            const displayName = show.event || show.venue;
            if (imageEl) imageEl.alt = `${displayName} - ${show.location}`;
            if (venueEl) venueEl.textContent = displayName;
            if (locationEl) locationEl.textContent = show.location;
            if (dateEl) dateEl.textContent = `${show.date.month} ${show.date.day}, ${show.date.year}`;
            if (bandsEl) {
                if (show.bands && show.bands.length > 0) {
                    const displayBands = ShowsComponent.getBandList(show.bands);
                    bandsEl.innerHTML = displayBands.map(band => 
                        band === 'Lockslip' ? `<span class="lockslip-highlight">${band}</span>` : band
                    ).join(', ');
                } else {
                    bandsEl.textContent = '';
                }
            }
        }
        
        // Update counter
        if (counterEl) {
            counterEl.textContent = this.calculateCounter(show);
        }
        
        // Update navigation button visibility
        this.updateNavigation();
    }

    calculateCounter(show) {
        // Count total actual shows (exclude tour posters)
        const totalShows = this.showsWithPosters.filter(item => !item.isTourPoster).length;
        
        if (show.isTourPoster) {
            // Find which actual show positions this tour represents
            let showPosition = 1;
            let tourStartPosition = null;
            let tourEndPosition = null;
            
            for (let i = 0; i < this.showsWithPosters.length; i++) {
                const item = this.showsWithPosters[i];
                if (!item.isTourPoster) {
                    // This is an actual show
                    // Check if this show ID matches any show in the tour
                    const isInTour = show.shows && show.shows.some(tourShow => {
                        // Handle both string IDs and show objects
                        const tourShowId = typeof tourShow === 'string' ? tourShow : tourShow.id;
                        return tourShowId === item.id;
                    });
                    if (isInTour) {
                        // This show belongs to our tour
                        if (tourStartPosition === null) tourStartPosition = showPosition;
                        tourEndPosition = showPosition;
                    }
                    showPosition++;
                }
            }
            
            if (tourStartPosition && tourEndPosition && tourEndPosition > tourStartPosition) {
                return `${tourStartPosition}-${tourEndPosition} of ${totalShows}`;
            } else if (tourStartPosition) {
                return `${tourStartPosition} of ${totalShows}`;
            } else {
                return `1 of ${totalShows}`;
            }
        } else {
            // For individual shows, find their position among actual shows
            let showPosition = 1;
            for (let i = 0; i < this.currentIndex; i++) {
                if (!this.showsWithPosters[i].isTourPoster) {
                    showPosition++;
                }
            }
            return `${showPosition} of ${totalShows}`;
        }
    }

    updateNavigation() {
        const prevBtn = this.modal.querySelector('.poster-modal-nav.prev');
        const nextBtn = this.modal.querySelector('.poster-modal-nav.next');
        
        if (prevBtn) prevBtn.style.display = this.currentIndex > 0 ? 'flex' : 'none';
        if (nextBtn) nextBtn.style.display = this.currentIndex < this.showsWithPosters.length - 1 ? 'flex' : 'none';
    }

    navigate(direction) {
        const newIndex = this.currentIndex + direction;
        if (newIndex >= 0 && newIndex < this.showsWithPosters.length) {
            this.currentIndex = newIndex;
            this.updateContent();
        }
    }

    toggleInfo() {
        const infoEl = this.modal.querySelector('.poster-modal-info');
        const bgEl = this.modal.querySelector('.poster-modal-bg');
        const toggleBtn = this.modal.querySelector('.poster-modal-info-toggle');
        
        this.showingInfo = !this.showingInfo;
        
        if (this.showingInfo) {
            if (infoEl) infoEl.classList.add('show-info');
            if (bgEl) bgEl.classList.add('show-info');
            if (toggleBtn) toggleBtn.textContent = 'POSTER';
        } else {
            if (infoEl) infoEl.classList.remove('show-info');
            if (bgEl) bgEl.classList.remove('show-info');
            if (toggleBtn) toggleBtn.textContent = 'INFO';
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
            this.showingInfo = false;
        }
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

// Create global instance for backwards compatibility
const posterModal = new PosterModal();

// Legacy global functions for backwards compatibility
window.openPosterModal = (index) => posterModal.open(index);
window.closePosterModal = () => posterModal.close();
window.navigatePoster = (direction) => posterModal.navigate(direction);
window.togglePosterInfo = () => posterModal.toggleInfo();
window.updateModalContent = () => posterModal.updateContent();