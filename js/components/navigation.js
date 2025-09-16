// Navigation Component
const NavigationComponent = {
    renderStreamingLinks(streamingLinks) {
        if (!streamingLinks) return '';
        return streamingLinks.map(link => 
            PlatformIcons.renderStreamingLink(link.className, link.url, false, link.name)
        ).join('');
    },

    renderStreamingIcons(streamingLinks) {
        if (!streamingLinks) return '';
        return streamingLinks.map(link => 
            PlatformIcons.renderStreamingLink(link.className, link.url, true, link.name)
        ).join('');
    },

    renderHeaderIcons(streamingLinks, socialMedia) {
        let html = '';
        
        // Add streaming icons (music platforms)
        if (streamingLinks) {
            html += streamingLinks.map(link => 
                PlatformIcons.renderStreamingLink(link.className, link.url, true, link.name)
            ).join('');
        }
        
        // Add separator
        if (streamingLinks && socialMedia && streamingLinks.length > 0 && socialMedia.length > 0) {
            html += '<span class="icon-separator">|</span>';
        }
        
        // Add social media icons
        if (socialMedia) {
            html += socialMedia.map(social => 
                PlatformIcons.renderSocialIcon(social)
            ).join('');
        }
        
        return html;
    }
};