// Poster Grid View - Display shows as a grid of poster images

const ShowsPosterGrid = {
    // Tour posters carry a date range instead of a single date.
    getYear(show) {
        return show.isTourPoster ? show.startDate.year : show.date.year;
    },

    // Read out in the year rule on hover, so nothing covers the poster art. No
    // year here: the label alongside it carries that. The modal stays the full
    // detail view.
    getCaption(show) {
        if (show.isTourPoster) {
            return {
                date: `${show.startDate.month} ${show.startDate.day} - ${show.endDate.month} ${show.endDate.day}`,
                place: show.name,
            };
        }
        return {
            date: `${show.date.month} ${show.date.day}`,
            place: show.location,
        };
    },

    // Posters are lazy, so most land long after this runs. Catch the ones
    // already decoded and wait on the rest.
    init() {
        document.querySelectorAll('.poster-grid-item img').forEach((img) => {
            if (img.complete) this.setRatio(img);
            else img.addEventListener('load', () => this.setRatio(img), { once: true });
        });
    },

    // The hover popout sheds the crop by growing to the poster's own ratio, and
    // nothing in shows.json carries it. Only source is the decoded file.
    setRatio(img) {
        if (!img.naturalWidth || !img.naturalHeight) return;
        const item = img.closest('.poster-grid-item');
        if (item) item.style.setProperty('--poster-ar', img.naturalWidth / img.naturalHeight);
    },

    renderItem(show, posterIndex) {
        const { date, place } = this.getCaption(show);
        return `
            <div class="poster-grid-item past-show" data-year="${this.getYear(show)}"
                 data-date="${date}" data-place="${place}"
                 onclick="openPosterModal(${posterIndex})">
                <div class="poster-grid-thumb">
                    <img src="${show.poster}" alt="Show poster" loading="lazy">
                </div>
            </div>
        `;
    },

    renderRail() {
        return `
            <div class="poster-grid-rail">
                <div class="poster-rail-track-down">
                    <button type="button" class="poster-nav-btn" data-dir="down" aria-label="Jump to oldest past show">&darr;</button>
                </div>
            </div>
        `;
    },

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

        if (allShowsWithPosters.length === 0) {
            return '<p>No posters to display</p>';
        }

        // One flat grid with no separators of any kind, so rows stay packed
        // across year boundaries. Each poster just carries its year for the
        // floating readout to pick up.
        const items = allShowsWithPosters.map((show) => {
            // Find the original index in the non-reversed array for the modal
            const posterIndex = showsWithPosters.findIndex(posterShow => posterShow.id === show.id);
            return this.renderItem(show, posterIndex);
        }).join('');

        const firstYear = this.getYear(allShowsWithPosters[0]);

        return `
            <div class="poster-grid-wrap">
                ${this.renderRail()}
                <div class="poster-year-track">
                    <div class="poster-year-indicator">
                        <span class="poster-year-label">${firstYear}</span>
                        <span class="poster-year-detail"></span>
                        <i class="poster-year-rule"></i>
                        <button type="button" class="poster-nav-btn" data-dir="up" aria-label="Jump to newest past show">&uarr;</button>
                    </div>
                </div>
                <div class="poster-year-head"></div>
                <div class="poster-grid">${items}</div>
            </div>
        `;
    }
};
