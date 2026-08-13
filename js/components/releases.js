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
        const description = panel && panel.parentElement.querySelector('.release-description');
        if (!panel) return;

        if (trackIndex === null) {
            panel.hidden = true;
            if (description) description.hidden = false;
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
        if (description) description.hidden = true;
    },

    renderPlayer(release) {
        if (release.audio && release.audio.tracks && release.audio.tracks.length) {
            AudioPlayer.register(release.id, {
                baseUrl: release.audio.baseUrl,
                tracks: release.audio.tracks,
                coverImage: release.coverImage,
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

    renderPhysicalLinks(physicalLinks) {
        if (!physicalLinks) return '';
        
        return `
            <div class="physical-links-content">
                <div class="physical-links-grid flex-center">
                    ${Object.entries(physicalLinks).map(([key, link]) => `
                        <a href="${link.url}" target="_blank" rel="noopener" class="physical-link">
                            <img src="${link.icon}" alt="${link.name}" onerror="this.style.display='none'">
                            <div class="physical-link-text">
                                <span class="physical-link-name">${link.name}</span>
                                <span class="physical-link-format">${link.format}</span>
                            </div>
                        </a>
                    `).join('')}
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
                    ${release.description ? `<p class="release-description">${release.description}</p>` : ''}
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
            <div class="release-switcher" role="tablist" aria-label="Releases">
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
        `;
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
        };

        tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.target)));
        show(tabs[0].dataset.target);
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