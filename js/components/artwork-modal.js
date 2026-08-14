// Artwork Modal - full-size cover art with its credit.
//
// Runs through the shared Modal on the photo variant, so it inherits that
// styling rather than growing a parallel set that then drifts.

function renderArtworkCaption(art, modal) {
    const parts = [];

    if (art.title) parts.push(`<div class="modal-venue">${art.title}</div>`);
    if (art.year) parts.push(`<div class="modal-date">${art.year}</div>`);

    if (art.credit) {
        const name = art.creditUrl
            ? `<a href="${art.creditUrl}" target="_blank" rel="noopener">${art.credit}</a>`
            : art.credit;
        parts.push(`<div class="modal-photographer">Artwork by ${name}</div>`);
    }

    // Nothing to page through when there is a single cover.
    if (modal.data.length > 1) {
        parts.push(`<p class="modal-counter">${modal.currentIndex + 1} of ${modal.data.length}</p>`);
    }

    return parts.join('');
}

const artworkModal = new Modal({
    modalId: 'artworkModal',
    variant: 'photo',

    getAlt: (art) => `${art.title} cover artwork`,

    // No download: cover art is not ours to hand out as a file.
    getDownload: () => null,

    renderInfo: renderArtworkCaption
});
