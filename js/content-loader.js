class ContentLoader {
    constructor() {
        this.config = null;
        this.releases = null;
        this.shows = null;
        this.merchandise = null;
        this.media = null;
    }

    async loadAllContent() {
        try {
            const [config, releases, shows, merchandise, media] = await Promise.all([
                this.loadJSON('content/site-config.json'),
                this.loadJSON('content/releases.json'),
                this.loadJSON('content/shows.json'),
                this.loadJSON('content/merchandise.json'),
                this.loadJSON('content/media.json')
            ]);

            this.config = config;
            this.releases = releases;
            this.shows = shows;
            this.merchandise = merchandise;
            this.media = media;

            this.renderAllContent();
        } catch (error) {
            console.error('Error loading content:', error);
            this.showError();
        }
    }

    async loadJSON(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load ${url}`);
        }
        return await response.json();
    }

    renderAllContent() {
        this.renderStreamingLinks();
        this.renderReleases();
        this.renderShows();
        this.renderMerchandise();
        this.renderMedia();
        this.renderFooter();
        this.renderNavigation();
        this.renderStreamingIcons();
    }


    renderStreamingLinks() {
        const streamingContainer = document.querySelector('.streaming-links');
        if (streamingContainer && this.config.streamingLinks) {
            streamingContainer.innerHTML = NavigationComponent.renderStreamingLinks(this.config.streamingLinks);
        }
    }

    renderReleases() {
        const releasesSection = document.getElementById('music');
        if (releasesSection && this.releases) {
            releasesSection.innerHTML = ReleasesComponent.render(this.releases);
        }
    }

    renderShows() {
        const showsSection = document.getElementById('shows');
        if (showsSection && this.shows) {
            // Process individual shows
            const individualShows = [...(this.shows.shows || [])];
            
            // Process tours separately to maintain grouping
            const processedTours = [];
            if (this.shows.tours) {
                this.shows.tours.forEach(tour => {
                    if (tour.shows && tour.shows.length > 0) {
                        processedTours.push({
                            ...tour,
                            shows: tour.shows || []
                        });
                    }
                });
            }

            // Get today's date (set to start of day for accurate comparison)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Helper function to categorize shows
            const categorizeShow = (show) => {
                const showDate = new Date(`${show.date.month} ${show.date.day}, ${show.date.year}`);
                showDate.setHours(0, 0, 0, 0);
                return {
                    ...show,
                    actuallyPast: showDate < today, // Shows on today or in the future are not past
                    showDate: showDate
                };
            };

            // Categorize individual shows
            const categorizedIndividualShows = individualShows.map(categorizeShow);
            
            // Categorize tours and their shows
            const categorizedTours = processedTours.map(tour => {
                const categorizedTourShows = tour.shows.map(categorizeShow);
                const tourStartDate = new Date(`${tour.startDate.month} ${tour.startDate.day}, ${tour.startDate.year}`);
                tourStartDate.setHours(0, 0, 0, 0);
                const tourEndDate = new Date(`${tour.endDate.month} ${tour.endDate.day}, ${tour.endDate.year}`);
                tourEndDate.setHours(0, 0, 0, 0);
                
                // Tour is past only if it ended before today (ongoing and future tours are upcoming)
                const dayAfterTourEnds = new Date(tourEndDate);
                dayAfterTourEnds.setDate(dayAfterTourEnds.getDate() + 1);
                
                return {
                    ...tour,
                    shows: categorizedTourShows,
                    actuallyPast: dayAfterTourEnds <= today, // Tour is past only after the day after it ends
                    tourStartDate: tourStartDate,
                    tourEndDate: tourEndDate
                };
            });

            // Create chronologically mixed arrays for past and future
            const pastItems = [];
            const futureItems = [];

            // Add individual shows to appropriate arrays
            categorizedIndividualShows.forEach(show => {
                const item = { type: 'show', data: show, sortDate: show.showDate };
                if (show.actuallyPast) {
                    pastItems.push(item);
                } else {
                    futureItems.push(item);
                }
            });

            // Add tours to appropriate arrays, splitting ongoing tours
            categorizedTours.forEach(tour => {
                const pastShows = tour.shows.filter(show => show.actuallyPast);
                const futureShows = tour.shows.filter(show => !show.actuallyPast);
                
                // If tour has both past and future shows, split it
                if (pastShows.length > 0 && futureShows.length > 0) {
                    // Add past portion to past items
                    const pastTour = {
                        ...tour,
                        shows: pastShows,
                        actuallyPast: true
                    };
                    pastItems.push({ 
                        type: 'tour', 
                        data: pastTour, 
                        sortDate: tour.tourEndDate 
                    });
                    
                    // Add future portion to future items
                    const futureTour = {
                        ...tour,
                        shows: futureShows,
                        actuallyPast: false
                    };
                    futureItems.push({ 
                        type: 'tour', 
                        data: futureTour, 
                        sortDate: tour.tourStartDate 
                    });
                } else {
                    // Tour is completely past or future, add as normal
                    const sortDate = tour.actuallyPast ? tour.tourEndDate : tour.tourStartDate;
                    const item = { type: 'tour', data: tour, sortDate: sortDate };
                    if (tour.actuallyPast) {
                        pastItems.push(item);
                    } else {
                        futureItems.push(item);
                    }
                }
            });

            // Sort chronologically - past shows newest first, future shows oldest first
            pastItems.sort((a, b) => b.sortDate - a.sortDate);
            futureItems.sort((a, b) => a.sortDate - b.sortDate);

            // Collect all shows with posters for navigation in chronological order (oldest to newest)
            const showsWithPosters = [];
            
            // Combine all items and sort chronologically (oldest first)
            const allItems = [...pastItems, ...futureItems].sort((a, b) => a.sortDate - b.sortDate);
            
            allItems.forEach(item => {
                if (item.type === 'show' && item.data.poster) {
                    showsWithPosters.push(item.data);
                } else if (item.type === 'tour') {
                    const tour = item.data;
                    // Add tour poster first
                    if (tour.poster) showsWithPosters.push({...tour, isTourPoster: true});
                    
                    // Add tour shows in chronological order (oldest first)
                    const tourShowsWithPosters = tour.shows
                        .filter(show => show.poster)
                        .sort((a, b) => a.showDate - b.showDate);
                    
                    tourShowsWithPosters.forEach(show => {
                        showsWithPosters.push(show);
                    });
                }
            });
            
            window.showsWithPosters = showsWithPosters;


            const showsHTML = ShowsComponent.render(this.shows, this.config, futureItems, pastItems, showsWithPosters);
            showsSection.innerHTML = showsHTML;
        }
    }

    renderMerchandise() {
        const merchSection = document.getElementById('merch');
        if (merchSection && this.merchandise) {
            merchSection.innerHTML = MerchandiseComponent.render(this.merchandise);
        }
    }

    renderMedia() {
        const mediaSection = document.getElementById('media');
        if (mediaSection && this.media) {
            mediaSection.innerHTML = MediaComponent.render(this.media);
        }
    }

    renderFooter() {
        const footerContent = document.querySelector('.footer-content');
        if (footerContent && this.config) {
            footerContent.innerHTML = FooterComponent.render(this.config);
        }
    }

    renderNavigation() {
        // Logo is now an image in HTML, don't overwrite it
        // const logo = document.querySelector('.logo');
        // if (logo && this.config) {
        //     logo.textContent = this.config.bandName;
        // }
    }

    renderStreamingIcons() {
        const streamingIcons = document.querySelector('.streaming-icons');
        const mobileStreamingIcons = document.querySelector('.mobile-streaming-icons');
        
        if (this.config.streamingLinks) {
            const iconHTML = NavigationComponent.renderStreamingIcons(this.config.streamingLinks);
            
            if (streamingIcons) {
                streamingIcons.innerHTML = iconHTML;
            }
            if (mobileStreamingIcons) {
                mobileStreamingIcons.innerHTML = iconHTML;
            }
        }
    }

    subscribeNewsletter() {
        const email = document.getElementById('newsletter-email').value;
        if (email) {
            // You can implement actual newsletter subscription here
            alert('Newsletter subscription functionality would be implemented here');
        }
    }

    showError() {
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; color: white; background: black; font-family: Arial, sans-serif;">
                <div style="text-align: center;">
                    <h1>ERROR LOADING CONTENT</h1>
                    <p>Please check that all content files are available</p>
                </div>
            </div>
        `;
    }
}

