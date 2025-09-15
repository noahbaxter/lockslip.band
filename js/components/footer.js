// Footer Component
const FooterComponent = {
    renderSocialLinks(socialMedia) {
        return socialMedia.map(social => 
            `<a href="${social.url}" target="_blank" rel="noopener">${social.platform}</a>`
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