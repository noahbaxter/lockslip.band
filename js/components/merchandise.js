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
                return { sectionTitle: "Store", items: [] };
            }
        }

        try {
            const bigCartelData = await this.fetchFromBigCartel();
            if (bigCartelData && bigCartelData.items && bigCartelData.items.length > 0) {
                console.log('Using Big Cartel merchandise data');
                return bigCartelData;
            }
        } catch (error) {
            console.warn('Big Cartel API unavailable:', error);
        }

        // Every product links back to Big Cartel to check out, so when their API is
        // down the whole purchase path is down with it. Say so rather than render a
        // stale catalog nobody can actually buy from.
        return { sectionTitle: "Store", items: [], unavailable: true };
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
            sectionTitle: "Store",
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
                                 data-index="0">
                        </div>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="merch-image-container">
                <div class="merch-image-carousel" data-item-id="${item.id}">
                    <div class="carousel-images">
                        ${item.images.map((image, index) => `
                            <img src="${image}"
                                 alt="${item.name} - Image ${index + 1}"
                                 class="carousel-image ${index === 0 ? 'active' : ''}"
                                 data-index="${index}">
                        `).join('')}
                    </div>
                    <div class="carousel-dots">
                        ${item.images.map((_, index) => `
                            <button class="carousel-dot ${index === 0 ? 'active' : ''}"
                                    onmouseenter="goToItemImage('${item.id}', ${index})"
                                    onclick="goToItemImage('${item.id}', ${index})"
                                    aria-label="${item.name} - photo ${index + 1}"
                                    data-index="${index}"></button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    // Availability, not a control. These used to be a row of chips that looked
    // like the buttons they were not, and they out-shouted the product name.
    renderSizes(item) {
        let sizes = [];

        if (item.sizeOptions && item.sizeOptions.length) {
            sizes = item.sizeOptions
                .filter(o => this.shouldDisplaySize(o.name))
                .map(o => ({ name: o.name, soldOut: o.soldOut }));
        } else if (item.sizes) {
            const gone = item.sizesSoldOut || [];
            sizes = item.sizes
                .filter(size => this.shouldDisplaySize(size))
                .map(size => ({ name: size, soldOut: gone.includes(size) }));
        }

        if (!sizes.length) return '';

        return `
            <p class="merch-sizes">
                ${sizes.map(size => `<span class="merch-size${size.soldOut ? ' is-gone' : ''}"
                    >${this.abbreviateSize(size.name)}</span>`).join('')}
            </p>
        `;
    },

    renderMerchItem(item) {
        const status = item.isComingSoon ? 'COMING SOON' : item.isSoldOut ? 'SOLD OUT' : '';

        // No button: the card is the link. A card that is one target end to end
        // has no small thing to aim at, and the name and price get to be the
        // loudest things on it rather than a green rectangle at the foot.
        //
        // Sold out goes over the photo rather than into a line of its own: it is
        // a fact about the thing pictured, and a line for it only exists on the
        // cards that have it, which knocks the rest of the row out of step.
        return `
            <div class="merch-item ${item.isSoldOut ? 'item-sold-out' : ''} ${item.isComingSoon ? 'item-coming-soon' : ''}" data-item-id="${item.id}">
                <a class="merch-link" href="${item.purchaseUrl}" target="_blank" rel="noopener"
                   aria-label="${item.name}${status ? ', ' + status : ', ' + item.price}"></a>
                ${this.renderItemImageCarousel(item)}
                ${status ? `<span class="merch-status">${status}</span>` : ''}
                <div class="merch-details">
                    <h3>${item.name}</h3>
                    <p class="merch-price">${item.price}</p>
                    ${this.renderSizes(item)}
                    ${item.description ? `<p class="merch-description">${item.description}</p>` : ''}
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

        if (merchandise.unavailable) {
            return `
                <div class="container">
                    ${UIHelpers.sectionHeader(merchandise.sectionTitle)}
                    <div class="empty-state">
                        <p>Store is currently unavailable, sorry.</p>
                        <p class="empty-state-sub">Check back soon!</p>
                    </div>
                </div>
            `;
        }

        const displayItems = merchandise.items.filter(item => !item.hidden);

        // Handle empty state
        if (displayItems.length === 0) {
            return `
                <div class="container">
                    ${UIHelpers.sectionHeader(merchandise.sectionTitle)}
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
                    ${UIHelpers.sectionHeader(merchandise.sectionTitle)}
                    <div class="merch-collection-carousel">
                        <button class="collection-nav prev desktop-only" onclick="navigateCollectionCarousel(-1)">&larr;</button>
                        <button class="collection-nav next desktop-only" onclick="navigateCollectionCarousel(1)">&rarr;</button>
                        <div class="merch-carousel-container">
                            <div class="merch-carousel-track">
                                ${displayItems.map(item => this.renderMerchItem(item)).join('')}
                            </div>
                        </div>
                        <div class="mobile-collection-nav mobile-only">
                            <button class="collection-nav prev" onclick="navigateCollectionCarousel(-1)">&larr;</button>
                            <button class="collection-nav next" onclick="navigateCollectionCarousel(1)">&rarr;</button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="container">
                    ${UIHelpers.sectionHeader(merchandise.sectionTitle)}
                    <div class="merch-grid">
                        ${displayItems.map(item => this.renderMerchItem(item)).join('')}
                    </div>
                </div>
            `;
        }
    }
};