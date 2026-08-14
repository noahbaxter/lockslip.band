// The announcement graphics, through the shared Modal. The photo variant, so
// they get the same chrome as the live shots; only the info line differs.
const newsModal = new Modal({
    modalId: 'newsModal',
    variant: 'photo',

    getAlt: (item) => item.headline,

    // No getDownload on purpose: these are the label's announcement graphics.
    // Handing out a download button belongs to the press kit, not here.

    renderInfo: (item, modal) => `
        <div class="news-modal-headline">${item.headline}</div>
        <p class="modal-counter">${modal.currentIndex + 1} of ${modal.data.length}</p>
    `
});

window.openNewsModal = (index) => newsModal.open(index);
