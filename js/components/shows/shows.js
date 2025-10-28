// Shows Component - Main orchestrator for all show views
const ShowsComponent = {
    currentView: 'grid', // 'grid', 'table' - default to poster view
    pastShowsView: 'grid', // 'grid' or 'table' for past shows section

    renderBookingInfo(shows, config) {
        return shows.bookingInfo.replace(
            'lockslipband@gmail.com',
            `<a href="mailto:${config.contact.booking}">${config.contact.booking}</a>`
        );
    },

    render(shows, config, futureItems = [], pastItems = [], showsWithPosters = []) {
        if (!shows) return '';

        // Render upcoming shows as carousel and past shows based on view type
        const upcomingContent = this.renderUpcoming(futureItems, showsWithPosters);
        let pastContent = '';

        if (this.pastShowsView === 'table') {
            pastContent = ShowsTable.renderPastTableView(pastItems, showsWithPosters);
        } else {
            // Poster grid with view toggle
            if (pastItems.length > 0) {
                pastContent = `
                    <div class="shows-section past-shows-section">
                        <h3>PAST</h3>
                        ${ShowsTable.renderPastViewToggle()}
                        ${ShowsPosterGrid.renderPosterGrid(pastItems, showsWithPosters)}
                    </div>
                `;
            }
        }

        const html = `
            <div class="container">
                <h2>${shows.sectionTitle}</h2>
                ${upcomingContent}
                ${pastContent}
                <p class="booking-info">${this.renderBookingInfo(shows, config)}</p>
            </div>
        `;

        // Initialize carousel after render
        setTimeout(() => ShowsCarousel.init(futureItems), 100);

        return html;
    },

    renderUpcoming(futureItems, showsWithPosters = []) {
        // Delegate to ShowsCarousel component
        return ShowsCarousel.render(futureItems, showsWithPosters, ShowsCard.formatBandsWithHighlight.bind(ShowsCard));
    },

    // Set past shows view (grid or table)
    setPastView(view) {
        this.pastShowsView = view;
        ShowsTable.pastShowsView = view;
        // Trigger re-render via custom event
        window.dispatchEvent(new CustomEvent('showViewChanged', { detail: { view } }));
    }
};
