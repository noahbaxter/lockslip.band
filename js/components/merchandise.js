// Merchandise Component
const MerchandiseComponent = {
    renderMerchItem(item) {
        return `
            <div class="merch-item" data-item-id="${item.id}">
                <div class="merch-image">
                    ${item.image ? `<img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">` : ''}
                </div>
                <h3>${item.name}</h3>
                <p>${item.price}</p>
                <a href="${item.purchaseUrl}" class="btn small" target="_blank" rel="noopener">BUY NOW</a>
            </div>
        `;
    },

    render(merchandise) {
        if (!merchandise) return '';
        
        const inStockItems = merchandise.items.filter(item => item.inStock);
        
        return `
            <div class="container">
                <h2>${merchandise.sectionTitle}</h2>
                <div class="merch-grid">
                    ${inStockItems.map(item => this.renderMerchItem(item)).join('')}
                </div>
            </div>
        `;
    }
};