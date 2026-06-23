// Press Kit Component - bio + band photos, reusing MediaComponent for live photos/videos/logos

// Dedicated modal for the band promo photos (credit shown fullscreen, like live photos)
const bandPhotoModal = new Modal({
    modalId: 'bandPhotoModal',
    classPrefix: 'photo-modal',
    getAlt: () => 'Lockslip band photo',
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

    renderBandPhoto(photo, index) {
        return `
            <figure class="band-photo">
                <div class="band-photo-img" onclick="bandPhotoModal.open(${index})">
                    <img src="${photo.image}" alt="Lockslip band photo" loading="lazy">
                    <a class="band-photo-download" href="${photo.hires}" download title="Download hi-res photo" onclick="event.stopPropagation()">↓</a>
                </div>
            </figure>
        `;
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

        return `
            <div class="band-photo-grid">
                ${items.map((p, i) => this.renderBandPhoto(p, i)).join('')}
            </div>
        `;
    },

    render(press, media) {
        if (!press) return '';
        return `
            <div class="container">
                <h2>${press.sectionTitle}</h2>
                <section class="press-intro">
                    <div class="press-bio">${this.renderBio(press.bio)}</div>
                    ${this.renderBandPhotos(press.bandPhotos)}
                </section>
                ${media && media.photos ? MediaComponent.renderPhotosSection(media.photos) : ''}
                ${media && media.videos ? MediaComponent.renderVideosSection(media.videos) : ''}
                ${media && media.logos ? MediaComponent.renderLogosSection(media.logos) : ''}
            </div>
        `;
    }
};
