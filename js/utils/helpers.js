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

    // Setup hero bio fade animation on scroll
    static setupHeroBioFade() {
        const heroBioOverlay = document.querySelector('.hero-bio-overlay');
        if (!heroBioOverlay) return;

        const handleScroll = () => {
            const scrollY = window.scrollY;
            const windowHeight = window.innerHeight;
            const fadeStart = windowHeight * 0.1; // Start fading after 10% of viewport height
            const fadeEnd = windowHeight * 0.6;   // Completely faded by 60% of viewport height

            if (scrollY <= fadeStart) {
                heroBioOverlay.style.opacity = '1';
            } else if (scrollY >= fadeEnd) {
                heroBioOverlay.style.opacity = '0';
            } else {
                const fadeProgress = (scrollY - fadeStart) / (fadeEnd - fadeStart);
                heroBioOverlay.style.opacity = (1 - fadeProgress).toString();
            }
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Initialize on load
    }

    // Setup smooth scrolling with header offset
    static setupSmoothScrolling() {
        // Get header height for offset calculation
        const getHeaderHeight = () => {
            const header = document.querySelector('header');
            return header ? header.offsetHeight : 0;
        };

        // Handle clicks on navigation links
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (!link) return;

            const href = link.getAttribute('href');
            const targetId = href.slice(1); // Remove the #
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                e.preventDefault();
                
                const headerHeight = getHeaderHeight();
                const targetPosition = targetElement.offsetTop - headerHeight - 20; // Extra 20px padding

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
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