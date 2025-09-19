// Platform Icons Utility Component
const PlatformIcons = {
    iconMap: {
        spotify: 'assets/social/spotify.svg',
        apple: 'assets/social/apple-music.svg',
        youtube: 'assets/social/youtube.svg',
        bandcamp: 'assets/social/bandcamp.svg',
        soundcloud: 'assets/social/soundcloud.svg',
        instagram: 'assets/social/instagram.svg',
        twitter: 'assets/social/twitter.svg',
        facebook: 'assets/social/facebook.svg',
        tiktok: 'assets/social/tiktok.svg',
        email: 'assets/social/email.svg',
        bandsintown: 'assets/social/bandsintown.svg'
    },

    socialIconMap: {
        'Instagram': 'instagram',
        'Twitter': 'twitter', 
        'Facebook': 'facebook',
        'TikTok': 'tiktok',
        'Email': 'email',
        'Bandsintown': 'bandsintown'
    },

    renderStreamingLink(platform, url, isIcon = false, title = null) {
        const iconPath = this.iconMap[platform];
        const displayTitle = title || platform;
        
        if (isIcon && iconPath) {
            return `
                <a href="${url}" class="streaming-icon ${platform}" target="_blank" rel="noopener" title="${displayTitle}">
                    <img src="${iconPath}" alt="${displayTitle}" />
                </a>
            `;
        } else if (isIcon) {
            const iconText = displayTitle.slice(0, 2).toUpperCase();
            return `
                <a href="${url}" class="streaming-icon ${platform}" target="_blank" rel="noopener" title="${displayTitle}">
                    ${iconText}
                </a>
            `;
        } else {
            return `
                <a href="${url}" class="streaming-link ${platform}" target="_blank" rel="noopener">
                    <span>${displayTitle}</span>
                </a>
            `;
        }
    },

    renderStreamingIcon(platform, url) {
        return this.renderStreamingLink(platform, url, true);
    },

    renderReleaseStreamingLink(platform, url) {
        const iconPath = this.iconMap[platform];
        
        if (iconPath) {
            return `
                <a href="${url}" class="release-streaming-link ${platform}" target="_blank" rel="noopener" title="${platform}">
                    <img src="${iconPath}" alt="${platform}" />
                </a>
            `;
        } else {
            return `
                <a href="${url}" class="release-streaming-link ${platform}" target="_blank" rel="noopener" title="${platform}">
                    ${platform.slice(0,2).toUpperCase()}
                </a>
            `;
        }
    },

    renderTikTok(socialMedia) {
        const iconPath = this.iconMap['tiktok'];
        return `
            <a href="${socialMedia.url}" class="social-icon tiktok" target="_blank" rel="noopener" title="${socialMedia.platform}">
                <div class="tiktok-3d-container">
                    <img src="${iconPath}" alt="${socialMedia.platform}" class="tiktok-red" />
                    <img src="${iconPath}" alt="${socialMedia.platform}" class="tiktok-cyan" />
                    <img src="${iconPath}" alt="${socialMedia.platform}" class="tiktok-white" />
                </div>
            </a>
        `;
    },

    renderSocialIcon(socialMedia) {
        const platformKey = this.socialIconMap[socialMedia.platform];
        const iconPath = this.iconMap[platformKey];
        
        // Special handling for TikTok
        if (platformKey === 'tiktok') {
            return this.renderTikTok(socialMedia);
        }
        
        if (iconPath) {
            return `
                <a href="${socialMedia.url}" class="social-icon ${platformKey}" target="_blank" rel="noopener" title="${socialMedia.platform}">
                    <img src="${iconPath}" alt="${socialMedia.platform}" />
                </a>
            `;
        } else {
            const iconText = socialMedia.platform.slice(0, 2).toUpperCase();
            return `
                <a href="${socialMedia.url}" class="social-icon ${platformKey}" target="_blank" rel="noopener" title="${socialMedia.platform}">
                    ${iconText}
                </a>
            `;
        }
    }
};