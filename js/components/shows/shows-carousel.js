// Upcoming Shows Carousel Component
const ShowsCarousel = {
    // State
    currentIndex: 0,
    timer: null,
    paused: false,
    shows: [],          // ordered slides: shows + tour headers
    formatBands: null,  // Callback to format band list

    // Initialize carousel with shows
    init(futureItems) {
        if (!this.shows || this.shows.length === 0) return;
        this.currentIndex = 0;
        this.setupScrollbar();
        this.setupVisibilityObserver();
    },

    // Only auto-advance while the carousel is on screen, so the first time a
    // user sees it they land on show #1, not a random one based on elapsed time.
    setupVisibilityObserver() {
        const el = document.querySelector('.upcoming-carousel');
        if (!el) return;
        if (typeof IntersectionObserver === 'undefined') {
            this.start(this.shows.length);
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    if (!this.timer) this.start(this.shows.length);
                } else {
                    this.stop();
                    const progressBar = document.querySelector('.carousel-progress-fill');
                    if (progressBar) {
                        progressBar.style.animation = 'none';
                        progressBar.style.width = '0%';
                    }
                }
            });
        }, { threshold: 0.35 });
        observer.observe(el);
    },

    // Wire the custom scroll indicator to the list's scroll position
    setupScrollbar() {
        const list = document.querySelector('.carousel-list');
        if (!list) return;
        list.addEventListener('scroll', () => this.updateScrollbar());
        window.addEventListener('resize', () => this.updateScrollbar());
        this.updateScrollbar();
    },

    // Size and position the indicator thumb to mirror the scroll position
    updateScrollbar() {
        const list = document.querySelector('.carousel-list');
        const track = document.querySelector('.carousel-scrollbar');
        const thumb = document.querySelector('.carousel-scrollbar-thumb');
        if (!list || !track || !thumb) return;

        const ratio = list.clientHeight / list.scrollHeight;
        if (ratio >= 1) {
            // Nothing to scroll: hide the indicator entirely
            track.style.display = 'none';
            return;
        }
        track.style.display = '';

        const trackH = track.clientHeight;
        const thumbH = Math.max(trackH * ratio, 24);
        const maxScroll = list.scrollHeight - list.clientHeight;
        const maxThumbTop = trackH - thumbH;
        const top = maxScroll > 0 ? (list.scrollTop / maxScroll) * maxThumbTop : 0;
        thumb.style.height = `${thumbH}px`;
        thumb.style.top = `${top}px`;
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
        if (this.currentIndex >= this.shows.length) return;

        const slide = this.shows[this.currentIndex];

        // Swap the big pane. For poster->poster changes, mutate the existing <img> src
        // instead of replacing the markup — recreating the node forces a reload and a
        // visible flicker. Only rebuild when switching to/from the fallback card.
        const poster = document.querySelector('.carousel-poster');
        if (poster) {
            const img = poster.querySelector('img');
            if (slide.poster && img) {
                if (img.getAttribute('src') !== slide.poster) img.src = slide.poster;
            } else {
                poster.innerHTML = this.bigPaneHtml(slide);
            }
        }

        // Highlight correct row
        const rows = document.querySelectorAll('.carousel-row');
        rows.forEach((row, index) => {
            row.classList.toggle('active', index === this.currentIndex);
        });

        // Keep the highlighted row in view: scroll the list (not the page) only
        // when the active row sits above or below the visible area.
        const list = document.querySelector('.carousel-list');
        const activeRow = rows[this.currentIndex];
        if (list && activeRow) {
            const listRect = list.getBoundingClientRect();
            const rowRect = activeRow.getBoundingClientRect();
            let delta = 0;
            if (rowRect.top < listRect.top) {
                delta = rowRect.top - listRect.top;
            } else if (rowRect.bottom > listRect.bottom) {
                delta = rowRect.bottom - listRect.bottom;
            }
            if (delta !== 0) list.scrollBy({ top: delta, behavior: 'smooth' });
        }

        // Update progress bar (only if not paused)
        if (!this.paused) {
            const progressBar = document.querySelector('.carousel-progress-fill');
            if (progressBar) {
                progressBar.style.animation = 'none';
                void progressBar.offsetWidth;
                progressBar.style.animation = '';
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
        if (index === this.currentIndex) return; // no-op repeats (hover fires per child) cause flicker
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

    // Band list with optional "+ more TBA" note
    bandsWithTba(show) {
        let html = this.formatBands ? this.formatBands(show.bands) : '';
        if (show.moreBandsTba) html += ' <span class="tba-note">+ more TBA</span>';
        return html;
    },

    // Data used to render the poster-less fallback card
    fallbackData(show) {
        return {
            month: show.date.month,
            day: show.date.day,
            venue: show.event || show.venue,
            location: show.location,
            bandsHtml: this.bandsWithTba(show)
        };
    },

    // Big pane markup: poster image, or a styled fallback card
    bigPaneHtml(slide) {
        if (slide.poster) {
            return `<img src="${slide.poster}" alt="Show poster" loading="lazy">`;
        }
        const f = slide.fallback;
        return `
            <div class="carousel-poster-fallback">
                <span class="cpf-month">${f.month}</span>
                <span class="cpf-day">${f.day}</span>
                <span class="cpf-venue">${f.venue}</span>
                <span class="cpf-location">${f.location}</span>
                <span class="cpf-rule"></span>
                <span class="cpf-bands">${f.bandsHtml}</span>
                <span class="cpf-note">Poster TBA</span>
            </div>`;
    },

    // A single show row
    renderRow(show, index, showsWithPosters, isSub) {
        const ticketButton = show.ticketsUrl
            ? `<a href="${show.ticketsUrl}" class="carousel-row-ticket" target="_blank" rel="noopener" onclick="event.stopPropagation()">TICKETS</a>`
            : '';

        const posterIndex = showsWithPosters.findIndex(s => s.id === show.id);

        // Click: tickets > poster modal > select in carousel
        let clickHandler;
        if (show.ticketsUrl) {
            clickHandler = `onclick="window.open('${show.ticketsUrl}', '_blank')"`;
        } else if (posterIndex !== -1) {
            clickHandler = `onclick="openPosterModal(${posterIndex})"`;
        } else {
            clickHandler = `onclick="ShowsCarousel.setShow(${index})"`;
        }

        return `
            <div class="carousel-row ${index === 0 ? 'active' : ''} ${isSub ? 'tour-subrow' : ''}" ${clickHandler}
                 onmouseover="ShowsCarousel.setShow(${index})"
                 onmouseenter="ShowsCarousel.pause()" onmouseleave="ShowsCarousel.resume()">
                <div class="carousel-row-date">
                    <span class="month">${show.date.month}</span>
                    <span class="day">${show.date.day}</span>
                </div>
                <div class="carousel-row-info">
                    <div class="venue">${show.event || show.venue}</div>
                    <div class="location">${show.location}</div>
                </div>
                <div class="carousel-row-bands">${this.bandsWithTba(show)}</div>
                ${ticketButton}
            </div>`;
    },

    // A tour header row (drives the tour poster)
    renderTourHeader(tour, index, count, dates, showsWithPosters) {
        const posterIndex = showsWithPosters.findIndex(s => s.id === tour.id);
        const clickHandler = posterIndex !== -1
            ? `onclick="openPosterModal(${posterIndex})"`
            : `onclick="ShowsCarousel.setShow(${index})"`;

        return `
            <div class="carousel-row carousel-tour-header ${index === 0 ? 'active' : ''}" ${clickHandler}
                 onmouseover="ShowsCarousel.setShow(${index})"
                 onmouseenter="ShowsCarousel.pause()" onmouseleave="ShowsCarousel.resume()">
                <span class="tour-header-name">${tour.name}</span>
                <span class="tour-header-meta">${dates} · <span class="n">${count} shows</span></span>
            </div>`;
    },

    // Render carousel HTML
    render(futureItems, showsWithPosters = [], formatBandsFn = null) {
        if (!futureItems || futureItems.length === 0) return '';

        this.formatBands = formatBandsFn;

        const slides = [];
        let listHtml = '';

        // Push a show slide and return its row markup
        const addShow = (show, isSub) => {
            const index = slides.length;
            slides.push({
                id: show.id,
                poster: show.poster || null,
                ticketsUrl: show.ticketsUrl || null,
                fallback: this.fallbackData(show)
            });
            return this.renderRow(show, index, showsWithPosters, isSub);
        };

        futureItems.forEach(item => {
            if (item.type === 'show') {
                listHtml += addShow(item.data, false);
            } else if (item.type === 'tour') {
                const tour = item.data;
                const tourShows = [...tour.shows].sort((a, b) => a.showDate - b.showDate);
                const dates = `${tour.startDate.month} ${tour.startDate.day} – ${tour.endDate.month} ${tour.endDate.day}`;

                // Tour header slide shows the tour poster
                const headerIndex = slides.length;
                slides.push({
                    id: tour.id,
                    poster: tour.poster || null,
                    ticketsUrl: null,
                    fallback: { month: tour.startDate.month, day: tour.startDate.day, venue: tour.name, location: dates, bandsHtml: `${tourShows.length} shows` }
                });

                let subRows = '';
                tourShows.forEach(show => { subRows += addShow(show, true); });

                listHtml += `<div class="tour-group">${this.renderTourHeader(tour, headerIndex, tourShows.length, dates, showsWithPosters)}${subRows}</div>`;
            }
        });

        if (slides.length === 0) return '';

        // Store for access by carousel controls
        this.shows = slides;

        // Only show progress bar if there are multiple slides
        const progressBar = slides.length > 1 ? `
                <div class="carousel-progress">
                    <div class="carousel-progress-fill"></div>
                </div>
        ` : '';

        return `
            <div class="shows-section upcoming-section">
                <div class="upcoming-carousel">
                    <div class="carousel-poster" onclick="ShowsCarousel.openPosterModal()">
                        ${this.bigPaneHtml(slides[0])}
                    </div>
                    <div class="carousel-list-wrap">
                        <div class="carousel-list">
                            ${listHtml}
                        </div>
                        <div class="carousel-scrollbar">
                            <div class="carousel-scrollbar-thumb"></div>
                        </div>
                    </div>
                </div>
                ${progressBar}
            </div>
        `;
    }
};
