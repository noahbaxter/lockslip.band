class ContentLoader {
    constructor() {
        this.config = null;
        this.releases = null;
        this.shows = null;
        this.merchandise = null;
        this.media = null;
    }

    async loadAllContent() {
        try {
            const [config, releases, shows, merchandise, media] = await Promise.all([
                this.loadJSON('content/site-config.json'),
                this.loadJSON('content/releases.json'),
                this.loadJSON('content/shows.json'),
                this.loadJSON('content/merchandise.json'),
                this.loadJSON('content/media.json')
            ]);

            this.config = config;
            this.releases = releases;
            this.shows = shows;
            this.merchandise = merchandise;
            this.media = media;

            this.renderAllContent();
            UIHelpers.updateCopyrightYear();
            UIHelpers.setupHeroBioFade();
            UIHelpers.setupSmoothScrolling();
        } catch (error) {
            console.error('Error loading content:', error);
            UIHelpers.showError();
        }
    }

    async loadJSON(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load ${url}`);
        }
        return await response.json();
    }

    renderAllContent() {
        this.renderStreamingLinks();
        this.renderReleases();
        this.renderShows();
        this.renderMerchandise();
        this.renderMedia();
        this.renderFooter();
        this.renderNavigation();
        this.renderStreamingIcons();
    }


    renderStreamingLinks() {
        const streamingContainer = document.querySelector('.streaming-links');
        if (streamingContainer && this.config.streamingLinks) {
            streamingContainer.innerHTML = NavigationComponent.renderStreamingLinks(this.config.streamingLinks);
        }
    }

    renderReleases() {
        const releasesSection = document.getElementById('music');
        if (releasesSection && this.releases) {
            releasesSection.innerHTML = ReleasesComponent.render(this.releases);
        }
    }

    renderShows() {
        const showsSection = document.getElementById('shows');
        if (showsSection && this.shows) {
            const { futureItems, pastItems, showsWithPosters } = showsProcessor.processShows(this.shows);

            // Set shows with posters for modal navigation
            posterModal.setData(showsWithPosters);
            window.showsWithPosters = showsWithPosters; // Maintain global reference for compatibility

            const showsHTML = ShowsComponent.render(this.shows, this.config, futureItems, pastItems, showsWithPosters);
            showsSection.innerHTML = showsHTML;
        }
    }

    async renderMerchandise() {
        const merchSection = document.getElementById('merch');
        if (merchSection) {
            // Show loading state
            merchSection.innerHTML = '<div class="container"><h2>Merchandise</h2><p>Loading merchandise...</p></div>';

            try {
                const merchHTML = await MerchandiseComponent.renderAsync();
                merchSection.innerHTML = merchHTML;
            } catch (error) {
                console.error('Failed to render merchandise:', error);
                // Fallback to static data if available
                if (this.merchandise) {
                    merchSection.innerHTML = MerchandiseComponent.render(this.merchandise);
                } else {
                    merchSection.innerHTML = `
                        <div class="container">
                            <h2>Merchandise</h2>
                            <div class="empty-state">
                                <p>Sorry but no merch items are currently in stock.</p>
                                <p class="empty-state-sub">Please check back soon!</p>
                            </div>
                        </div>
                    `;
                }
            }
        }
    }

    renderMedia() {
        const mediaSection = document.getElementById('media');
        if (mediaSection && this.media) {
            mediaSection.innerHTML = MediaComponent.render(this.media);
        }
    }

    renderFooter() {
        const footerContent = document.querySelector('.footer-content');
        if (footerContent && this.config) {
            footerContent.innerHTML = FooterComponent.render(this.config);
        }
    }

    renderNavigation() {
        // Logo is now an image in HTML, don't overwrite it
        // const logo = document.querySelector('.logo');
        // if (logo && this.config) {
        //     logo.textContent = this.config.bandName;
        // }
    }

    renderStreamingIcons() {
        const streamingIcons = document.querySelector('.streaming-icons');
        const mobileStreamingIcons = document.querySelector('.mobile-streaming-icons');
        
        if (this.config.streamingLinks || this.config.socialMedia) {
            const iconHTML = NavigationComponent.renderHeaderIcons(this.config.streamingLinks, this.config.socialMedia);
            
            if (streamingIcons) {
                streamingIcons.innerHTML = iconHTML;
            }
            if (mobileStreamingIcons) {
                mobileStreamingIcons.innerHTML = iconHTML;
            }
        }
    }

}

// Initialize content loader when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const contentLoader = new ContentLoader();
    contentLoader.loadAllContent();

    // Listen for view changes and re-render shows section
    window.addEventListener('showViewChanged', () => {
        contentLoader.renderShows();
    });
});

