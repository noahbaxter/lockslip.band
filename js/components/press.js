// Press Kit Component - bio + band photos, reusing MediaComponent for live photos/videos/logos

// Dedicated modal for the band promo photos (credit shown fullscreen, like live photos)
const bandPhotoModal = new Modal({
    modalId: 'bandPhotoModal',
    variant: 'photo',
    getAlt: () => 'Lockslip band photo',
    getDownload: (photo) => photo.hires || photo.image,
    // Same caption as the live shots; the fields these items lack drop out.
    renderInfo: renderPhotoCaption
});

const PressComponent = {
    renderBio(bio) {
        if (!bio) return '';
        return (Array.isArray(bio) ? bio : [bio]).map(p => `<p>${p}</p>`).join('');
    },

    renderBandPhotos(bandPhotos) {
        if (!bandPhotos || !bandPhotos.items || bandPhotos.items.length === 0) return '';

        // The set credit is the default; an item that names its own photographer
        // keeps it, which is why the spread comes second.
        const items = bandPhotos.items.map(p => ({
            credit: bandPhotos.credit,
            creditUrl: bandPhotos.creditUrl,
            ...p
        }));
        bandPhotoModal.setData(items);

        // Use the same photo-card template as the live photos
        return `
            <div class="band-photo-grid">
                ${items.map((p, i) => MediaComponent.renderPhotoCard(p, i, 'bandPhotoModal')).join('')}
            </div>
        `;
    },

    // The JSON aspect is the tile's crop, not the photograph's shape, so the
    // real ratio is read off each image once it decodes. Hovering grows the
    // frame to it, the way the poster wall un-crops a poster.
    setTrueRatios(root = document) {
        root.querySelectorAll('.band-photo-grid .photo-card img').forEach((img) => {
            const apply = () => {
                if (!img.naturalWidth || !img.naturalHeight) return;
                const card = img.closest('.photo-card');
                if (card) card.style.setProperty('--true-ar', img.naturalWidth / img.naturalHeight);
            };
            if (img.complete) apply();
            else img.addEventListener('load', apply, { once: true });
        });
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
