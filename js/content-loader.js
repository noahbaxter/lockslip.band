class ContentLoader {
    constructor() {
        this.config = null;
        this.releases = null;
        this.shows = null;
        this.merchandise = null;
        this.media = null;
        this.extras = null;
        this.press = null;
        this.news = null;
    }

    // Each file stands or falls on its own. One Promise.all over the lot meant a
    // single missing file rejected the whole thing and the catch replaced the
    // page with an error, which is what Google indexed the site as: the shows,
    // the record and the shop were all fine and none of them got rendered.
    // A section whose file is missing simply does not render.
    async loadAllContent() {
        const files = {
            config: 'content/site-config.json',
            releases: 'content/releases.json',
            shows: 'content/shows.json',
            merchandise: 'content/merchandise.json',
            media: 'content/media.json',
            extras: 'content/extras.json',
            press: 'content/press.json',
            news: 'content/news.json',
        };

        const names = Object.keys(files);
        const loaded = await Promise.all(
            names.map(name => this.loadJSON(files[name]).catch(error => {
                console.error(`Skipping ${files[name]}:`, error.message);
                return null;
            }))
        );
        names.forEach((name, i) => { this[name] = loaded[i]; });

        try {
            await this.applyPrivateAudio();
            await this.loadLyrics();

            this.renderAllContent();
            UIHelpers.updateCopyrightYear();
            this.handleInitialHash();
            ImageLoader.init();
        } catch (error) {
            // Rendering itself failing is a bug in the site rather than a missing
            // file, so it is worth saying so out loud, but never by wiping what
            // did render.
            console.error('Error rendering content:', error);
        }
    }

    // Audio URLs for unreleased records live in the private octopus submodule, not
    // in content/releases.json, so nothing playable ships in the public repo. When
    // the file is absent this fetch 404s and the release simply renders unplayable.
    async applyPrivateAudio() {
        try {
            const res = await fetch('octopus/private-audio.json');
            if (!res.ok) return;
            const sources = await res.json();
            for (const release of this.releases.releases) {
                const src = sources[release.id];
                if (!src) continue;
                release.audio = { ...release.audio, ...src };
            }
        } catch (e) {
            // Nothing to do: no private sources means nothing extra is playable.
        }
    }

    // Public lyrics ship in content/lyrics.json. Unreleased ones come from the
    // private octopus submodule, which 404s until that file is committed there.
    async loadLyrics() {
        const merged = {};
        for (const url of ['content/lyrics.json', 'octopus/private-lyrics.json']) {
            try {
                const res = await fetch(url);
                if (res.ok) Object.assign(merged, await res.json());
            } catch (e) {
                // A missing lyrics file just means no lyrics button.
            }
        }
        ReleasesComponent.lyrics = merged;
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
        this.renderNews();
        this.renderReleases();
        this.renderShows();
        this.renderMerchandise();
        this.renderMedia();
        this.renderExtras();
        this.renderFooter();
        this.renderNavigation();
        this.renderStreamingIcons();
    }


    renderNews() {
        const newsSection = document.getElementById('news');
        if (newsSection && this.news) {
            newsSection.innerHTML = NewsComponent.render(this.news);
        }
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
            ReleasesComponent.initSwitcher();
            AudioPlayer.initAll();
            ReleasesComponent.fitDescriptions();
            ReleasesComponent.watchDescriptions();
            ReleasesComponent.watchHeaders();
            // Cover art changes the player height once it lands, so measure again.
            window.addEventListener('load', () => ReleasesComponent.fitDescriptions(), { once: true });
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
            ShowsScrollNav.refresh();
        }
    }

    async renderMerchandise() {
        const merchSection = document.getElementById('store');
        if (merchSection) {
            // Show loading state
            merchSection.innerHTML = `<div class="container">${UIHelpers.sectionHeader('Store')}<p>Loading merchandise...</p></div>`;

            try {
                const merchHTML = await MerchandiseComponent.renderAsync();
                merchSection.innerHTML = merchHTML;
                ImageLoader.refresh(merchSection);
                // Lights the dots for whatever is on screen before anyone has
                // pressed an arrow.
                carouselManager.refreshCollection();
            } catch (error) {
                console.error('Failed to render merchandise:', error);
                // Fallback to static data if available
                if (this.merchandise) {
                    merchSection.innerHTML = MerchandiseComponent.render(this.merchandise);
                    ImageLoader.refresh(merchSection);
                    carouselManager.refreshCollection();
                } else {
                    merchSection.innerHTML = `
                        <div class="container">
                            ${UIHelpers.sectionHeader("Store")}
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

    renderExtras() {
        const extrasSection = document.getElementById('extras');
        if (extrasSection && this.extras) {
            extrasSection.innerHTML = ExtrasComponent.render(this.extras);
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

    handleInitialHash() {
        // Late enough that the players exist and the sections have their height,
        // so a URL naming a track or a section lands on it rather than on where
        // that thing was going to be.
        setTimeout(() => UrlState.init(), 100);
    }
}

// Named so the router can boot a panel it just built. Runs once per panel: the
// router keeps panels around rather than rebuilding them, which is also what
// keeps the audio element and its UI in step across navigation.
window.initHomePanel = function (root) {
    if (!root || root.dataset.booted) return;
    root.dataset.booted = '1';

    const contentLoader = new ContentLoader();
    contentLoader.loadAllContent();

    // Listen for view changes and re-render shows section
    window.addEventListener('showViewChanged', () => {
        contentLoader.renderShows();
        ImageLoader.refresh();
    });
};

