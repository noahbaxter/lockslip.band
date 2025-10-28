// Poster Grid View - Display shows as a grid of poster images

const ShowsPosterGrid = {
    renderPosterGrid(pastItems, showsWithPosters = []) {
        // Extract all show IDs from pastItems (shows and shows within tours)
        const pastShowIds = new Set();
        pastItems.forEach(item => {
            if (item.type === 'show') {
                pastShowIds.add(item.data.id);
            } else if (item.type === 'tour') {
                // Add tour poster ID and all show IDs within the tour
                pastShowIds.add(item.data.id);
                if (item.data.shows) {
                    item.data.shows.forEach(show => pastShowIds.add(show.id));
                }
            }
        });

        // Filter showsWithPosters to only include past shows
        const pastShowsWithPosters = showsWithPosters.filter(show => pastShowIds.has(show.id));

        // Reverse to show newest first
        const allShowsWithPosters = [...pastShowsWithPosters].reverse();

        const gridItems = allShowsWithPosters.map((show) => {
            // Find the original index in the non-reversed array for the modal
            const posterIndex = showsWithPosters.findIndex(posterShow => posterShow.id === show.id);

            return `
                <div class="poster-grid-item past-show" onclick="openPosterModal(${posterIndex})">
                    <img src="${show.poster}" alt="Show poster" loading="lazy">
                </div>
            `;
        }).join('');

        if (gridItems === '') {
            return '<p>No posters to display</p>';
        }

        return `<div class="poster-grid">${gridItems}</div>`;
    }
};
