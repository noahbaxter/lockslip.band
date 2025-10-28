// Poster Modal - Uses generic Modal component with poster-specific rendering
const posterModal = new Modal({
    modalId: 'posterModal',
    classPrefix: 'poster-modal',

    getAlt: (show) => {
        if (show.isTourPoster) {
            return `${show.name} tour poster`;
        }
        const displayName = show.event || show.venue;
        return `${displayName} - ${show.location}`;
    },

    renderInfo: (show, modal) => {
        let html = '';

        // Handle tour posters
        if (show.isTourPoster) {
            html += `<h3 class="poster-modal-venue">${show.name}</h3>`;
            html += `<p class="poster-modal-date">${show.startDate.month} ${show.startDate.day} - ${show.endDate.month} ${show.endDate.day}, ${show.startDate.year}</p>`;
        } else {
            // Regular show
            const displayName = show.event || show.venue;
            html += `<h3 class="poster-modal-venue">${displayName}</h3>`;
            html += `<p class="poster-modal-location">${show.location}</p>`;
            html += `<p class="poster-modal-date">${show.date.month} ${show.date.day}, ${show.date.year}</p>`;

            // Bands
            if (show.bands && show.bands.length > 0) {
                const displayBands = ShowsComponent.getBandList(show.bands);
                const bandsHtml = displayBands.map(band =>
                    band === 'Lockslip' ? `<span class="lockslip-highlight">${band}</span>` : band
                ).join(', ');
                html += `<p class="poster-modal-bands">${bandsHtml}</p>`;
            }

            // Tickets button
            const isPast = show.showDate < new Date();
            if (!isPast && show.ticketsUrl && !show.isTourPoster) {
                html += `<div class="poster-modal-tickets"><a href="${show.ticketsUrl}" class="poster-modal-tickets-btn" target="_blank" rel="noopener">TICKETS</a></div>`;
            }
        }

        // Counter
        const counterText = posterModal.config.calculateCounter(modal.currentIndex, modal.data.length, modal);
        html += `<p class="poster-modal-counter">${counterText}</p>`;

        return html;
    },

    calculateCounter: (currentIndex, totalLength, modal) => {
        // Count total actual shows (exclude tour posters)
        const totalShows = modal.data.filter(item => !item.isTourPoster).length;

        const show = modal.data[currentIndex];

        if (show.isTourPoster) {
            // Find which actual show positions this tour represents
            let showPosition = 1;
            let tourStartPosition = null;
            let tourEndPosition = null;

            for (let i = 0; i < modal.data.length; i++) {
                const item = modal.data[i];
                if (!item.isTourPoster) {
                    // This is an actual show
                    const isInTour = show.shows && show.shows.some(tourShow => {
                        const tourShowId = typeof tourShow === 'string' ? tourShow : tourShow.id;
                        return tourShowId === item.id;
                    });
                    if (isInTour) {
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
            for (let i = 0; i < currentIndex; i++) {
                if (!modal.data[i].isTourPoster) {
                    showPosition++;
                }
            }
            return `${showPosition} of ${totalShows}`;
        }
    }
});

// Legacy global functions for backwards compatibility
window.openPosterModal = (index) => posterModal.open(index);
window.closePosterModal = () => posterModal.close();
window.navigatePoster = (direction) => posterModal.navigate(direction);
