// Header Component - Reusable navigation header for all pages
const HeaderComponent = {
  // Render header with navigation
  render(options = {}) {
    const { basePath = '' } = options;

    const navItems = [
      { label: 'Music', href: `${basePath}#music` },
      { label: 'Shows', href: `${basePath}#shows` },
      { label: 'Store', href: `${basePath}#store` },
      {
        label: 'Media',
        href: `${basePath}#media`,
        submenu: [
          { label: 'Photos', href: `${basePath}#photos` },
          { label: 'Videos', href: `${basePath}#videos` },
          { label: 'Logos', href: `${basePath}#logos` }
        ]
      },
      {
        label: 'Extras',
        href: `${basePath}#extras`,
        submenu: [
          { label: 'Plugin', href: `${basePath}plugin/` }
        ]
      }
    ];

    const navLinksHTML = navItems.map(item => {
      if (item.submenu) {
        const submenuHTML = item.submenu.map(sub =>
          `<li><a href="${sub.href}">${sub.label}</a></li>`
        ).join('');
        return `
          <li class="nav-item-with-submenu">
            <a href="${item.href}">${item.label}</a>
            <ul class="nav-submenu">
              ${submenuHTML}
            </ul>
          </li>
        `;
      }
      return `<li><a href="${item.href}">${item.label}</a></li>`;
    }).join('');

    const mobileNavItemsHTML = navItems.map(item => {
      if (item.submenu) {
        const submenuHTML = item.submenu.map(sub =>
          `<li><a href="${sub.href}">${sub.label}</a></li>`
        ).join('');
        return `
          <li class="mobile-nav-item-with-submenu">
            <a href="${item.href}">${item.label}</a>
            <ul class="mobile-nav-submenu">
              ${submenuHTML}
            </ul>
          </li>
        `;
      }
      return `<li><a href="${item.href}">${item.label}</a></li>`;
    }).join('');

    const headerHTML = `
      <header>
        <nav>
          <ul class="nav-links">
            ${navLinksHTML}
          </ul>
          <a href="${basePath}" class="logo">
            <img src="${basePath}assets/logos/lockslip-logo-heavy.png" alt="Lockslip">
          </a>
          <div class="streaming-icons" id="streaming-icons">
            <!-- Streaming icons loaded by script -->
          </div>
          <button class="mobile-menu-toggle" aria-label="Toggle mobile menu">
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
          </button>
        </nav>
        <div class="mobile-menu">
          <ul class="mobile-nav-links">
            ${mobileNavItemsHTML}
          </ul>
          <div class="mobile-streaming-icons">
            <!-- Streaming icons loaded by script -->
          </div>
        </div>
      </header>
    `;

    return headerHTML;
  },

  // Initialize header in the DOM
  init(options = {}) {
    const headerHTML = this.render(options);
    const headerElement = document.createElement('div');
    headerElement.innerHTML = headerHTML;

    // Insert before the first child of body
    document.body.insertBefore(headerElement.firstElementChild, document.body.firstChild);

    // Store basePath for use in loadStreamingIcons
    this.basePath = options.basePath || '';

    // Initialize mobile menu handlers
    this.initMobileMenu();

    // Load streaming icons
    this.loadStreamingIcons();
  },

  // Mobile menu toggle functionality
  initMobileMenu() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-links > li > a');
    const mobileNavSubmenuItems = document.querySelectorAll('.mobile-nav-item-with-submenu');

    if (!mobileMenuToggle) return;

    // Toggle mobile menu
    mobileMenuToggle.addEventListener('click', function() {
      mobileMenuToggle.classList.toggle('active');
      mobileMenu.classList.toggle('active');

      if (mobileMenu.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });

    // Handle submenu toggles on mobile
    mobileNavSubmenuItems.forEach(item => {
      const mainLink = item.querySelector(':scope > a');
      mainLink.addEventListener('click', function(e) {
        e.preventDefault();
        item.classList.toggle('active');
      });
    });

    // Close menu when clicking on navigation links
    mobileNavLinks.forEach(link => {
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
  },

  // Load streaming icons from config
  loadStreamingIcons() {
    const streamingIconsContainer = document.getElementById('streaming-icons');
    const mobileStreamingIconsContainer = document.querySelector('.mobile-streaming-icons');

    if (!streamingIconsContainer) {
      console.warn('StreamingIconsContainer not found');
      return;
    }

    if (typeof NavigationComponent === 'undefined') {
      console.warn('NavigationComponent not available');
      return;
    }

    const configPath = `${this.basePath}content/site-config.json`;
    fetch(configPath)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(config => {
        const iconHTML = NavigationComponent.renderHeaderIcons(config.streamingLinks, config.socialMedia, this.basePath);
        if (streamingIconsContainer) streamingIconsContainer.innerHTML = iconHTML;
        if (mobileStreamingIconsContainer) mobileStreamingIconsContainer.innerHTML = iconHTML;
      })
      .catch(err => console.error('Failed to load streaming icons:', err));
  }
};
