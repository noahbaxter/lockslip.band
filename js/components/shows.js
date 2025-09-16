// Shows Component
const ShowsComponent = {
    getBandList(bands) {
        if (!bands || bands.length === 0) return [];
        // Reverse the bands array to show headliners first, openers last
        return [...bands].reverse();
    },

    renderBandsList(bands, showPoster = false) {
        if (!bands || bands.length === 0) return '';
        
        const displayBands = this.getBandList(bands);
        
        return `
            <div class="show-bands ${showPoster ? 'mobile-hidden' : ''}">
                <p class="bands-list">${displayBands.map(band => 
                    band === 'Lockslip' ? `<span class="lockslip-highlight">${band}</span>` : band
                ).join(', ')}</p>
            </div>
        `;
    },

    renderShowPoster(show, showsWithPosters) {
        if (!show.poster) return '';
        
        const posterIndex = showsWithPosters.findIndex(posterShow => posterShow.id === show.id);
        
        return `
            <div class="show-poster-preview" onclick="openPosterModal(${posterIndex})">
                <img src="${show.poster}" alt="${show.venue} poster" onerror="this.parentElement.style.display='none'">
                <div class="poster-overlay">
                    <span class="poster-zoom-icon">🔍</span>
                </div>
            </div>
        `;
    },

    renderShowDesktop(show, isPast = false, showsWithPosters = []) {
        return `
            <div class="show-card desktop-show ${isPast ? 'past-show' : ''} ${show.poster ? 'has-poster' : ''} card-base glow-hover semi-transparent-bg" data-show-id="${show.id}">
                <div class="show-date-section flex-column-center">
                    <div class="show-date flex-column-center text-center">
                        <span class="month">${show.date.month}</span>
                        <span class="day">${show.date.day}</span>
                        <span class="year">${show.date.year}</span>
                    </div>
                    ${!isPast && show.ticketsUrl ? `
                        <div class="show-actions">
                            <a href="${show.ticketsUrl}" class="btn small" target="_blank" rel="noopener">TICKETS</a>
                        </div>
                    ` : ''}
                </div>
                <div class="show-info">
                    <div class="show-header">
                        <h3 class="show-venue">${show.event || show.venue}</h3>
                        <p class="show-location">${show.location}</p>
                    </div>
                    ${this.renderBandsList(show.bands, !!show.poster)}
                </div>
                ${this.renderShowPoster(show, showsWithPosters)}
            </div>
        `;
    },

    renderShowMobile(show, isPast = false, showsWithPosters = []) {
        if (show.poster) {
            return `
                <div class="show-card mobile-show ${isPast ? 'past-show' : ''} has-poster" data-show-id="${show.id}">
                    <div class="show-poster-container">
                        ${this.renderShowPoster(show, showsWithPosters)}
                    </div>
                    <div class="show-content">
                        <div class="show-header">
                            <h3 class="show-venue">${show.event || show.venue}</h3>
                            <p class="show-location">${show.location}</p>
                        </div>
                        <div class="show-date">
                            <span class="month">${show.date.month}</span>
                            <span class="day">${show.date.day}</span>
                            <span class="year">${show.date.year}</span>
                        </div>
                        ${!isPast && show.ticketsUrl ? `
                            <div class="show-actions">
                                <a href="${show.ticketsUrl}" class="btn small" target="_blank" rel="noopener">TICKETS</a>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="show-card mobile-show ${isPast ? 'past-show' : ''}" data-show-id="${show.id}">
                    <div class="show-date">
                        <span class="month">${show.date.month}</span>
                        <span class="day">${show.date.day}</span>
                        <span class="year">${show.date.year}</span>
                    </div>
                    <div class="show-info">
                        <div class="show-header">
                            <h3 class="show-venue">${show.event || show.venue}</h3>
                            <p class="show-location">${show.location}</p>
                        </div>
                        ${this.renderBandsList(show.bands, false)}
                    </div>
                    ${!isPast && show.ticketsUrl ? `
                        <div class="show-actions">
                            <a href="${show.ticketsUrl}" class="btn small" target="_blank" rel="noopener">TICKETS</a>
                        </div>
                    ` : ''}
                </div>
            `;
        }
    },

    renderShow(show, isPast = false, showsWithPosters = []) {
        return `
            <div class="show-wrapper">
                <div class="desktop-only">
                    ${this.renderShowDesktop(show, isPast, showsWithPosters)}
                </div>
                <div class="mobile-only">
                    ${this.renderShowMobile(show, isPast, showsWithPosters)}
                </div>
            </div>
        `;
    },

    renderTourPoster(tour, showsWithPosters) {
        if (!tour.poster) return '';
        
        const tourPosterIndex = showsWithPosters.findIndex(posterShow => posterShow.id === tour.id);
        
        return `
            <div class="tour-poster-preview" onclick="openPosterModal(${tourPosterIndex})">
                <img src="${tour.poster}" alt="${tour.name} poster" onerror="this.parentElement.style.display='none'">
                <div class="poster-overlay">
                    <span class="poster-zoom-icon">🔍</span>
                </div>
            </div>
        `;
    },

    renderTour(tour, isPast = false, showsWithPosters = []) {
        return `
            <div class="tour-section ${isPast ? 'past-tour' : 'future-tour'}">
                <div class="tour-header">
                    <div class="tour-info">
                        <h4>${tour.name}</h4>
                        <p class="tour-dates">${tour.startDate.month} ${tour.startDate.day} - ${tour.endDate.month} ${tour.endDate.day}, ${tour.startDate.year}</p>
                    </div>
                    ${this.renderTourPoster(tour, showsWithPosters)}
                </div>
                <div class="tour-shows">
                    ${(() => {
                        const sortedShows = [...tour.shows].sort((a, b) => {
                            return isPast ? (b.showDate - a.showDate) : (a.showDate - b.showDate);
                        });
                        return sortedShows.map(show => this.renderShow(show, isPast, showsWithPosters)).join('');
                    })()}
                </div>
            </div>
        `;
    },

    renderMixedItems(items, isPast = false, showsWithPosters = []) {
        return items.map(item => {
            if (item.type === 'show') {
                return this.renderShow(item.data, isPast, showsWithPosters);
            } else if (item.type === 'tour') {
                return this.renderTour(item.data, isPast, showsWithPosters);
            }
            return '';
        }).join('');
    },

    renderUpcomingSection(futureItems, showsWithPosters) {
        if (futureItems.length === 0) return '';
        
        return `
            <div class="shows-section">
                <h3>UPCOMING</h3>
                <div class="shows-chronological">
                    ${this.renderMixedItems(futureItems, false, showsWithPosters)}
                </div>
            </div>
        `;
    },

    renderPastSection(pastItems, showsWithPosters) {
        if (pastItems.length === 0) return '';
        
        // Count individual shows (not tours themselves)
        const totalShows = pastItems.reduce((count, item) => {
            if (item.type === 'show') {
                return count + 1;
            } else if (item.type === 'tour') {
                return count + item.data.shows.length;
            }
            return count;
        }, 0);
        
        return `
            <div class="shows-section past-shows-section">
                <div class="past-shows-toggle">
                    <button class="show-past-shows-btn" onclick="togglePastShows()">
                        Show Past Shows (${totalShows})
                        <span class="toggle-arrow">▼</span>
                    </button>
                </div>
                <div class="past-shows-content" style="display: none;">
                    <h3>PAST SHOWS</h3>
                    <div class="shows-chronological past-shows">
                        ${this.renderMixedItems(pastItems, true, showsWithPosters)}
                    </div>
                </div>
            </div>
        `;
    },

    renderBookingInfo(shows, config) {
        return shows.bookingInfo.replace(
            'lockslipband@gmail.com', 
            `<a href="mailto:${config.contact.booking}">${config.contact.booking}</a>`
        );
    },

    render(shows, config, futureItems = [], pastItems = [], showsWithPosters = []) {
        if (!shows) return '';
        
        return `
            <div class="container">
                <h2>${shows.sectionTitle}</h2>
                ${this.renderUpcomingSection(futureItems, showsWithPosters)}
                ${this.renderPastSection(pastItems, showsWithPosters)}
                <p class="booking-info">${this.renderBookingInfo(shows, config)}</p>
            </div>
        `;
    }
};