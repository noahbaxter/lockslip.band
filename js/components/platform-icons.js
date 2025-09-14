// Platform Icons Utility Component
const PlatformIcons = {
    iconMap: {
        spotify: 'images/icon-social/spotify.svg',
        apple: 'images/icon-social/apple-music.svg',
        youtube: 'images/icon-social/youtube.svg',
        bandcamp: 'images/icon-social/bandcamp.svg',
        soundcloud: 'images/icon-social/soundcloud.svg'
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
    }
};