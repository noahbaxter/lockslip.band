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

    async loadAllContent() {
        try {
            const [config, releases, shows, merchandise, media, extras, press, news] = await Promise.all([
                this.loadJSON('content/site-config.json'),
                this.loadJSON('content/releases.json'),
                this.loadJSON('content/shows.json'),
                this.loadJSON('content/merchandise.json'),
                this.loadJSON('content/media.json'),
                this.loadJSON('content/extras.json'),
                this.loadJSON('content/press.json'),
                this.loadJSON('content/news.json')
            ]);

            this.config = config;
            this.releases = releases;

            await this.applyPrivateAudio();
            await this.loadLyrics();
            this.shows = shows;
            this.merchandise = merchandise;
            this.media = media;
            this.extras = extras;
            this.press = press;
            this.news = news;

            this.renderAllContent();
            UIHelpers.updateCopyrightYear();
            UIHelpers.setupSmoothScrolling();
            this.handleInitialHash();
            ImageLoader.init();
        } catch (error) {
            console.error('Error loading content:', error);
            UIHelpers.showError();
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
            } catch (error) {
                console.error('Failed to render merchandise:', error);
                // Fallback to static data if available
                if (this.merchandise) {
                    merchSection.innerHTML = MerchandiseComponent.render(this.merchandise);
                    ImageLoader.refresh(merchSection);
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
        const hash = window.location.hash;
        if (!hash) return;

        const targetId = hash.slice(1);
        const targetElement = document.getElementById(targetId);
        if (!targetElement) return;

        // Small delay to ensure DOM is fully rendered
        setTimeout(() => {
            const header = document.querySelector('header');
            const headerHeight = header ? header.offsetHeight : 0;
            const rect = targetElement.getBoundingClientRect();
            const targetPosition = rect.top + window.scrollY - headerHeight - 20;
            window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        }, 100);
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

