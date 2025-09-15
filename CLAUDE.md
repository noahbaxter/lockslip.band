# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Website
```bash
python3 server.py
```
Starts a local development server on port 8000 with CORS headers enabled for JSON content loading.

### Image Optimization
```bash
# Setup (one-time)
python3 -m venv image_optimizer_env
source image_optimizer_env/bin/activate
pip install Pillow pillow-heif

# Usage
source image_optimizer_env/bin/activate
python optimize_images.py path/to/images [options]

# Common use cases:
python optimize_images.py images/show-posters -q 80 --max-width 800 --max-height 800
python optimize_images.py images/releases -q 85 --max-width 600 --max-height 600
```

## Architecture Overview

### Content-Driven Single Page Application
This is a static band website that dynamically loads all content from JSON files, allowing non-technical content updates without touching code.

**Core Architecture:**
- `index.html` - Static HTML shell with placeholder sections
- `styles.css` - Complete styling with responsive mobile layouts
- `js/content-loader.js` - Loads and renders all dynamic content from JSON
- `js/mobile-menu.js` - Handles responsive navigation
- `content/*.json` - All website content (shows, releases, merch, config)

### Content System
The entire website content is managed through JSON files in `/content/`:

- `site-config.json` - Site settings, social links, streaming platforms
- `releases.json` - Music releases with streaming links and artwork
- `shows.json` - Live shows with dates, venues, bands, and poster images
- `merchandise.json` - Merch items with pricing and purchase links
- `media.json` - Photos, videos, logos, and press coverage

### Key Technical Details

**Content Loading Flow:**
1. `ContentLoader` class fetches all JSON files in parallel
2. Renders content into placeholder HTML sections
3. Handles error states if JSON files are missing/invalid

**Show Display Logic:**
- Automatically categorizes shows as past/future based on current date
- Shows with posters get special layout treatment
- Mobile layout uses CSS Grid for poster + text columns
- Desktop maintains horizontal date | info | poster layout

**Responsive Design:**
- Mobile: Hamburger menu with full-screen overlay
- Shows with posters: 45%/55% grid (poster/content) on mobile
- Poster aspect ratios: 3:4 on mobile, original on desktop
- Bands list hidden on mobile for shows with posters

**Image Organization:**
- `/images/show-posters/` - Concert poster images
- `/images/releases/` - Album/EP artwork
- `/images/icon-social/` - Platform icons (SVG format)
- `/images/art/` - Background and promotional images

### Content Update Workflow
1. Edit JSON files in `/content/` directory
2. Add images to appropriate `/images/` subdirectories
3. Reference image paths in JSON (e.g., `"images/show-posters/poster.jpg"`)
4. Changes appear immediately on page refresh

### Mobile-Specific Considerations
- Shows with posters use completely different layout structure on mobile
- CSS Grid template areas reorganize content: poster left, date/venue/location right
- Poster images forced to 3:4 aspect ratio via CSS
- Desktop layout reverts to original horizontal flow

### Error Handling
- Content loader shows error page if JSON files fail to load
- Images have fallback hiding if file missing (`onerror="this.style.display='none'"`)
- Server includes CORS headers to prevent local file loading issues