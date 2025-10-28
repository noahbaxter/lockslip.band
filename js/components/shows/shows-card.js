// Show/Tour Card Rendering - Shared utilities for show and tour display

const ShowsCard = {
    // Format band names with Lockslip highlight
    getBandList(bands) {
        if (!bands || bands.length === 0) return [];
        // Reverse the bands array to show headliners first, openers last
        return [...bands].reverse();
    },

    formatBandsWithHighlight(bands) {
        if (!bands || bands.length === 0) return '';
        const displayBands = this.getBandList(bands);
        return displayBands.map(band =>
            band === 'Lockslip' ? `<span class="lockslip-highlight">${band}</span>` : band
        ).join(', ');
    },

    // Date block rendering
    renderDateBlock(date, extraClasses = '') {
        return `
            <div class="show-date ${extraClasses}">
                <span class="month">${date.month}</span>
                <span class="day">${date.day}</span>
                <span class="year">${date.year}</span>
            </div>
        `;
    },

    // Tickets button for future shows
    renderTicketsButton(show, isPast) {
        if (isPast || !show.ticketsUrl) return '';
        return `
            <div class="show-actions">
                <a href="${show.ticketsUrl}" class="btn small" target="_blank" rel="noopener">TICKETS</a>
            </div>
        `;
    },

    // Band lineup display
    renderBandsList(bands, showPoster = false) {
        if (!bands || bands.length === 0) return '';

        return `
            <div class="show-bands ${showPoster ? 'mobile-hidden' : ''}">
                <p class="bands-list">${this.formatBandsWithHighlight(bands)}</p>
            </div>
        `;
    },

    // Show poster with modal trigger
    renderShowPoster(show, showsWithPosters) {
        if (!show.poster) return '';

        const posterIndex = showsWithPosters.findIndex(posterShow => posterShow.id === show.id);

        return `
            <div class="show-poster-preview" onclick="openPosterModal(${posterIndex})">
                <img src="${show.poster}" alt="${show.venue} poster" onerror="this.parentElement.style.display='none'">
                <div class="poster-overlay">
                    <span class="poster-zoom-icon">
                        <img src="assets/icons/zoom.svg" alt="Zoom" />
                    </span>
                </div>
            </div>
        `;
    },

    // Desktop show card layout
    renderShowDesktop(show, isPast = false, showsWithPosters = []) {
        return `
            <div class="show-card desktop-show ${isPast ? 'past-show' : 'future-show'} ${show.poster ? 'has-poster' : ''} card-base glow-hover semi-transparent-bg" data-show-id="${show.id}">
                <div class="show-date-section flex-column-center">
                    ${this.renderDateBlock(show.date, 'flex-column-center text-center')}
                    ${this.renderTicketsButton(show, isPast)}
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

    // Mobile show card layout
    renderShowMobile(show, isPast = false, showsWithPosters = []) {
        if (show.poster) {
            return `
                <div class="show-card mobile-show ${isPast ? 'past-show' : 'future-show'} has-poster" data-show-id="${show.id}">
                    <div class="show-poster-container">
                        ${this.renderShowPoster(show, showsWithPosters)}
                    </div>
                    <div class="show-content">
                        <div class="show-header">
                            <h3 class="show-venue">${show.event || show.venue}</h3>
                            <p class="show-location">${show.location}</p>
                        </div>
                        ${this.renderDateBlock(show.date)}
                        ${this.renderTicketsButton(show, isPast)}
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="show-card mobile-show ${isPast ? 'past-show' : 'future-show'}" data-show-id="${show.id}">
                    ${this.renderDateBlock(show.date)}
                    <div class="show-info">
                        <div class="show-header">
                            <h3 class="show-venue">${show.event || show.venue}</h3>
                            <p class="show-location">${show.location}</p>
                        </div>
                        ${this.renderBandsList(show.bands, false)}
                    </div>
                    ${this.renderTicketsButton(show, isPast)}
                </div>
            `;
        }
    },

    // Individual show with responsive layout
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

    // Tour poster with modal trigger
    renderTourPoster(tour, showsWithPosters) {
        if (!tour.poster) return '';

        const tourPosterIndex = showsWithPosters.findIndex(posterShow => posterShow.id === tour.id);

        return `
            <div class="tour-poster-preview" onclick="openPosterModal(${tourPosterIndex})">
                <img src="${tour.poster}" alt="${tour.name} poster" onerror="this.parentElement.style.display='none'">
                <div class="poster-overlay">
                    <span class="poster-zoom-icon">
                        <img src="assets/icons/zoom.svg" alt="Zoom" />
                    </span>
                </div>
            </div>
        `;
    },

    // Tour section with grouped shows
    renderTour(tour, isPast = false, showsWithPosters = []) {
        return `
            <div class="tour-section ${isPast ? 'past-show' : 'future-show'}">
                <div class="tour-header">
                    ${this.renderTourPoster(tour, showsWithPosters)}
                    <div class="tour-info">
                        <h4>${tour.name}</h4>
                        <p class="tour-dates">${tour.startDate.month} ${tour.startDate.day} - ${tour.endDate.month} ${tour.endDate.day}, ${tour.startDate.year}</p>
                    </div>
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

    // Render mixed items (shows and tours)
    renderMixedItems(items, isPast = false, showsWithPosters = []) {
        return items.map(item => {
            if (item.type === 'show') {
                return this.renderShow(item.data, isPast, showsWithPosters);
            } else if (item.type === 'tour') {
                return this.renderTour(item.data, isPast, showsWithPosters);
            }
            return '';
        }).join('');
    }
};
