# CLAUDE.md

This file provides comprehensive guidance for Claude Code when working with the Lockslip band website repository.

## Quick Start

### Development Server
```bash
python3 server.py
```
Starts local development server on port 8000 with CORS headers for JSON loading.

### Image Optimization
```bash
# One-time setup
python3 -m venv image_optimizer_env
source image_optimizer_env/bin/activate
pip install Pillow pillow-heif

# Optimize images
source image_optimizer_env/bin/activate
python optimize_images.py images/show-posters -q 80 --max-width 800
python optimize_images.py images/releases -q 85 --max-width 600
```

## Architecture Overview

### Component-Based Single Page Application
Modern vanilla JavaScript SPA with component architecture, CSS imports, and JSON-driven content management.

**Core Files:**
- `index.html` - Semantic HTML shell with component mount points
- `styles.css` - CSS import orchestrator for modular stylesheets
- `js/content-loader.js` - Main application controller
- `content/*.json` - All dynamic content (shows, releases, merch, config)

### Modular JavaScript Architecture

**Component System (`js/components/`):**
- `shows.js` (238 lines) - Complex show rendering with mobile/desktop variants
- `poster-modal.js` (233 lines) - Full-screen poster viewer with keyboard navigation
- `shows-processor.js` (192 lines) - Show categorization and tour grouping logic
- `carousel-manager.js` (148 lines) - Multi-level carousel functionality
- `merchandise.js` (115 lines) - Product display with image carousels
- `releases.js` (90 lines) - Music release cards with streaming integration
- `media.js` (88 lines) - Photo/video galleries
- `platform-icons.js` (57 lines) - Dynamic social media icons
- `footer.js` (39 lines) - Footer content rendering
- `navigation.js` (15 lines) - Navigation component

**Utilities:**
- `js/utils/helpers.js` - Shared utility functions
- `js/mobile-menu.js` - Mobile navigation behavior

### CSS Architecture

**Modular Stylesheets (`styles/`):**
```
base/
├── variables.css (67 lines) - CSS custom properties
├── reset.css (23 lines) - Normalize styles
├── typography.css (54 lines) - Font systems
├── layout.css (92 lines) - Grid & flexbox utilities
├── buttons.css (129 lines) - Button component styles
└── utilities.css (106 lines) - Helper classes

components/
├── shows.css (523 lines) - Complex show layouts
├── merchandise.css (400 lines) - Product displays
├── header.css (284 lines) - Navigation & hero
├── poster-modal.css (260 lines) - Modal overlay system
├── releases.css (231 lines) - Music release cards
├── media.css (183 lines) - Gallery components
└── footer.css (109 lines) - Footer styling
```

### Content Management System

**JSON Structure (`content/`):**
- `site-config.json` - Band info, social links, streaming platforms, contact
- `shows.json` - Live shows with tours, posters, venues, bands, tickets
- `releases.json` - Discography with streaming links, physical formats
- `merchandise.json` - Products with images, pricing, purchase links
- `media.json` - Photos, videos, press coverage, logos

**Image Organization (`images/`):**
- `show-posters/` (8.3MB) - Concert posters - **NEEDS OPTIMIZATION**
- `merch/` (2.0MB) - Product photography
- `art/` (2.2MB) - Promotional artwork
- `live-photos/` (5.0MB) - Concert photography
- `releases/` (664K) - Album artwork
- `logos/` (1.2MB) - Brand assets
- `icon-social/` (40K) - Platform icons (SVG)
- `videos/` (124K) - Video thumbnails

## Key Features

### Responsive Show Display System
- **Desktop**: Horizontal layout (date | info | poster)
- **Mobile with posters**: CSS Grid (45% poster | 55% content)
- **Mobile without posters**: Vertical stacking
- **Smart categorization**: Auto-sorts past/future by current date
- **Tour grouping**: Multi-show tours display as collapsible sections

### Advanced Poster Modal
- Full-screen poster viewing with navigation
- Keyboard controls (arrow keys, escape)
- Touch/swipe support for mobile
- Smooth transitions and loading states

### Multi-Level Carousel System
- Collection-level navigation (between releases/merch items)
- Item-level navigation (multiple images per product)
- Responsive breakpoints (3 items desktop, 1 mobile)
- Touch-friendly controls

### Progressive Enhancement
- Works without JavaScript (static HTML)
- Graceful image loading with error handling
- CORS-enabled JSON loading for local development

## Development Workflow

### Content Updates
1. **Shows**: Edit `content/shows.json`, add posters to `images/show-posters/`
2. **Releases**: Edit `content/releases.json`, add artwork to `images/releases/`
3. **Merchandise**: Edit `content/merchandise.json`, add photos to `images/merch/`
4. **Media**: Edit `content/media.json`, add files to respective image folders

### Adding New Shows
```json
{
  "id": "2025-01-15",
  "date": {"month": "JAN", "day": "15", "year": "2025"},
  "venue": "Venue Name",
  "location": "City, State",
  "poster": "images/show-posters/2025_01_15.jpg",
  "bands": ["Opener", "Lockslip", "Headliner"],
  "ticketsUrl": "https://tickets.example.com"
}
```

### Performance Optimization
- **Images**: Use `optimize_images.py` script before committing
- **Show posters**: Target 800x800px max, 80% quality
- **Merch photos**: Target 600x600px max, 85% quality
- **Consider WebP**: Add WebP conversion for better compression

## Technical Considerations

### Mobile-First Design
- CSS Grid transforms show layouts on mobile
- Touch-optimized carousel controls
- Hamburger menu with full-screen overlay
- Optimized image aspect ratios (3:4 for mobile posters)

### Accessibility Features
- Semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support
- Alt text for all images
- Focus management in modals

### Browser Compatibility
- Modern JavaScript (ES6+)
- CSS Custom Properties
- CSS Grid & Flexbox
- No build process required
- Works in all modern browsers

### Error Handling
- Graceful JSON loading failures
- Image error fallbacks (`onerror="this.style.display='none'"`)
- Console error logging for debugging
- User-friendly error messages

## Deployment

### GitHub Pages
- Repository configured for GitHub Pages deployment
- CNAME file points to custom domain
- Static assets served directly
- No Jekyll processing (vanilla HTML/CSS/JS)

### Local Development
- Python HTTP server handles CORS for JSON files
- No external dependencies or build tools
- Instant refresh on file changes
- Supports hot reloading of content

## Maintenance Tasks

### Regular Updates
- Optimize new images before committing
- Update show dates and ticket links
- Add new releases and merchandise
- Archive old shows to past section

### Performance Monitoring
- Check image file sizes (use `du -sh images/*`)
- Monitor total bundle size
- Test mobile performance
- Validate JSON syntax

### Code Quality
- No TODO/FIXME comments found (clean codebase)
- Consistent component architecture
- Modular CSS organization
- Semantic HTML structure

## Future Enhancements

### Priority Improvements
1. **Image Optimization**: Implement WebP with fallbacks
2. **Search Functionality**: Add show/release search
3. **Loading States**: Add skeleton loading for content
4. **Service Worker**: Enable offline functionality

### Advanced Features
- Newsletter signup integration
- Social media sharing
- Analytics tracking
- SEO structured data
- Progressive Web App features