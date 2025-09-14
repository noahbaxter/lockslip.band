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
    }
};