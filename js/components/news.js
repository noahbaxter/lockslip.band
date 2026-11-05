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

    // Thumbnail until clicked: a YouTube iframe pulls ~1MB of script, which
    // the homepage shouldn't pay for a video most visitors won't play.
    // maxresdefault is missing on some uploads, hqdefault never is.
    renderVideo(id, headline) {
        if (!id) return '';
        return `
            <div class="news-video">
                <button type="button" class="news-video-facade" onclick="NewsComponent.playVideo(this, '${id}')" aria-label="Play ${headline} video">
                    <img src="https://i.ytimg.com/vi/${id}/maxresdefault.jpg" alt="" loading="lazy"
                        onerror="this.onerror=null; this.src='https://i.ytimg.com/vi/${id}/hqdefault.jpg'">
                    <span class="news-video-play" aria-hidden="true"></span>
                </button>
            </div>
        `;
    },

    playVideo(button, id) {
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
        iframe.title = button.getAttribute('aria-label');
        iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        iframe.allowFullscreen = true;
        button.replaceWith(iframe);
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

    // The video floats beside the text; a post without one puts its banner in
    // that spot instead, and the banner goes under the text only with a video.
    renderFeatured(item) {
        const media = item.video
            ? this.renderVideo(item.video, item.headline)
            : this.renderBanner(item.images, item.headline);

        return `
            <article class="news-featured" data-item-id="${item.id}">
                <div class="news-content">
                    ${this.renderDate(item.date)}
                    <h3>${item.headline}</h3>
                    <div class="news-main${media ? ' has-media' : ''}">
                        ${media}
                        <div class="news-text">
                            ${this.renderBody(item)}
                            ${this.renderLinks(item.links)}
                        </div>
                    </div>
                </div>
                ${item.video ? this.renderBanner(item.images, item.headline) : ''}
            </article>
        `;
    },

    // Every post as a card in one row. The section is just this row until a card
    // is opened, and it scrolls sideways, so it stays the same height however
    // many posts pile up.
    renderRail(items) {
        const cards = items.map((item, index) => `
            <li class="news-rail-item">
                <button type="button" onclick="NewsComponent.select(${index})" aria-expanded="false">
                    <span class="news-rail-date">${this.formatDate(item.date)}</span>
                    <span class="news-rail-headline">${item.headline}</span>
                </button>
            </li>
        `).join('');

        return `<ul class="news-rail">${cards}</ul>`;
    },

    // Opens a post under the row, swaps it for another, or closes it when its own
    // card is tapped again. Rendering the banner also re-points the modal at
    // this post's images.
    select(index) {
        const item = this.items && this.items[index];
        const slot = document.querySelector('.news-post');
        if (!item || !slot) return;

        const closing = this.open === index;
        this.open = closing ? null : index;
        slot.innerHTML = closing ? '' : this.renderFeatured(item);

        document.querySelectorAll('.news-rail-item').forEach((li, i) => {
            const isOpen = i === this.open;
            li.classList.toggle('is-current', isOpen);
            li.querySelector('button').setAttribute('aria-expanded', String(isOpen));
        });
    },

    render(news) {
        if (!news || !news.items) return '';

        const items = news.items.filter(item => !item.hidden);
        if (!items.length) return '';
        this.items = items;
        this.open = null;

        return `
            <div class="container">
                ${UIHelpers.sectionHeader(news.sectionTitle)}
                ${this.renderRail(items)}
                <div class="news-post"></div>
            </div>
        `;
    }
};
