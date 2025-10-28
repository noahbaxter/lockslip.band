// Upcoming Shows Carousel Component
const ShowsCarousel = {
    // State
    currentIndex: 0,
    timer: null,
    paused: false,
    shows: [],
    formatBands: null, // Callback to format band list

    // Initialize carousel with shows
    init(futureItems) {
        if (futureItems.length === 0) return;
        this.currentIndex = 0;
        this.start(futureItems.length);
    },

    // Start auto-play carousel with 5s cycle
    start(totalShows) {
        if (totalShows <= 1) return; // Don't auto-play single show

        // Clear any existing timer
        if (this.timer) clearInterval(this.timer);

        // Reset progress bar animation
        const progressBar = document.querySelector('.carousel-progress-fill');
        if (!progressBar) return; // No progress bar if only one show

        progressBar.style.animation = 'none';
        // Trigger reflow to restart animation
        void progressBar.offsetWidth;
        progressBar.style.animation = '';

        this.timer = setInterval(() => {
            if (!this.paused) {
                this.currentIndex = (this.currentIndex + 1) % totalShows;
                this.updateDisplay();

                // Restart progress animation
                if (progressBar) {
                    progressBar.style.animation = 'none';
                    void progressBar.offsetWidth;
                    progressBar.style.animation = '';
                }
            }
        }, 5000);
    },

    // Update carousel display (poster, rows, progress)
    updateDisplay() {
        if (this.currentIndex < this.shows.length) {
            const show = this.shows[this.currentIndex];

            // Update poster image
            const posterImg = document.querySelector('.carousel-poster img');
            if (posterImg && show.poster) {
                posterImg.src = show.poster;
            }

            // Highlight correct row
            const rows = document.querySelectorAll('.carousel-row');
            rows.forEach((row, index) => {
                row.classList.toggle('active', index === this.currentIndex);
            });

            // Update progress bar (only if not paused)
            if (!this.paused) {
                const progressBar = document.querySelector('.carousel-progress-fill');
                if (progressBar) {
                    progressBar.style.animation = 'none';
                    void progressBar.offsetWidth;
                    progressBar.style.animation = '';
                }
            }
        }
    },

    // Stop carousel
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    },

    // Pause carousel (on row hover)
    pause() {
        this.paused = true;

        // Stop the progress bar animation and reset to empty
        const progressBar = document.querySelector('.carousel-progress-fill');
        if (progressBar) {
            progressBar.style.animation = 'none';
            progressBar.style.width = '0%';
        }
    },

    // Resume carousel (on row leave)
    resume() {
        this.paused = false;
        // Restart the carousel timer
        if (this.shows && this.shows.length > 1) {
            this.start(this.shows.length);
        }
    },

    // Set carousel to specific show
    setShow(index) {
        this.currentIndex = index;
        this.updateDisplay();
    },

    // Open poster modal for current show
    openPosterModal() {
        if (this.currentIndex < this.shows.length) {
            const currentShow = this.shows[this.currentIndex];

            // Priority: tickets > modal
            if (currentShow.ticketsUrl) {
                window.open(currentShow.ticketsUrl, '_blank');
            } else if (window.showsWithPosters) {
                const posterIndex = window.showsWithPosters.findIndex(s => s.id === currentShow.id);
                if (posterIndex !== -1) {
                    openPosterModal(posterIndex);
                }
            }
        }
    },

    // Render carousel HTML
    render(futureItems, showsWithPosters = [], formatBandsFn = null) {
        if (futureItems.length === 0) {
            return '';
        }

        // Store format bands callback
        this.formatBands = formatBandsFn;

        // Extract all individual shows from future items, sorting within each tour by date
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const allShows = [];
        futureItems.forEach(item => {
            if (item.type === 'show') {
                allShows.push(item.data);
            } else if (item.type === 'tour') {
                // Determine if tour is past or future based on first show date
                const isTourPast = item.data.shows.length > 0 && new Date(item.data.shows[0].showDate) < today;
                // Sort tour shows: past shows descending (newest first), future shows ascending (earliest first)
                const sortedTourShows = [...item.data.shows].sort((a, b) => {
                    return isTourPast ? (b.showDate - a.showDate) : (a.showDate - b.showDate);
                });
                sortedTourShows.forEach(show => allShows.push(show));
            }
        });

        // Store for access by carousel controls
        this.shows = allShows;

        if (allShows.length === 0) {
            return '';
        }

        const firstShow = allShows[0];
        if (!firstShow.poster) return ''; // No carousel without poster

        // Build rows with ticket button
        const rows = allShows.map((show, index) => {
            const ticketButton = show.ticketsUrl ? `<a href="${show.ticketsUrl}" class="carousel-row-ticket" target="_blank" rel="noopener">TICKETS</a>` : '';

            // Find the poster index for this show
            const posterIndex = showsWithPosters.findIndex(s => s.id === show.id);

            // Determine click behavior: tickets > modal > carousel change
            let clickHandler;
            if (show.ticketsUrl) {
                clickHandler = `onclick="window.open('${show.ticketsUrl}', '_blank')"`;
            } else if (posterIndex !== -1) {
                clickHandler = `onclick="openPosterModal(${posterIndex})"`;
            } else {
                clickHandler = `onclick="ShowsCarousel.setShow(${index})"`;
            }

            const hoverHandler = `onmouseover="ShowsCarousel.setShow(${index})"`;
            const pauseHandler = `onmouseenter="ShowsCarousel.pause()" onmouseleave="ShowsCarousel.resume()"`;

            const bandsHtml = this.formatBands ? this.formatBands(show.bands) : '';

            return `
            <div class="carousel-row ${index === 0 ? 'active' : ''}" ${clickHandler} ${hoverHandler} ${pauseHandler}>
                <div class="carousel-row-date">
                    <span class="month">${show.date.month}</span>
                    <span class="day">${show.date.day}</span>
                </div>
                <div class="carousel-row-info">
                    <div class="venue">${show.event || show.venue}</div>
                    <div class="location">${show.location}</div>
                </div>
                <div class="carousel-row-bands">${bandsHtml}</div>
                ${ticketButton}
            </div>
        `;
        }).join('');

        // Only show progress bar if there are multiple shows
        const progressBar = allShows.length > 1 ? `
                <div class="carousel-progress">
                    <div class="carousel-progress-fill"></div>
                </div>
        ` : '';

        return `
            <div class="shows-section upcoming-section">
                <div class="upcoming-carousel">
                    <div class="carousel-poster" onclick="ShowsCarousel.openPosterModal()">
                        <img src="${firstShow.poster}" alt="Show poster" loading="lazy">
                    </div>
                    <div class="carousel-list">
                        ${rows}
                    </div>
                </div>
                ${progressBar}
            </div>
        `;
    }
};
