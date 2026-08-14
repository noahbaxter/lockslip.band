// Caption for any photo lightbox. Every field is optional, so a gallery that
// carries only a credit (the band shots) and one that carries full show
// metadata (the live shots) both render through this rather than each modal
// growing its own version that then drifts.
function renderPhotoCaption(photo, modal) {
    const parts = [];

    const date = photo.date && new Date(photo.date);
    if (date && !isNaN(date)) {
        const formatted = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        parts.push(`<div class="modal-date">${formatted}</div>`);
    }

    if (photo.venue) parts.push(`<div class="modal-venue">${photo.venue}</div>`);
    if (photo.location) parts.push(`<div class="modal-location">${photo.location}</div>`);

    // Live shots name the photographer per image; band shots share one credit
    // across the set.
    const name = photo.photographer || photo.credit;
    const nameUrl = photo.url || photo.creditUrl;
    if (name) {
        const credit = nameUrl
            ? `<a href="${nameUrl}" target="_blank" rel="noopener">${name}</a>`
            : name;
        parts.push(`<div class="modal-photographer">Photo by ${credit}</div>`);
    }

    // Pointless on a gallery of one, where there is nothing to page through.
    if (modal.data.length > 1) {
        parts.push(`<p class="modal-counter">${modal.currentIndex + 1} of ${modal.data.length}</p>`);
    }

    return parts.join('');
}

// Photo Modal - Uses generic Modal component with photo-specific rendering
const photoModal = new Modal({
    modalId: 'photoModal',
    variant: 'photo',

    getAlt: (photo) => {
        return `${photo.venue} - ${photo.location} - ${photo.photographer}`;
    },

    getDownload: (photo) => photo.hires || photo.image,

    renderInfo: renderPhotoCaption
});

// Legacy global functions for backwards compatibility
window.openPhotoModal = (index) => photoModal.open(index);
window.closePhotoModal = () => photoModal.close();
window.navigatePhoto = (direction) => photoModal.navigate(direction);
