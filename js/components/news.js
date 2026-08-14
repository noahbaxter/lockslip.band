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
        // colors come along with them, accent tinting for the unbranded ones
        // included.
        const linksHTML = links.map(link => {
            const icon = PlatformIcons.iconMap[link.icon];
            const mark = PlatformIcons.markAttrs(link.icon, icon);
            return `
            <a href="${link.url}" class="social-icon ${link.icon}${mark.className}" target="_blank" rel="noopener" title="${link.name}"${mark.style}>
                <img src="${icon}" alt="${link.name}">
            </a>
        `;
        }).join('');

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

    // Every post as a date + headline line, the one on show marked. This is the
    // only way back to an older post: it used to list the ones that were not
    // featured and do nothing when clicked, so a post became unreachable the
    // moment a newer one arrived. Once there are enough to outgrow a list, they
    // get their own page instead.
    renderIndex(items, current) {
        if (items.length < 2) return '';

        const rows = items.map((item, index) => `
            <li class="news-index-item${index === current ? ' is-current' : ''}">
                <button type="button" onclick="NewsComponent.select(${index})"${index === current ? ' aria-current="true"' : ''}>
                    <span class="news-index-date">${this.formatDate(item.date)}</span>
                    <span class="news-index-headline">${item.headline}</span>
                </button>
            </li>
        `).join('');

        return `
            <div class="news-index">
                <h4>All posts</h4>
                <ul>${rows}</ul>
            </div>
        `;
    },

    // Swaps the featured post in place, the way the release switcher swaps
    // records. Re-rendering the banner also re-points the modal at this post's
    // images, which is what made the older ones unreachable before.
    select(index) {
        const item = this.items && this.items[index];
        if (!item) return;

        const featured = document.querySelector('.news-featured');
        if (!featured) return;
        featured.outerHTML = this.renderFeatured(item);

        document.querySelectorAll('.news-index-item').forEach((li, i) => {
            li.classList.toggle('is-current', i === index);
            const button = li.querySelector('button');
            if (button) button.toggleAttribute('aria-current', i === index);
        });

        // The list sits under the post, so without this a click looks like it
        // did nothing: the part that changed is off the top of the screen.
        const shown = document.querySelector('.news-featured');
        if (shown && shown.getBoundingClientRect().top < 0) {
            shown.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },

    render(news) {
        if (!news || !news.items) return '';

        const items = news.items.filter(item => !item.hidden);
        if (!items.length) return '';
        this.items = items;

        return `
            <div class="container">
                ${UIHelpers.sectionHeader(news.sectionTitle)}
                ${this.renderFeatured(items[0])}
                ${this.renderIndex(items, 0)}
            </div>
        `;
    }
};
