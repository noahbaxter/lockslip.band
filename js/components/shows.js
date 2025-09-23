// Shows Component
const ShowsComponent = {
    currentView: 'cards', // 'cards', 'grid', 'table'
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

    renderDateBlock(date, extraClasses = '') {
        return `
            <div class="show-date ${extraClasses}">
                <span class="month">${date.month}</span>
                <span class="day">${date.day}</span>
                <span class="year">${date.year}</span>
            </div>
        `;
    },

    renderTicketsButton(show, isPast) {
        if (isPast || !show.ticketsUrl) return '';
        return `
            <div class="show-actions">
                <a href="${show.ticketsUrl}" class="btn small" target="_blank" rel="noopener">TICKETS</a>
            </div>
        `;
    },

    renderBandsList(bands, showPoster = false) {
        if (!bands || bands.length === 0) return '';

        return `
            <div class="show-bands ${showPoster ? 'mobile-hidden' : ''}">
                <p class="bands-list">${this.formatBandsWithHighlight(bands)}</p>
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
                    <span class="poster-zoom-icon">
                        <img src="assets/icons/zoom.svg" alt="Zoom" />
                    </span>
                </div>
            </div>
        `;
    },

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
                    <span class="poster-zoom-icon">
                        <img src="assets/icons/zoom.svg" alt="Zoom" />
                    </span>
                </div>
            </div>
        `;
    },

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

        const allItems = [...futureItems, ...pastItems];

        let content;
        if (this.currentView === 'grid') {
            content = this.renderPosterGrid(futureItems, pastItems, showsWithPosters);
        } else if (this.currentView === 'table') {
            content = this.renderTableView(allItems, showsWithPosters);
        } else {
            // Default cards view
            content = `
                ${this.renderUpcomingSection(futureItems, showsWithPosters)}
                ${this.renderPastSection(pastItems, showsWithPosters)}
            `;
        }

        return `
            <div class="container">
                <h2>${shows.sectionTitle}</h2>
                ${this.renderViewToggle()}
                ${content}
                <p class="booking-info">${this.renderBookingInfo(shows, config)}</p>
            </div>
        `;
    },

    renderViewToggle() {
        return `
            <div class="shows-view-toggle">
                <button class="view-toggle-btn ${this.currentView === 'cards' ? 'active' : ''}" onclick="ShowsComponent.setView('cards')">Cards</button>
                <button class="view-toggle-btn ${this.currentView === 'grid' ? 'active' : ''}" onclick="ShowsComponent.setView('grid')">Posters</button>
                <button class="view-toggle-btn ${this.currentView === 'table' ? 'active' : ''}" onclick="ShowsComponent.setView('table')">Table</button>
            </div>
        `;
    },

    setView(view) {
        this.currentView = view;
        // Re-render the shows section
        const showsSection = document.getElementById('shows');
        if (showsSection) {
            // Get the data from the global state (this would need to be passed or stored)
            // For now, we'll trigger a re-render via a custom event
            window.dispatchEvent(new CustomEvent('showViewChanged', { detail: { view } }));
        }
    },

    renderPosterGrid(futureItems, pastItems, showsWithPosters = []) {
        // Use the same order as the modal carousel, but reversed (newest at top, oldest at bottom)
        // showsWithPosters is already sorted chronologically (oldest first), so reverse it
        const allShowsWithPosters = [...showsWithPosters].reverse();

        const gridItems = allShowsWithPosters.map((show, index) => {
            // Find the original index in the non-reversed array for the modal
            const posterIndex = showsWithPosters.findIndex(posterShow => posterShow.id === show.id);

            // For tours, use the tour's date info; for shows, use show date
            let isPast;
            if (show.isTourPoster) {
                // For tour posters, check if the entire tour is in the past
                isPast = show.tourEndDate ? show.tourEndDate < new Date() : show.showDate < new Date();
            } else {
                isPast = show.showDate < new Date();
            }

            const posterClass = isPast ? 'past-show' : 'future-show';

            return `
                <div class="poster-grid-item ${posterClass}" onclick="openPosterModal(${posterIndex})">
                    <img src="${show.poster}" alt="Show poster" loading="lazy">
                </div>
            `;
        }).join('');

        if (gridItems === '') {
            return '<p>No posters to display</p>';
        }

        return `<div class="poster-grid">${gridItems}</div>`;
    },


    renderTableView(allItems, showsWithPosters = []) {
        // Extract all individual shows from tours and individual items, sort newest to oldest
        const allShows = [];

        allItems.forEach(item => {
            if (item.type === 'show') {
                allShows.push(item.data);
            } else if (item.type === 'tour') {
                // Add all shows from the tour
                item.data.shows.forEach(show => allShows.push(show));
            }
        });

        // Sort by date (newest first)
        allShows.sort((a, b) => b.showDate - a.showDate);

        if (allShows.length === 0) {
            return '<p>No shows to display</p>';
        }

        const tableRows = allShows.map(show => {
            const isPast = show.showDate < new Date();
            const rowClass = isPast ? 'past-show' : 'future-show';
            const fullBandsText = this.formatBandsWithHighlight(show.bands);
            // Truncate bands text for mobile - show first 300 characters with ellipsis
            const bandsText = fullBandsText.length > 300 ?
                fullBandsText.substring(0, 300) + '...' : fullBandsText;

            // Find the poster modal index for this show
            const posterIndex = showsWithPosters.findIndex(posterShow => posterShow.id === show.id);
            const hasModal = posterIndex !== -1;

            const hasTickets = show.ticketsUrl && !isPast;
            const ticketsButton = hasTickets ? `<a href="${show.ticketsUrl}" target="_blank" class="inline-tickets-btn" onclick="event.stopPropagation()">Tickets</a>` : '';

            return `
                <tr class="show-table-row ${rowClass} ${hasModal ? 'has-poster' : ''}" ${hasModal ? `onclick="openPosterModal(${posterIndex})"` : ''}>
                    <td class="show-date-cell">
                        <div class="table-date">
                            <span class="month">${show.date.month}</span>
                            <span class="day">${show.date.day}</span>
                            <span class="year">${show.date.year}</span>
                        </div>
                    </td>
                    <td class="show-venue-cell">
                        <div class="venue">${show.event || show.venue}</div>
                        <div class="location">${show.location}</div>
                    </td>
                    <td class="show-bands-cell">
                        <div class="bands-content">
                            <span class="bands-text">${bandsText}</span>
                            ${ticketsButton}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="shows-table-container">
                <table class="shows-table">
                    <thead>
                        <tr class="table-header">
                            <th>Date</th>
                            <th>Venue</th>
                            <th>Lineup</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    }
};