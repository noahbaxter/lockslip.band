// Extras Component
const ExtrasComponent = {
    renderCard(item) {
        const isDownload = item.type === 'download';
        const url = isDownload ? item.downloadUrl : item.linkUrl;
        const buttonText = isDownload ? 'Download' : 'View';
        const downloadAttr = isDownload ? 'download' : '';
        const targetAttr = isDownload ? '' : '';

        return `
            <div class="extras-card" data-item-id="${item.id}">
                <div class="extras-card-content">
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                </div>
                <div class="extras-card-action">
                    <a href="${url}" class="btn" ${downloadAttr}>${buttonText}</a>
                </div>
            </div>
        `;
    },

    render(extras) {
        if (!extras || !extras.items) return '';

        return `
            <div class="container">
                <h2>${extras.sectionTitle}</h2>
                <div class="extras-grid">
                    ${extras.items.map(item => this.renderCard(item)).join('')}
                </div>
            </div>
        `;
    }
};
