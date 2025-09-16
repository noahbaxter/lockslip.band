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

    renderRelease(release) {
        return `
            <div class="release-item" data-release-id="${release.id}">
                <div class="release-artwork">
                    ${this.renderBandcampEmbed(release.bandcampEmbed)}
                </div>
                <div class="release-content">
                    <div class="release-header">
                        <h4>${release.title}</h4>
                        <span class="release-date">${release.month} ${release.day}, ${release.year}</span>
                    </div>
                    <div class="content-streaming-links">
                        ${this.renderStreamingLinks(release.streamingLinks)}
                    </div>
                    <p class="release-description">${release.description}</p>
                    ${this.renderPhysicalLinks(release.physicalLinks)}
                </div>
            </div>
        `;
    },

    render(releases) {
        if (!releases || !releases.releases) return '';
        
        return `
            <div class="container">
                <h2>MUSIC</h2>
                <div class="releases">
                    <div class="release-list">
                        ${releases.releases.map(release => this.renderRelease(release)).join('')}
                    </div>
                </div>
            </div>
        `;
    }
};