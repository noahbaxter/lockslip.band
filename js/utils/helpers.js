// Utility Helper Functions
class UIHelpers {
    // Update copyright year to show current year
    static updateCopyrightYear() {
        const copyrightEl = document.getElementById('copyright-year');
        if (copyrightEl) {
            const currentYear = new Date().getFullYear();
            copyrightEl.textContent = currentYear;
        }
    }

    // Section heading: red label plus a rule out to the edge. One place so
    // every section is introduced identically.
    static sectionHeader(title) {
        return `<h2 class="section-line"><span class="section-line-label">${title}</span><i class="section-line-rule"></i></h2>`;
    }

    // Newsletter subscription placeholder
    static subscribeNewsletter() {
        const email = document.getElementById('newsletter-email').value;
        if (email) {
            // Implement actual newsletter subscription logic here
            alert('Newsletter subscription would be implemented here');
            document.getElementById('newsletter-email').value = '';
        }
    }

    // Show error page
    static showError() {
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; color: white; background: black; font-family: Arial, sans-serif;">
                <div style="text-align: center;">
                    <h1>ERROR LOADING CONTENT</h1>
                    <p>Please check that all content files are available</p>
                </div>
            </div>
        `;
    }
}

// Legacy show toggle function
class ShowsHelpers {
    // Past Shows Toggle Function
    static togglePastShows() {
        const content = document.querySelector('.past-shows-content');
        const button = document.querySelector('.show-past-shows-btn');
        const arrow = document.querySelector('.toggle-arrow');
        
        if (content && button && arrow) {
            const isVisible = content.style.display !== 'none';
            
            if (isVisible) {
                content.style.display = 'none';
                button.innerHTML = button.innerHTML.replace('Hide Past Shows', 'Show Past Shows');
                arrow.textContent = '▼';
            } else {
                content.style.display = 'block';
                button.innerHTML = button.innerHTML.replace('Show Past Shows', 'Hide Past Shows');
                arrow.textContent = '▲';
            }
        }
    }
}

// Global functions for backwards compatibility
window.subscribeNewsletter = () => UIHelpers.subscribeNewsletter();
window.togglePastShows = () => ShowsHelpers.togglePastShows();