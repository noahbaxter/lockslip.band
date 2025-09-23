// Merchandise Component (Big Cartel + Static Fallback Version)
// Toggle between implementations:
// - Set USE_BIG_CARTEL to true for live Big Cartel data with static fallback
// - Set USE_BIG_CARTEL to false to use only static JSON (like merchandise-manual.js)
const USE_BIG_CARTEL = true;

const MerchandiseComponent = {

    // Convert size names to abbreviations
    abbreviateSize(sizeName) {
        const sizeMap = {
            'SMALL': 'S',
            'MEDIUM': 'M',
            'LARGE': 'L',
            'EXTRA LARGE': 'XL',
            'X-LARGE': 'XL',
            'XX-LARGE': 'XXL',
            'XXX-LARGE': '3XL',
            '2X': 'XXL',
            '3X': '3XL',
            '4X': '4XL'
        };

        const upperSize = sizeName.toUpperCase();
        return sizeMap[upperSize] || sizeName;
    },

    // Check if size should be displayed (hide DEFAULT)
    shouldDisplaySize(sizeName) {
        return sizeName.toUpperCase() !== 'DEFAULT';
    },

    // Big Cartel API Integration
    async loadMerchandiseData() {
        if (!USE_BIG_CARTEL) {
            // Use static JSON only (manual mode)
            try {
                console.log('Using static merchandise data (manual mode)');
                const response = await fetch('content/merchandise.json');
                const data = await response.json();
                return this.transformBigCartelData(data.items);
            } catch (error) {
                console.error('Failed to load static merchandise data:', error);
                return { sectionTitle: "Merchandise", items: [] };
            }
        }

        // Big Cartel mode with fallback
        try {
            // First try to load from Big Cartel
            const bigCartelData = await this.fetchFromBigCartel();
            if (bigCartelData && bigCartelData.items && bigCartelData.items.length > 0) {
                console.log('Using Big Cartel merchandise data');
                return bigCartelData;
            }
        } catch (error) {
            console.warn('Big Cartel API failed, falling back to static JSON:', error);
        }

        // Fallback to static JSON
        try {
            console.log('Using static merchandise data (fallback)');
            const response = await fetch('content/merchandise.json');
            return await response.json();
        } catch (error) {
            console.error('Failed to load merchandise data:', error);
            return { sectionTitle: "Merchandise", items: [] };
        }
    },

    async fetchFromBigCartel() {
        const response = await fetch('https://api.bigcartel.com/lockslip/products.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const products = await response.json();
        return this.transformBigCartelData(products);
    },

    transformBigCartelData(products) {
        if (!Array.isArray(products)) return null;

        return {
            sectionTitle: "Merchandise",
            items: products.map(product => {
                // Get images
                const images = product.images ? product.images.map(img => img.url) : [];

                // Format price with USD
                const price = product.on_sale && product.price < product.default_price
                    ? `$${product.price.toFixed(2)} USD`
                    : `$${product.default_price.toFixed(2)} USD`;

                // Get size options with sold out status
                const sizeOptions = product.options && product.options.length > 0
                    ? product.options.map(opt => ({
                        name: opt.name,
                        soldOut: opt.sold_out,
                        id: opt.id,
                        price: opt.price
                    }))
                    : null;

                // Determine product state
                const isComingSoon = product.status === 'coming-soon';
                const isSoldOut = product.status === 'sold-out';
                const isActive = product.status === 'active';

                // Check if all sizes are sold out (for active products)
                const allSizesSoldOut = sizeOptions && sizeOptions.length > 0
                    ? sizeOptions.every(size => size.soldOut)
                    : false;

                // Construct full Big Cartel URL
                const fullUrl = product.url.startsWith('http')
                    ? product.url
                    : `https://lockslip.bigcartel.com${product.url}`;

                return {
                    id: product.id.toString(),
                    name: product.name,
                    price: price,
                    originalPrice: product.on_sale ? `$${product.default_price.toFixed(2)} USD` : null,
                    onSale: product.on_sale,
                    description: product.description || '',
                    images: images,
                    sizeOptions: sizeOptions,
                    available: isActive && !allSizesSoldOut,
                    isComingSoon: isComingSoon,
                    isSoldOut: isSoldOut || allSizesSoldOut,
                    status: product.status,
                    purchaseUrl: fullUrl,
                    bigCartel: true
                };
            })
        };
    },


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
        // Use sizeOptions if available (both Big Cartel and unified manual format)
        if (item.sizeOptions && item.sizeOptions.length > 0) {
            const displayableSizes = item.sizeOptions.filter(sizeOption =>
                this.shouldDisplaySize(sizeOption.name)
            );

            // If no sizes to display (only DEFAULT), return empty
            if (displayableSizes.length === 0) return '';

            return `
                <div class="size-selection">
                    ${displayableSizes.map(sizeOption => {
                        const className = sizeOption.soldOut ? 'out-of-stock' : 'in-stock';
                        const displaySize = this.abbreviateSize(sizeOption.name);
                        return `<span class="size-btn ${className}">${displaySize}</span>`;
                    }).join('')}
                </div>
            `;
        }

        // Fallback for legacy manual format (backward compatibility)
        if (item.sizes) {
            const sizesToRender = item.sizes.filter(size => this.shouldDisplaySize(size));
            const soldOutSizes = item.sizesSoldOut || [];

            // If no sizes to display (only DEFAULT), return empty
            if (sizesToRender.length === 0) return '';

            return `
                <div class="size-selection">
                    ${sizesToRender.map(size => {
                        const isSoldOut = soldOutSizes.includes(size);
                        const className = isSoldOut ? 'out-of-stock' : 'in-stock';
                        const displaySize = this.abbreviateSize(size);
                        return `<span class="size-btn ${className}">${displaySize}</span>`;
                    }).join('')}
                </div>
            `;
        }

        return '';
    },

    renderMerchItem(item) {
        // Determine button based on status
        let buttonHtml = '';

        if (item.isComingSoon) {
            buttonHtml = `<a href="${item.purchaseUrl}" class="btn purchase-btn small coming-soon" target="_blank" rel="noopener">COMING SOON</a>`;
        } else if (item.isSoldOut) {
            buttonHtml = `<a href="${item.purchaseUrl}" class="btn purchase-btn small sold-out" target="_blank" rel="noopener">SOLD OUT</a>`;
        } else {
            buttonHtml = `<a href="${item.purchaseUrl}" class="btn purchase-btn small" target="_blank" rel="noopener">${item.price}</a>`;
        }

        return `
            <div class="merch-item ${item.isSoldOut ? 'item-sold-out' : ''} ${item.isComingSoon ? 'item-coming-soon' : ''}" data-item-id="${item.id}">
                ${this.renderItemImageCarousel(item)}
                <div class="merch-details">
                    <h3>${item.name}</h3>
                    ${this.renderSizeSelection(item)}
                    ${item.description ? `<p class="merch-description">${item.description}</p>` : ''}
                    ${buttonHtml}
                </div>
            </div>
        `;
    },

    // Async render method that loads data from Big Cartel or static JSON
    async renderAsync() {
        const merchandise = await this.loadMerchandiseData();
        return this.render(merchandise);
    },

    render(merchandise) {
        if (!merchandise) return '';

        const displayItems = merchandise.items.filter(item => !item.hidden);

        // Handle empty state
        if (displayItems.length === 0) {
            return `
                <div class="container">
                    <h2>${merchandise.sectionTitle}</h2>
                    <div class="empty-state">
                        <p>Sorry, no items are in stock at this moment.</p>
                        <p class="empty-state-sub">Check back soon for new releases!</p>
                    </div>
                </div>
            `;
        }

        const shouldUseCollectionCarousel = displayItems.length > 3;
        
        if (shouldUseCollectionCarousel) {
            return `
                <div class="container">
                    <h2>${merchandise.sectionTitle}</h2>
                    <div class="merch-collection-carousel">
                        <button class="collection-nav prev desktop-only" onclick="navigateCollectionCarousel(-1)">‹</button>
                        <button class="collection-nav next desktop-only" onclick="navigateCollectionCarousel(1)">›</button>
                        <div class="merch-carousel-container">
                            <div class="merch-carousel-track">
                                ${displayItems.map(item => this.renderMerchItem(item)).join('')}
                            </div>
                        </div>
                        <div class="mobile-collection-nav mobile-only">
                            <button class="collection-nav prev" onclick="navigateCollectionCarousel(-1)">‹</button>
                            <button class="collection-nav next" onclick="navigateCollectionCarousel(1)">›</button>
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