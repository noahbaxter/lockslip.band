// Merchandise Component
const MerchandiseComponent = {
    renderItemImageCarousel(item) {
        if (!item.images || item.images.length === 0) return '';
        
        if (item.images.length === 1) {
            return `
                <div class="merch-image-container">
                    <div class="merch-image-carousel" data-item-id="${item.id}">
                        <div class="carousel-images">
                            <img src="${item.images[0]}" 
                                 alt="${item.name}" 
                                 class="carousel-image active"
                                 data-index="0"
                                 onerror="this.style.display='none'">
                        </div>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="merch-image-container">
                <div class="merch-image-carousel" data-item-id="${item.id}">
                    <button class="carousel-nav prev" onclick="navigateItemCarousel('${item.id}', -1)">‹</button>
                    <button class="carousel-nav next" onclick="navigateItemCarousel('${item.id}', 1)">›</button>
                    <div class="carousel-images">
                        ${item.images.map((image, index) => `
                            <img src="${image}" 
                                 alt="${item.name} - Image ${index + 1}" 
                                 class="carousel-image ${index === 0 ? 'active' : ''}"
                                 data-index="${index}"
                                 onerror="this.style.display='none'">
                        `).join('')}
                    </div>
                    <div class="carousel-dots">
                        ${item.images.map((_, index) => `
                            <button class="carousel-dot ${index === 0 ? 'active' : ''}" 
                                    onclick="goToItemImage('${item.id}', ${index})"
                                    data-index="${index}"></button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    renderSizeSelection(item) {
        if (!item.merchType || item.merchType !== 'upper-body' || !item.sizes) return '';
        
        const sizesToRender = item.sizes;
        const soldOutSizes = item.sizesSoldOut || [];
        
        return `
            <div class="size-selection">
                ${sizesToRender.map(size => {
                    const isSoldOut = soldOutSizes.includes(size);
                    const className = isSoldOut ? 'out-of-stock' : 'in-stock';
                    return `<span class="size-btn ${className}">${size}</span>`;
                }).join('')}
            </div>
        `;
    },

    renderMerchItem(item) {
        const hasMultipleImages = item.images && item.images.length > 1;
        const titleNavigation = hasMultipleImages ? `
            <button class="title-nav prev" onclick="navigateItemCarousel('${item.id}', -1)">‹</button>
            <span>${item.name}</span>
            <button class="title-nav next" onclick="navigateItemCarousel('${item.id}', 1)">›</button>
        ` : item.name;
        
        return `
            <div class="merch-item" data-item-id="${item.id}">
                ${this.renderItemImageCarousel(item)}
                <div class="merch-details">
                    <h3>${titleNavigation}</h3>
                    ${this.renderSizeSelection(item)}
                    ${item.description ? `<p class="merch-description">${item.description}</p>` : ''}
                    <a href="${item.purchaseUrl}" class="btn purchase-btn small" target="_blank" rel="noopener">${item.price}</a>
                </div>
            </div>
        `;
    },

    render(merchandise) {
        if (!merchandise) return '';
        
        const displayItems = merchandise.items.filter(item => !item.hidden);
        const shouldUseCollectionCarousel = displayItems.length > 3;
        
        if (shouldUseCollectionCarousel) {
            return `
                <div class="container">
                    <h2>${merchandise.sectionTitle}</h2>
                    <div class="merch-collection-carousel">
                        <button class="collection-nav prev" onclick="navigateCollectionCarousel(-1)">‹</button>
                        <button class="collection-nav next" onclick="navigateCollectionCarousel(1)">›</button>
                        <div class="merch-carousel-container">
                            <div class="merch-carousel-track">
                                ${displayItems.map(item => this.renderMerchItem(item)).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="container">
                    <h2>${merchandise.sectionTitle}</h2>
                    <div class="merch-grid">
                        ${displayItems.map(item => this.renderMerchItem(item)).join('')}
                    </div>
                </div>
            `;
        }
    }
};