// Initialize content loader when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const contentLoader = new ContentLoader();
    contentLoader.loadAllContent();
});

// Make newsletter subscription available globally
window.subscribeNewsletter = function() {
    const email = document.getElementById('newsletter-email').value;
    if (email) {
        // Implement actual newsletter subscription logic here
        alert('Newsletter subscription would be implemented here');
        document.getElementById('newsletter-email').value = '';
    }
};

// Poster Modal Functions
window.currentPosterIndex = 0;

window.openPosterModal = function(index) {
    console.log('Opening poster modal for index:', index);
    console.log('Available shows with posters:', window.showsWithPosters);
    
    if (!window.showsWithPosters || window.showsWithPosters.length === 0) {
        console.error('No shows with posters available');
        return;
    }
    
    window.currentPosterIndex = index;
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('poster-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'poster-modal';
        modal.className = 'poster-modal';
        modal.innerHTML = `
            <div class="poster-modal-overlay" onclick="closePosterModal()"></div>
            <div class="poster-modal-content">
                <button class="poster-modal-close" onclick="closePosterModal()">&times;</button>
                <button class="poster-modal-nav prev" onclick="navigatePoster(-1)">‹</button>
                <button class="poster-modal-nav next" onclick="navigatePoster(1)">›</button>
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
        document.body.appendChild(modal);
    }
    
    updateModalContent();
    
    // Show modal and lock scroll
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window.updateModalContent = function() {
    console.log('Updating modal content for index:', window.currentPosterIndex);
    
    const modal = document.getElementById('poster-modal');
    if (!modal) {
        console.error('Modal not found');
        return;
    }
    
    const show = window.showsWithPosters[window.currentPosterIndex];
    
    if (!show) {
        console.error('No show found at index:', window.currentPosterIndex);
        return;
    }
    
    console.log('Show data:', show);
    
    // Update modal content
    const imageEl = modal.querySelector('.poster-modal-image');
    const venueEl = modal.querySelector('.poster-modal-venue');
    const locationEl = modal.querySelector('.poster-modal-location');
    const dateEl = modal.querySelector('.poster-modal-date');
    const bandsEl = modal.querySelector('.poster-modal-bands');
    const counterEl = modal.querySelector('.poster-modal-counter');
    
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
    
    if (counterEl) counterEl.textContent = `${window.currentPosterIndex + 1} of ${window.showsWithPosters.length}`;
    
    // Update navigation button visibility
    const prevBtn = modal.querySelector('.poster-modal-nav.prev');
    const nextBtn = modal.querySelector('.poster-modal-nav.next');
    
    if (prevBtn) prevBtn.style.display = window.currentPosterIndex > 0 ? 'flex' : 'none';
    if (nextBtn) nextBtn.style.display = window.currentPosterIndex < window.showsWithPosters.length - 1 ? 'flex' : 'none';
};

window.navigatePoster = function(direction) {
    const newIndex = window.currentPosterIndex + direction;
    if (newIndex >= 0 && newIndex < window.showsWithPosters.length) {
        window.currentPosterIndex = newIndex;
        updateModalContent();
    }
};

window.togglePosterInfo = function() {
    const modal = document.getElementById('poster-modal');
    if (!modal) return;
    
    const infoEl = modal.querySelector('.poster-modal-info');
    const bgEl = modal.querySelector('.poster-modal-bg');
    const toggleBtn = modal.querySelector('.poster-modal-info-toggle');
    
    window.showingInfo = !window.showingInfo;
    
    if (window.showingInfo) {
        if (infoEl) infoEl.classList.add('show-info');
        if (bgEl) bgEl.classList.add('show-info');
        if (toggleBtn) toggleBtn.textContent = 'POSTER';
    } else {
        if (infoEl) infoEl.classList.remove('show-info');
        if (bgEl) bgEl.classList.remove('show-info');
        if (toggleBtn) toggleBtn.textContent = 'INFO';
    }
};

window.closePosterModal = function() {
    const modal = document.getElementById('poster-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        window.showingInfo = false;
    }
};

// Close modal with Escape key and navigate with arrow keys
document.addEventListener('keydown', function(e) {
    const modal = document.getElementById('poster-modal');
    if (modal && modal.style.display === 'flex') {
        if (e.key === 'Escape') {
            closePosterModal();
        } else if (e.key === 'ArrowLeft') {
            navigatePoster(-1);
        } else if (e.key === 'ArrowRight') {
            navigatePoster(1);
        }
    }
});

// Past Shows Toggle Function
window.togglePastShows = function() {
    const content = document.querySelector('.past-shows-content');
    const button = document.querySelector('.show-past-shows-btn');
    const arrow = document.querySelector('.toggle-arrow');
    
    if (content && button && arrow) {
        const isVisible = content.style.display !== 'none';
        
        if (isVisible) {
            content.style.display = 'none';
            button.innerHTML = button.innerHTML.replace('Hide Past Shows', 'Show Past Shows');
            arrow.textContent = '▼';
        } else {
            content.style.display = 'block';
            button.innerHTML = button.innerHTML.replace('Show Past Shows', 'Hide Past Shows');
            arrow.textContent = '▲';
        }
    }
};