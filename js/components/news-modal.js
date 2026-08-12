// News Modal - Uses generic Modal component for the announcement graphics.
// Borrows the photo-modal class prefix so news images get the exact same
// lightbox chrome as the live photos; only the info line differs.
const newsModal = new Modal({
    modalId: 'newsModal',
    classPrefix: 'photo-modal',

    getAlt: (item) => item.headline,

    getDownload: (item) => item.image,

    renderInfo: (item, modal) => `
        <div class="news-modal-headline">${item.headline}</div>
        <p class="photo-modal-counter">${modal.currentIndex + 1} of ${modal.data.length}</p>
    `
});

window.openNewsModal = (index) => newsModal.open(index);
