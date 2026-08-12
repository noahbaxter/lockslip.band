// News Component
const NewsComponent = {
    // Strip of the announcement graphics in the order they were posted, held to
    // the same column as every other section. Panels overlap so they stay tall
    // in that column instead of five short slivers; hovering pulls one forward.
    // Scrolls sideways below the desktop breakpoint.
    renderBanner(images, headline) {
        if (!images || !images.length) return '';

        // The modal is fed from the featured item only, so the index here is
        // the index into newsModal's data.
        newsModal.setData(images.map(image => ({ image, headline })));

        const imagesHTML = images.map((image, index) => `
            <button class="news-banner-image" style="--news-banner-index: ${index}" onclick="openNewsModal(${index})" aria-label="${headline}, image ${index + 1}">
                <img src="${image}" alt="${headline}">
            </button>
        `).join('');

        return `<div class="news-banner" style="--news-banner-count: ${images.length}">${imagesHTML}</div>`;
    },

    renderLinks(links) {
        if (!links || !links.length) return '';

        // Icon-only, styled as the social icons in the header so the hover
        // colors come along with them.
        const linksHTML = links.map(link => `
            <a href="${link.url}" class="social-icon ${link.icon}" target="_blank" rel="noopener" title="${link.name}">
                <img src="${PlatformIcons.iconMap[link.icon]}" alt="${link.name}">
            </a>
        `).join('');

        return `<div class="news-links">${linksHTML}</div>`;
    },

    // Same shape as a release date: full month, uppercased in CSS.
    formatDate(date) {
        return `${date.month} ${date.day}, ${date.year}`;
    },

    renderDate(date) {
        return `<div class="news-date">${this.formatDate(date)}</div>`;
    },

    // The body is the label's own announcement, so it's set as a quote with a
    // cite rather than passed off as ours.
    renderBody(item) {
        const paragraphs = (item.body || []).map(p => `<p>${p}</p>`).join('');
        if (!item.attribution) return `<div class="news-body">${paragraphs}</div>`;

        return `
            <blockquote class="news-body news-body-quoted">
                ${paragraphs}
                <cite>${item.attribution}</cite>
            </blockquote>
        `;
    },

    renderFeatured(item) {
        return `
            <article class="news-featured" data-item-id="${item.id}">
                ${this.renderBanner(item.images, item.headline)}
                <div class="news-content">
                    ${this.renderDate(item.date)}
                    <h3>${item.headline}</h3>
                    ${this.renderBody(item)}
                    ${this.renderLinks(item.links)}
                </div>
            </article>
        `;
    },

    // Older entries collapse to a date + headline line. Once there are enough of
    // them to need more than a list, they get their own page instead.
    renderArchive(items) {
        if (!items.length) return '';

        const rows = items.map(item => `
            <li class="news-archive-item">
                <span class="news-archive-date">${this.formatDate(item.date)}</span>
                <span class="news-archive-headline">${item.headline}</span>
            </li>
        `).join('');

        return `
            <div class="news-archive">
                <h4>Previously</h4>
                <ul>${rows}</ul>
            </div>
        `;
    },

    render(news) {
        if (!news || !news.items) return '';

        const items = news.items.filter(item => !item.hidden);
        if (!items.length) return '';

        return `
            <div class="container">
                ${UIHelpers.sectionHeader(news.sectionTitle)}
                ${this.renderFeatured(items[0])}
                ${this.renderArchive(items.slice(1))}
            </div>
        `;
    }
};
