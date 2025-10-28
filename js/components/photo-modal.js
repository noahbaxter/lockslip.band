// Photo Modal - Uses generic Modal component with photo-specific rendering
const photoModal = new Modal({
    modalId: 'photoModal',
    classPrefix: 'photo-modal',

    getAlt: (photo) => {
        return `${photo.venue} - ${photo.location} - ${photo.photographer}`;
    },

    renderInfo: (photo, modal) => {
        let html = '';

        // Date
        const photoDate = new Date(photo.date);
        const formattedDate = photoDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        html += `<div class="photo-modal-date">${formattedDate}</div>`;

        // Venue and location
        html += `<div class="photo-modal-venue">${photo.venue}</div>`;
        html += `<div class="photo-modal-location">${photo.location}</div>`;

        // Photographer with attribution link
        if (photo.url) {
            html += `<div class="photo-modal-photographer">Photo by <a href="${photo.url}" target="_blank" rel="noopener">${photo.photographer}</a></div>`;
        } else {
            html += `<div class="photo-modal-photographer">Photo by ${photo.photographer}</div>`;
        }

        // Counter
        html += `<p class="photo-modal-counter">${modal.currentIndex + 1} of ${modal.data.length}</p>`;

        return html;
    }
});

// Legacy global functions for backwards compatibility
window.openPhotoModal = (index) => photoModal.open(index);
window.closePhotoModal = () => photoModal.close();
window.navigatePhoto = (direction) => photoModal.navigate(direction);
