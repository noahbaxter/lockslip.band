// Shared download icon (stroke uses currentColor so CSS controls the color)
const DOWNLOAD_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>';

// Media Component
const MediaComponent = {
    renderPhotoCard(photo, index, modalName = 'photoModal') {
        const downloadUrl = photo.hires || photo.image;
        const alt = photo.venue ? `${photo.venue} - ${photo.location}` : 'Lockslip band photo';
        const download = downloadUrl
            ? `<a class="photo-download" href="${downloadUrl}" download title="Download photo" aria-label="Download photo" onclick="event.stopPropagation()">${DOWNLOAD_ICON_SVG}</a>`
            : '';
        // Optional per-image frame overrides: aspect ratio of the frame, crop position of the image
        const frameStyle = photo.aspect ? ` style="aspect-ratio:${photo.aspect}"` : '';
        const imgStyle = photo.objectPosition ? ` style="object-position:${photo.objectPosition}"` : '';
        return `
            <div class="photo-card" data-photo-index="${index}" onclick="${modalName}.open(${index})">
                <div class="photo-placeholder"${frameStyle}>
                    ${photo.image ? `<img src="${photo.image}" alt="${alt}"${imgStyle}>` : ''}
                    ${download}
                </div>
            </div>
        `;
    },

    renderVideoCard(video) {
        return `
            <div class="video-card" data-video-id="${video.id}">
                <div class="video-thumbnail">
                    <a href="${video.url}" target="_blank" rel="noopener">
                        ${video.thumbnail ? `<img src="${video.thumbnail}" alt="${video.title}">` : ''}
                        <div class="video-play-overlay">▶</div>
                    </a>
                </div>
                <div class="video-info">
                    <h4>${video.title}</h4>
                    <p>${video.description}</p>
                </div>
            </div>
        `;
    },

    renderLogoCard(logo) {
        return `
            <div class="logo-card" data-logo-id="${logo.id}">
                <div class="logo-preview">
                    <img src="${logo.file}" alt="${logo.title}">
                </div>
                <div class="logo-download">
                    <a href="${logo.file}" download class="btn small">DOWNLOAD</a>
                </div>
            </div>
        `;
    },

    renderPhotosSection(photos) {
        // Initialize photo modal with the gallery
        if (photoModal && photos.gallery) {
            photoModal.setData(photos.gallery);
        }

        return `
            <div class="media-section" id="photos">
                <h3>${photos.sectionTitle}</h3>
                <div class="photo-grid">
                    ${photos.gallery.map((photo, index) => this.renderPhotoCard(photo, index)).join('')}
                </div>
            </div>
        `;
    },

    renderVideosSection(videos) {
        return `
            <div class="media-section" id="videos">
                <h3>${videos.sectionTitle}</h3>
                <div class="video-grid">
                    ${videos.items.map(video => this.renderVideoCard(video)).join('')}
                </div>
            </div>
        `;
    },

    renderLogosSection(logos) {
        return `
            <div class="media-section" id="logos">
                <h3>${logos.sectionTitle}</h3>
                <div class="logos-grid">
                    ${logos.items.map(logo => this.renderLogoCard(logo)).join('')}
                </div>
            </div>
        `;
    },

    render(media) {
        if (!media) return '';
        
        return `
            <div class="container">
                <h2>${media.sectionTitle}</h2>
                ${this.renderPhotosSection(media.photos)}
                ${this.renderVideosSection(media.videos)}
                ${this.renderLogosSection(media.logos)}
            </div>
        `;
    }
};