// Media Component
const MediaComponent = {
    renderPhotoCard(photo, index) {
        return `
            <div class="photo-card" data-photo-index="${index}" onclick="photoModal.open(${index})">
                <div class="photo-placeholder">
                    ${photo.image ? `<img src="${photo.image}" alt="${photo.venue} - ${photo.location}" onerror="this.style.display='none'">` : ''}
                </div>
            </div>
        `;
    },

    renderVideoCard(video) {
        return `
            <div class="video-card" data-video-id="${video.id}">
                <div class="video-thumbnail">
                    <a href="${video.url}" target="_blank" rel="noopener">
                        ${video.thumbnail ? `<img src="${video.thumbnail}" alt="${video.title}" onerror="this.style.display='none'">` : ''}
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
                    <img src="${logo.file}" alt="${logo.title}" onerror="this.style.display='none'">
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
            <div class="media-section">
                <h3>${photos.sectionTitle}</h3>
                <div class="photo-grid">
                    ${photos.gallery.map((photo, index) => this.renderPhotoCard(photo, index)).join('')}
                </div>
            </div>
        `;
    },

    renderVideosSection(videos) {
        return `
            <div class="media-section">
                <h3>${videos.sectionTitle}</h3>
                <div class="video-grid">
                    ${videos.items.map(video => this.renderVideoCard(video)).join('')}
                </div>
            </div>
        `;
    },

    renderLogosSection(logos) {
        return `
            <div class="media-section">
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