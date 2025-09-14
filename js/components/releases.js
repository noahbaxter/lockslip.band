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
            .map(([platform, url]) => PlatformIcons.renderReleaseStreamingLink(platform, url))
            .join('');
    },

    renderRelease(release) {
        return `
            <div class="release-item" data-release-id="${release.id}">
                <div class="release-artwork">
                    <div class="release-cover">
                        ${release.coverImage ? `<img src="${release.coverImage}" alt="${release.title}" onerror="this.style.display='none'">` : ''}
                    </div>
                    <div class="release-streaming">
                        <div class="release-streaming-links">
                            ${this.renderStreamingLinks(release.streamingLinks)}
                        </div>
                    </div>
                </div>
                <div class="release-content">
                    <div class="release-header">
                        <h4>${release.title}</h4>
                        <span class="release-date">${release.month} ${release.day}, ${release.year}</span>
                    </div>
                    ${this.renderTrackListing(release.tracks)}
                    <p class="release-description">${release.description}</p>
                </div>
            </div>
        `;
    },

    render(releases) {
        if (!releases || !releases.releases) return '';
        
        return `
            <div class="container">
                <div class="releases">
                    <h3>MUSIC</h3>
                    <div class="release-list">
                        ${releases.releases.map(release => this.renderRelease(release)).join('')}
                    </div>
                </div>
            </div>
        `;
    }
};