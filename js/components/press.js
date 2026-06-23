// Press Kit Component - bio + band photos, reusing MediaComponent for live photos/videos/logos

// Dedicated modal for the band promo photos (credit shown fullscreen, like live photos)
const bandPhotoModal = new Modal({
    modalId: 'bandPhotoModal',
    classPrefix: 'photo-modal',
    getAlt: () => 'Lockslip band photo',
    getDownload: (photo) => photo.hires || photo.image,
    renderInfo: (photo) => {
        if (!photo.credit) return '';
        const credit = photo.creditUrl
            ? `<a href="${photo.creditUrl}" target="_blank" rel="noopener">${photo.credit}</a>`
            : photo.credit;
        return `<div class="photo-modal-photographer">Photo by ${credit}</div>`;
    }
});

const PressComponent = {
    renderBio(bio) {
        if (!bio) return '';
        return (Array.isArray(bio) ? bio : [bio]).map(p => `<p>${p}</p>`).join('');
    },

    renderBandPhotos(bandPhotos) {
        if (!bandPhotos || !bandPhotos.items || bandPhotos.items.length === 0) return '';

        // Attach the shared credit to each item so the modal can show it fullscreen
        const items = bandPhotos.items.map(p => ({
            ...p,
            credit: bandPhotos.credit,
            creditUrl: bandPhotos.creditUrl
        }));
        bandPhotoModal.setData(items);

        // Use the same photo-card template as the live photos
        return `
            <div class="band-photo-grid">
                ${items.map((p, i) => MediaComponent.renderPhotoCard(p, i, 'bandPhotoModal')).join('')}
            </div>
        `;
    },

    // Logos tucked under the bio, no section header
    renderLogos(logos) {
        if (!logos || !logos.items) return '';
        const items = logos.items.filter(l => !l.hidden);
        if (items.length === 0) return '';
        return `<div class="press-logos">${items.map(l => MediaComponent.renderLogoCard(l)).join('')}</div>`;
    },

    render(press, media) {
        if (!press) return '';
        return `
            <div class="container">
                <h2>${press.sectionTitle}</h2>
                <section class="press-intro">
                    <div class="press-intro-left">
                        <div class="press-bio">${this.renderBio(press.bio)}</div>
                    </div>
                    ${this.renderBandPhotos(press.bandPhotos)}
                </section>
                ${media ? this.renderLogos(media.logos) : ''}
                ${media && media.photos ? MediaComponent.renderPhotosSection(media.photos) : ''}
                ${media && media.videos ? MediaComponent.renderVideosSection(media.videos) : ''}
            </div>
        `;
    }
};
