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
            streamingContainer.innerHTML = this.config.streamingLinks.map(link => `
                <a href="${link.url}" class="streaming-link ${link.className}" target="_blank" rel="noopener">
                    <span>${link.name}</span>
                </a>
            `).join('');
        }
    }

    renderReleases() {
        const releasesSection = document.getElementById('music');
        if (releasesSection && this.releases) {
            const releasesHTML = `
                <div class="container">
                    <div class="releases">
                        <h3>MUSIC</h3>
                        <div class="release-list">
                            ${this.releases.releases.map(release => `
                                <div class="release-item" data-release-id="${release.id}">
                                    <div class="release-artwork">
                                        <div class="release-cover">
                                            ${release.coverImage ? `<img src="${release.coverImage}" alt="${release.title}" onerror="this.style.display='none'">` : ''}
                                        </div>
                                        <div class="release-streaming">
                                            <div class="release-streaming-links">
                                                ${Object.entries(release.streamingLinks || {}).map(([platform, url]) => {
                                                    // Map to actual SVG files
                                                    let iconPath = '';
                                                    switch(platform) {
                                                        case 'spotify': iconPath = 'images/icon-social/spotify.svg'; break;
                                                        case 'apple': iconPath = 'images/icon-social/apple-music.svg'; break;
                                                        case 'youtube': iconPath = 'images/icon-social/youtube.svg'; break;
                                                        case 'bandcamp': iconPath = 'images/icon-social/bandcamp.svg'; break;
                                                        case 'soundcloud': iconPath = 'images/icon-social/soundcloud.svg'; break;
                                                        default: iconPath = '';
                                                    }
                                                    
                                                    if (iconPath) {
                                                        return `
                                                            <a href="${url}" class="release-streaming-link ${platform}" target="_blank" rel="noopener" title="${platform}">
                                                                <img src="${iconPath}" alt="${platform}" />
                                                            </a>
                                                        `;
                                                    } else {
                                                        return `
                                                            <a href="${url}" class="release-streaming-link ${platform}" target="_blank" rel="noopener" title="${platform}">${platform.slice(0,2).toUpperCase()}</a>
                                                        `;
                                                    }
                                                }).join('')}
                                            </div>
                                        </div>
                                    </div>
                                    <div class="release-content">
                                        <div class="release-header">
                                            <h4>${release.title}</h4>
                                            <span class="release-date">${release.month} ${release.day}, ${release.year}</span>
                                        </div>
                                        ${release.tracks ? `
                                            <div class="track-listing">
                                                <ul>
                                                    ${release.tracks.map(track => `<li>${track}</li>`).join('')}
                                                </ul>
                                            </div>
                                        ` : ''}
                                        <p class="release-description">${release.description}</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            releasesSection.innerHTML = releasesHTML;
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

            // Add tours to appropriate arrays
            categorizedTours.forEach(tour => {
                // For past tours, sort by end date; for future tours, sort by start date
                const sortDate = tour.actuallyPast ? tour.tourEndDate : tour.tourStartDate;
                const item = { type: 'tour', data: tour, sortDate: sortDate };
                if (tour.actuallyPast) {
                    pastItems.push(item);
                } else {
                    futureItems.push(item);
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

            // Helper function to render individual show
            const renderShow = (show, isPast = false) => {
                const posterIndex = show.poster ? showsWithPosters.findIndex(posterShow => posterShow.id === show.id) : -1;
                
                return `
                    <div class="show-card ${isPast ? 'past-show' : ''} ${show.poster ? 'has-poster' : ''}" data-show-id="${show.id}">
                        <div class="show-date">
                            <span class="month">${show.date.month}</span>
                            <span class="day">${show.date.day}</span>
                            <span class="year">${show.date.year}</span>
                        </div>
                        <div class="show-info">
                            <h3>${show.event || show.venue}</h3>
                            <p>${show.location}</p>
                            ${show.bands && show.bands.length > 0 ? `
                                <div class="show-bands">
                                    <p class="bands-list">${show.bands.map(band => 
                                        band === 'Lockslip' ? `<span class="lockslip-highlight">${band}</span>` : band
                                    ).join(', ')}</p>
                                </div>
                            ` : ''}
                        </div>
                        ${!isPast && show.ticketsUrl ? `
                            <div class="show-actions">
                                <a href="${show.ticketsUrl}" class="btn small" target="_blank" rel="noopener">TICKETS</a>
                            </div>
                        ` : ''}
                        ${show.poster ? `
                            <div class="show-poster-preview" onclick="openPosterModal(${posterIndex})">
                                <img src="${show.poster}" alt="${show.venue} poster" onerror="this.parentElement.style.display='none'">
                                <div class="poster-overlay">
                                    <span class="poster-zoom-icon">🔍</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;
            };

            // Helper function to render tour section
            const renderTour = (tour, isPast = false) => {
                const tourPosterIndex = tour.poster ? showsWithPosters.findIndex(posterShow => posterShow.id === tour.id) : -1;
                
                return `
                    <div class="tour-section ${isPast ? 'past-tour' : 'future-tour'}">
                        <div class="tour-header">
                            <div class="tour-info">
                                <h4>${tour.name}</h4>
                                <p class="tour-dates">${tour.startDate.month} ${tour.startDate.day} - ${tour.endDate.month} ${tour.endDate.day}, ${tour.startDate.year}</p>
                            </div>
                            ${tour.poster ? `
                                <div class="tour-poster-preview" onclick="openPosterModal(${tourPosterIndex})">
                                    <img src="${tour.poster}" alt="${tour.name} poster" onerror="this.parentElement.style.display='none'">
                                    <div class="poster-overlay">
                                        <span class="poster-zoom-icon">🔍</span>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        <div class="tour-shows">
                            ${(() => {
                                // Sort shows within tour: past tours show newest first, future tours show oldest first
                                const sortedShows = [...tour.shows].sort((a, b) => {
                                    return isPast ? (b.showDate - a.showDate) : (a.showDate - b.showDate);
                                });
                                return sortedShows.map(show => renderShow(show, isPast)).join('');
                            })()}
                        </div>
                    </div>
                `;
            };

            // Helper function to render mixed items
            const renderMixedItems = (items, isPast = false) => {
                return items.map(item => {
                    if (item.type === 'show') {
                        return renderShow(item.data, isPast);
                    } else if (item.type === 'tour') {
                        return renderTour(item.data, isPast);
                    }
                    return '';
                }).join('');
            };

            const showsHTML = `
                <div class="container">
                    <h2>${this.shows.sectionTitle}</h2>
                    
                    <!-- Upcoming Shows -->
                    ${futureItems.length > 0 ? `
                        <div class="shows-section">
                            <h3>UPCOMING</h3>
                            <div class="shows-chronological">
                                ${renderMixedItems(futureItems, false)}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Past Shows -->
                    ${pastItems.length > 0 ? `
                        <div class="shows-section">
                            <h3>PAST SHOWS</h3>
                            <div class="shows-chronological past-shows">
                                ${renderMixedItems(pastItems, true)}
                            </div>
                        </div>
                    ` : ''}

                    <p class="booking-info">${this.shows.bookingInfo.replace('lockslipband@gmail.com', `<a href="mailto:${this.config.contact.booking}">${this.config.contact.booking}</a>`)}</p>
                </div>
            `;
            showsSection.innerHTML = showsHTML;
        }
    }

    renderMerchandise() {
        const merchSection = document.getElementById('merch');
        if (merchSection && this.merchandise) {
            const merchHTML = `
                <div class="container">
                    <h2>${this.merchandise.sectionTitle}</h2>
                    <div class="merch-grid">
                        ${this.merchandise.items.filter(item => item.inStock).map(item => `
                            <div class="merch-item" data-item-id="${item.id}">
                                <div class="merch-image">${item.image ? `<img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">` : ''}</div>
                                <h3>${item.name}</h3>
                                <p>${item.price}</p>
                                <a href="${item.purchaseUrl}" class="btn small" target="_blank" rel="noopener">BUY NOW</a>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            merchSection.innerHTML = merchHTML;
        }
    }

    renderMedia() {
        const mediaSection = document.getElementById('media');
        if (mediaSection && this.media) {
            const mediaHTML = `
                <div class="container">
                    <h2>${this.media.sectionTitle}</h2>
                    
                    <!-- Photos Section -->
                    <div class="media-section">
                        <h3>${this.media.photos.sectionTitle}</h3>
                        <div class="photo-grid">
                            ${this.media.photos.gallery.map(photo => `
                                <div class="photo-card" data-photo-id="${photo.id}">
                                    <div class="photo-placeholder">${photo.image ? `<img src="${photo.image}" alt="${photo.alt}" onerror="this.style.display='none'">` : ''}</div>
                                    <p>${photo.caption}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Videos Section -->
                    <div class="media-section">
                        <h3>${this.media.videos.sectionTitle}</h3>
                        <div class="video-grid">
                            ${this.media.videos.items.map(video => `
                                <div class="video-card" data-video-id="${video.id}">
                                    <div class="video-thumbnail">
                                        <a href="${video.url}" target="_blank" rel="noopener">
                                            ${video.thumbnail ? `<img src="${video.thumbnail}" alt="${video.title}" onerror="this.style.display='none'">` : ''}
                                            <div class="video-play-overlay">▶</div>
                                        </a>
                                    </div>
                                    <div class="video-info">
                                        <h4>${video.title}</h4>
                                        <p>${video.description}</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Logos Section -->
                    <div class="media-section">
                        <h3>${this.media.logos.sectionTitle}</h3>
                        <div class="logos-grid">
                            ${this.media.logos.items.map(logo => `
                                <div class="logo-card" data-logo-id="${logo.id}">
                                    <div class="logo-preview">
                                        <img src="${logo.file}" alt="${logo.title}" onerror="this.style.display='none'">
                                    </div>
                                    <div class="logo-download">
                                        <a href="${logo.file}" download class="btn small">DOWNLOAD</a>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            mediaSection.innerHTML = mediaHTML;
        }
    }

    renderFooter() {
        const footerContent = document.querySelector('.footer-content');
        if (footerContent && this.config) {
            footerContent.innerHTML = `
                <div class="footer-section">
                    <h3>FOLLOW</h3>
                    <div class="social-links">
                        ${this.config.socialMedia.map(social => `
                            <a href="${social.url}" target="_blank" rel="noopener">${social.platform}</a>
                        `).join('')}
                    </div>
                </div>
                <div class="footer-section">
                    <h3>CONTACT</h3>
                    <p>Email: <a href="mailto:${this.config.contact.general}">${this.config.contact.general}</a></p>
                    <p>Booking: <a href="mailto:${this.config.contact.booking}">${this.config.contact.booking}</a></p>
                </div>
                <div class="footer-section">
                    <h3>${this.config.newsletter.title}</h3>
                    <p>${this.config.newsletter.subtitle}</p>
                    <div class="newsletter-signup">
                        <input type="email" placeholder="${this.config.newsletter.placeholder}" id="newsletter-email">
                        <button type="button" class="btn small" onclick="this.subscribeNewsletter()">${this.config.newsletter.buttonText}</button>
                    </div>
                </div>
            `;
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
        if (streamingIcons && this.config.streamingLinks) {
            streamingIcons.innerHTML = this.config.streamingLinks.map(link => {
                // Map to actual SVG files
                let iconPath = '';
                switch(link.className) {
                    case 'spotify': iconPath = 'images/icon-social/spotify.svg'; break;
                    case 'apple': iconPath = 'images/icon-social/apple-music.svg'; break;
                    case 'youtube': iconPath = 'images/icon-social/youtube.svg'; break;
                    case 'bandcamp': iconPath = 'images/icon-social/bandcamp.svg'; break;
                    case 'soundcloud': iconPath = 'images/icon-social/soundcloud.svg'; break;
                    default: iconPath = '';
                }
                
                if (iconPath) {
                    return `
                        <a href="${link.url}" class="streaming-icon ${link.className}" target="_blank" rel="noopener" title="${link.name}">
                            <img src="${iconPath}" alt="${link.name}" />
                        </a>
                    `;
                } else {
                    // Fallback to text for platforms without icons
                    const iconText = link.name.slice(0, 2).toUpperCase();
                    return `
                        <a href="${link.url}" class="streaming-icon ${link.className}" target="_blank" rel="noopener" title="${link.name}">
                            ${iconText}
                        </a>
                    `;
                }
            }).join('');
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
    
    // Show modal
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
                bandsEl.innerHTML = show.bands.map(band => 
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

window.closePosterModal = function() {
    const modal = document.getElementById('poster-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
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