// Releases Component
const ReleasesComponent = {
    renderTrackListing(tracks) {
        if (!tracks || tracks.length === 0) return '';
        
        return `
            <div class="track-listing">
                <ul>
                    ${tracks.map(track => `<li>${track}</li>`).join('')}
                </ul>
            </div>
        `;
    },

    renderStreamingLinks(streamingLinks) {
        if (!streamingLinks) return '';
        
        return Object.entries(streamingLinks)
            .map(([platform, url]) => PlatformIcons.renderStreamingIcon(platform, url))
            .join('');
    },

    // Self-hosted player when the release lists tracks, Bandcamp iframe otherwise.
    // Tracks without a baseUrl or file still render, just not playable, the way
    // Bandcamp lists a record before it is out.
    // Lyrics for released records ship in content/lyrics.json. Unreleased ones come
    // from the private octopus submodule, so nothing unpublished is in this repo.
    lyrics: {},

    lyricsFor(releaseId) {
        return this.lyrics[releaseId];
    },

    showLyrics(release, trackIndex) {
        const panel = document.querySelector(`.release-lyrics[data-lyrics-for="${release.id}"]`);
        if (!panel) return;
        const content = panel.parentElement;
        const description = content.querySelector('.release-description');

        // Lyrics take over the whole column, title and streaming row included,
        // so a verse gets the height instead of sharing it with the header.
        if (trackIndex === null) {
            panel.hidden = true;
            content.classList.remove('is-lyrics');
            if (description) description.hidden = false;
            this.fitDescriptions();
            return;
        }

        const set = this.lyricsFor(release.id) || {};
        const track = release.audio.tracks[trackIndex];
        const num = String(track.num);
        const body = (set.tracks || {})[num];
        const instrumental = (set.instrumental || []).includes(track.num);

        panel.textContent = '';
        const head = document.createElement('div');
        head.className = 'release-lyrics-title';
        head.textContent = track.name;
        panel.appendChild(head);

        const text = document.createElement('div');
        text.className = 'release-lyrics-body';
        if (body) text.textContent = body;
        else if (instrumental) { text.classList.add('is-empty'); text.textContent = 'Instrumental'; }
        else { text.classList.add('is-empty'); text.textContent = 'Lyrics not available yet'; }
        panel.appendChild(text);

        panel.hidden = false;
        content.classList.add('is-lyrics');
        if (description) description.hidden = true;
    },

    renderPlayer(release) {
        if (release.audio && release.audio.tracks && release.audio.tracks.length) {
            AudioPlayer.register(release.id, {
                baseUrl: release.audio.baseUrl,
                version: release.audio.version,
                tracks: release.audio.tracks,
                coverImage: release.coverImage,
                releaseTitle: release.title,
                unavailableNote: release.audio.unavailableNote,
                // One cover per modal. Paging between unrelated records is not
                // navigation anyone asked for.
                onLyrics: !this.lyricsFor(release.id) ? null
                    : (trackIndex) => this.showLyrics(release, trackIndex),
                onArtClick: !release.coverImage ? null : () => {
                    artworkModal.setData([{
                        image: release.coverImage,
                        title: release.title,
                        year: release.year,
                        credit: (release.artwork || {}).credit,
                        creditUrl: (release.artwork || {}).creditUrl
                    }]);
                    artworkModal.open(0);
                }
            });
            return `<div class="release-player flex-center">${AudioPlayer.mount(release.id)}</div>`;
        }
        return this.renderBandcampEmbed(release.bandcampEmbed);
    },

    renderBandcampEmbed(embedUrl) {
        if (!embedUrl) return '';

        return `
            <div class="bandcamp-embed-artwork flex-center">
                <iframe style="border: 0; width: 350px; height: 588px;"
                        src="${embedUrl}"
                        seamless>
                </iframe>
            </div>
        `;
    },

    // Two kinds of tile. A vendor sells the record, so it gets its logo and a link.
    // A format the band is putting out gets a photo of the thing itself, and until
    // there is somewhere to buy it, no link.
    renderPhysicalLinks(physicalLinks) {
        if (!physicalLinks) return '';

        const list = Object.values(physicalLinks);
        const products = list.some(l => l.image);

        // Two labels pressed the same record, so the photo alone does not say
        // which tile is which. The label's mark rides in the corner of the shot
        // when there is one.
        const tile = link => (link.image
            ? `<span class="physical-link-shot">
                    <img class="physical-link-photo" src="${link.image}" alt="${link.name}"
                         onerror="this.style.display='none'">
                    ${link.icon ? `<img class="physical-link-label" src="${link.icon}" alt="${link.name}" onerror="this.style.display='none'">` : ''}
               </span>`
            : `<img src="${link.icon}" alt="${link.name}" onerror="this.style.display='none'">`
        ) + `
            <div class="physical-link-text">
                <span class="physical-link-name">${link.name}</span>
                <span class="physical-link-format">${link.format}</span>
            </div>
        `;

        // One note for the section rather than a stripe of them, since a record
        // reaches the shops all at once.
        const soon = list.every(link => !link.url);

        return `
            <div class="physical-links-content">
                ${soon ? '<div class="physical-links-note">Coming soon</div>' : ''}
                <div class="physical-links-grid${products ? ' is-products' : ' flex-center'}">
                    ${list.map(link => link.url
                        ? `<a href="${link.url}" target="_blank" rel="noopener" class="physical-link">${tile(link)}</a>`
                        : `<div class="physical-link is-pending">${tile(link)}</div>`
                    ).join('')}
                </div>
            </div>
        `;
    },

    // Bandcamp's own wording for a record that isn't out yet.
    renderDate(release) {
        if (!release.year) return '';
        const date = `${release.month} ${release.day}, ${release.year}`;
        const when = new Date(`${release.month} ${release.day}, ${release.year}`);
        const upcoming = !isNaN(when) && when > new Date();
        return `<span class="release-date${upcoming ? ' is-upcoming' : ''}">${date}` +
               (upcoming ? '<span class="release-date-label">Coming soon</span>' : '') +
               `</span>`;
    },

    // "Gray World" where the blurb names the track is a switch: it drains the
    // site to the record's grey and back. Nothing announces it, so it reads as
    // the track's name until someone tries it.
    renderDescription(text) {
        return text.replace('"Gray World"',
            '"<button type="button" class="accent-switch" aria-pressed="false">Gray World</button>"');
    },

    renderRelease(release) {
        return `
            <div class="release-item" data-release-id="${release.id}" role="tabpanel">
                <div class="release-artwork">
                    ${this.renderPlayer(release)}
                </div>
                <div class="release-content">
                    <div class="release-header">
                        <h4>${release.title}</h4>
                        ${this.renderDate(release)}
                    </div>
                    <div class="content-streaming-links">
                        ${this.renderStreamingLinks(release.streamingLinks)}
                    </div>
                    ${release.description ? `<p class="release-description">${this.renderDescription(release.description)}</p>` : ''}
                    <div class="release-lyrics" data-lyrics-for="${release.id}" hidden></div>
                    ${this.renderPhysicalLinks(release.physicalLinks)}
                </div>
            </div>
        `;
    },

    // One release is shown at a time. With an 11-track record open, stacking them
    // buries anything below it, so the switcher is navigation rather than decoration.
    renderSwitcher(list) {
        if (list.length < 2) return '';
        return `
            <div class="release-switcher">
              <div class="release-tabs" role="tablist" aria-label="Releases">
                ${list.map((r, i) => `
                    <button class="release-tab${i === 0 ? ' is-active' : ''}"
                            type="button" role="tab"
                            aria-selected="${i === 0}"
                            data-target="${r.id}">
                        <span class="release-tab-title">${r.title}</span>
                        ${r.year ? `<span class="release-tab-year">${r.year}</span>`
                                 : `<span class="release-tab-year">Out soon</span>`}
                    </button>
                `).join('')}
              </div>
            </div>
        `;
    },

    // The player sets the row height, and the content column is capped to it so a
    // long blurb or an open lyrics panel can never grow the card. What does not
    // fit scrolls inside the description; nothing gets scaled down to make it fit.
    fitDescriptions() {
        // Single column on mobile, where the card is free to be any height. Must
        // match the breakpoint in releases.css or the cap is applied to a layout
        // that is no longer side by side.
        const stacked = window.matchMedia('(max-width: 768px)').matches;

        document.querySelectorAll('.release-item').forEach(item => {
            const player = item.querySelector('.audio-player');
            const content = item.querySelector('.release-content');
            if (!player || !content) return;

            content.style.maxHeight = '';
            this.syncHeader(item);
            // Hidden panels measure as zero, so there is nothing to fit against.
            const target = player.getBoundingClientRect().height;
            if (!target || stacked) return;

            // Hard cap beside the player. Anything inside that wants more room,
            // the description and the lyrics box, scrolls instead of pushing the card.
            content.style.maxHeight = target + 'px';
        });
    },

    // Once the date drops under the title the header is already two lines deep,
    // and a third row of icons under that is more masthead than the column can
    // spare, so the streaming row goes. Hiding it cannot unwrap the header, so
    // there is nothing here to oscillate.
    syncHeader(item) {
        const content = item.querySelector('.release-content');
        const title = item.querySelector('.release-header h4');
        const date = item.querySelector('.release-date');
        if (!content || !title || !date) return;

        // Stacked, the header is a column, so the date is always under the title.
        const stacked = window.matchMedia('(max-width: 768px)').matches;
        const wrapped = !stacked &&
            date.getBoundingClientRect().top > title.getBoundingClientRect().top + 1;
        content.classList.toggle('is-header-wrapped', wrapped);
    },

    // Driven by the header's own size rather than the debounced resize pass, so
    // the icons go the frame the date wraps instead of a tenth of a second later.
    watchHeaders() {
        if (this._headers) this._headers.disconnect();
        this._headers = new ResizeObserver(entries => {
            entries.forEach(entry => {
                const item = entry.target.closest('.release-item');
                if (item) this.syncHeader(item);
            });
        });
        document.querySelectorAll('.release-header').forEach(el => this._headers.observe(el));
    },

    watchDescriptions() {
        if (this._fitBound) return;
        this._fitBound = true;
        let queued;
        window.addEventListener('resize', () => {
            clearTimeout(queued);
            queued = setTimeout(() => this.fitDescriptions(), 100);
        });
    },

    setAccent(id) {
        if (window.ACCENT_PIN) return;
        document.documentElement.dataset.accent = id;
    },

    // Whether gray world was clicked, as opposed to merely hovered. The accent
    // follows the pointer; this is what decides where it lands when it leaves.
    greyHeld: false,

    holdGrey(on) {
        this.greyHeld = on;
        document.querySelectorAll('.accent-switch')
            .forEach(sw => sw.setAttribute('aria-pressed', String(on)));
    },

    initSwitcher() {
        const tabs = document.querySelectorAll('.release-tab');
        if (!tabs.length) return;
        const items = document.querySelectorAll('.release-item');

        const show = id => {
            tabs.forEach(t => {
                const on = t.dataset.target === id;
                t.classList.toggle('is-active', on);
                t.setAttribute('aria-selected', String(on));
            });
            items.forEach(el => { el.hidden = el.dataset.releaseId !== id; });

            // Hands the page over to the record's accent (see variables.css) and
            // remembers it, so a return visit opens where you left off. Changing
            // record also drops gray world, which no record owns.
            try { localStorage.setItem('accent-release', id); } catch (e) {}
            this.holdGrey(false);
            this.setAccent(id);
        };

        // The URL follows the open record, and a URL naming one opens it.
        this.openRelease = show;

        tabs.forEach(t => t.addEventListener('click', () => {
            show(t.dataset.target);
            UrlState.release(t.dataset.target);
            this.fitDescriptions();
        }));

        // Hovering the word drains the page for as long as you are on it, so the
        // mode shows itself before you commit to it. Clicking keeps it.
        document.querySelectorAll('.accent-switch').forEach(sw => {
            const release = sw.closest('.release-item').dataset.releaseId;
            // On the word the page is grey either way, so clicking is only ever
            // the difference between grey that leaves with the pointer and grey
            // that stays. The word carries that, in its two shades.
            const preview = () => this.setAccent('gray-world');
            const restore = () => { if (!this.greyHeld) this.setAccent(release); };

            sw.addEventListener('mouseenter', preview);
            sw.addEventListener('mouseleave', restore);
            sw.addEventListener('focus', preview);
            sw.addEventListener('blur', restore);
            sw.addEventListener('click', () => {
                this.holdGrey(!this.greyHeld);
                this.setAccent('gray-world');
            });
        });

        // A remembered record that is no longer on the page falls back to the
        // newest rather than opening nothing.
        let opening = null;
        try { opening = localStorage.getItem('accent-release'); } catch (e) {}
        if (!opening || ![...tabs].some(t => t.dataset.target === opening)) {
            opening = tabs[0].dataset.target;
        }
        show(opening);
    },

    // Every cover on the page, so the modal can page between records.
    artwork: [],

    render(releases) {
        if (!releases || !releases.releases) return '';

        const shown = releases.releases.filter(r => !r.hidden);        
        return `
            <div class="container">
                ${UIHelpers.sectionHeader("MUSIC")}
                <div class="releases">
                    ${this.renderSwitcher(shown)}
                    <div class="release-list">
                        ${shown.map(release => this.renderRelease(release)).join('')}
                    </div>
                </div>
            </div>
        `;
    }
};