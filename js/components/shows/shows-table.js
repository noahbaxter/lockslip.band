// Table View - Display shows as an organized table

const ShowsTable = {
    pastShowsView: 'grid', // Past shows view toggle state

    // Helper: safely get timestamp from date (handles Date objects and strings)
    getTimestamp(date) {
        if (date instanceof Date) {
            return date.getTime();
        }
        return new Date(date).getTime();
    },

    // Helper: truncate bands text
    truncateBands(bandsHtml, maxLength = 300) {
        return bandsHtml.length > maxLength ? bandsHtml.substring(0, maxLength) + '...' : bandsHtml;
    },

    // Helper: render a table row for any show
    renderTableRow(show, showsWithPosters, isPast, rowClass = '') {
        const fullBandsText = ShowsCard.formatBandsWithHighlight(show.bands);
        const bandsText = this.truncateBands(fullBandsText);
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
    },

    renderPastViewToggle() {
        return `
            <div class="shows-view-toggle">
                <button class="view-toggle-btn ${this.pastShowsView === 'grid' ? 'active' : ''}" onclick="ShowsComponent.setPastView('grid')">Posters</button>
                <button class="view-toggle-btn ${this.pastShowsView === 'table' ? 'active' : ''}" onclick="ShowsComponent.setPastView('table')">Table</button>
            </div>
        `;
    },

    renderPastTableView(pastItems, showsWithPosters = []) {
        // Extract all shows from past items (shows and tours)
        const allPastShows = [];
        pastItems.forEach(item => {
            if (item.type === 'show') {
                allPastShows.push(item.data);
            } else if (item.type === 'tour') {
                // Sort tour shows descending (newest first) for past shows by date
                const sortedTourShows = [...item.data.shows].sort((a, b) =>
                    this.getTimestamp(b.showDate) - this.getTimestamp(a.showDate)
                );
                sortedTourShows.forEach(show => allPastShows.push(show));
            }
        });

        if (allPastShows.length === 0) {
            return '';
        }

        const tableRows = allPastShows.map(show =>
            this.renderTableRow(show, showsWithPosters, true, 'past-show')
        ).join('');

        return `
            <div class="shows-section past-shows-section">
                <h3>PAST</h3>
                ${this.renderPastViewToggle()}
                <div class="shows-table-container">
                    <table class="shows-table">
                        <tr class="table-header">
                            <th class="date-header">Date</th>
                            <th class="venue-header">Venue</th>
                            <th class="bands-header">Lineup</th>
                        </tr>
                        ${tableRows}
                    </table>
                </div>
            </div>
        `;
    },

    renderFullTable(allItems, showsWithPosters = []) {
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
        allShows.sort((a, b) =>
            this.getTimestamp(b.showDate) - this.getTimestamp(a.showDate)
        );

        if (allShows.length === 0) {
            return '<p>No shows to display</p>';
        }

        const tableRows = allShows.map(show => {
            const isPast = this.getTimestamp(show.showDate) < new Date().getTime();
            const rowClass = isPast ? 'past-show' : 'future-show';
            return this.renderTableRow(show, showsWithPosters, isPast, rowClass);
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
