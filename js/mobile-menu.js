document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-links > li > a');
    const mobileNavSubmenuItems = document.querySelectorAll('.mobile-nav-item-with-submenu');

    // Toggle mobile menu
    mobileMenuToggle.addEventListener('click', function() {
        mobileMenuToggle.classList.toggle('active');
        mobileMenu.classList.toggle('active');

        // Prevent body scroll when menu is open
        if (mobileMenu.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    });

    // Handle submenu toggles on mobile
    mobileNavSubmenuItems.forEach(item => {
        const mainLink = item.querySelector('> a');
        mainLink.addEventListener('click', function(e) {
            e.preventDefault();
            item.classList.toggle('active');
        });
    });

    // Close menu when clicking on navigation links
    mobileNavLinks.forEach(link => {
        // Skip submenu parent links
        if (!link.parentElement.classList.contains('mobile-nav-item-with-submenu')) {
            link.addEventListener('click', function() {
                mobileMenuToggle.classList.remove('active');
                mobileMenu.classList.remove('active');
                mobileNavSubmenuItems.forEach(item => item.classList.remove('active'));
                document.body.style.overflow = '';
            });
        }
    });

    // Close menu when clicking on submenu links
    const mobileSubmenuLinks = document.querySelectorAll('.mobile-nav-submenu a');
    mobileSubmenuLinks.forEach(link => {
        link.addEventListener('click', function() {
            mobileMenuToggle.classList.remove('active');
            mobileMenu.classList.remove('active');
            mobileNavSubmenuItems.forEach(item => item.classList.remove('active'));
            document.body.style.overflow = '';
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!mobileMenuToggle.contains(e.target) && !mobileMenu.contains(e.target)) {
            mobileMenuToggle.classList.remove('active');
            mobileMenu.classList.remove('active');
            mobileNavSubmenuItems.forEach(item => item.classList.remove('active'));
            document.body.style.overflow = '';
        }
    });

    // Close menu on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
            mobileMenuToggle.classList.remove('active');
            mobileMenu.classList.remove('active');
            mobileNavSubmenuItems.forEach(item => item.classList.remove('active'));
            document.body.style.overflow = '';
        }
    });
});