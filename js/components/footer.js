// Footer Component
const FooterComponent = {
    renderSocialLinks(socialMedia) {
        return socialMedia.map(social =>
            PlatformIcons.renderSocialIcon(social)
        ).join('');
    },

    renderNewsletterSection(newsletter) {
        return ``;
        return `
            <div class="footer-section">
                <h3>${newsletter.title}</h3>
                <p>${newsletter.subtitle}</p>
                <div class="newsletter-signup">
                    <input type="email" placeholder="${newsletter.placeholder}" id="newsletter-email">
                    <button type="button" class="btn small" onclick="subscribeNewsletter()">${newsletter.buttonText}</button>
                </div>
            </div>
        `;
    },

    // Builds the whole <footer>, the way HeaderComponent builds the header. The
    // shell markup used to be copy-pasted into all three pages, which meant the
    // copyright line and the byline could drift apart between them.
    init(config) {
        if (document.querySelector('footer')) return;

        const footer = document.createElement('footer');
        footer.innerHTML = `
            <div class="container">
                <div class="footer-content">${this.render(config)}</div>
                <div class="footer-bottom">
                    <p>&copy; <span id="copyright-year">2024</span> Lockslip. All rights reserved.</p>
                    <p>Site designed &amp; built by Noah Baxter.</p>
                </div>
            </div>
        `;
        document.body.appendChild(footer);
        if (window.UIHelpers) UIHelpers.updateCopyrightYear();
    },

    render(config) {
        if (!config) return '';

        return `
            <div class="footer-section">
                <h3>FOLLOW</h3>
                <div class="social-links">
                    ${this.renderSocialLinks(config.socialMedia)}
                </div>
            </div>
            <div class="footer-section">
                <h3>CONTACT</h3>
                <p>Booking: <a href="mailto:${config.contact.booking}">${config.contact.booking}</a></p>
            </div>
            ${this.renderNewsletterSection(config.newsletter)}
        `;
    }
};