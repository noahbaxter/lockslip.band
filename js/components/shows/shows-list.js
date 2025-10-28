// List View - Fallback view for shows without carousels/special layouts

const ShowsList = {
    renderUpcomingSection(futureItems, showsWithPosters) {
        if (futureItems.length === 0) return '';

        return `
            <div class="shows-section">
                <div class="shows-chronological">
                    ${ShowsCard.renderMixedItems(futureItems, false, showsWithPosters)}
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
                    <h3>PAST</h3>
                    <div class="shows-chronological past-shows">
                        ${ShowsCard.renderMixedItems(pastItems, true, showsWithPosters)}
                    </div>
                </div>
            </div>
        `;
    }
};
