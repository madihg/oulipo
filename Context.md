# Oulipo.xyz Context

## Session State (Mar 27, 2026 - session 2)

### Current Task: halimmadi.com Port to oulipo.xyz

**Status: COMPLETE (pending manual image downloads)**

### What Was Built

**17 Work Detail Pages** (all in `/works/{slug}/index.html`):
1. carnation-exe - 4 gallery images, live site link
2. versus-exe - 4 gallery images, live site link
3. reinforcement-exe - 1 gallery image (had 12 but CDN blocked)
4. borderline - 2 gallery images, live site link
5. borderline-exe - 1 screenshot, live site link
6. we-called-us - 1 gallery image, live site link
7. i-live-here - 1 gallery image
8. feed-it - text only (images not downloaded)
9. deserve-it - text only, live site link
10. def-hug - text only
11. invasions-performance - text only
12. whomp - text only
13. borrow-never-give-back - text only
14. re-declarations - text only
15. american-metabolisis - text only
16. avenir - text only
17. weirder-webs - text only

**4 Book Detail Pages** (all in `/books/{slug}/index.html`):
1. invasions - cover + 3 interior images, Kickstarter + Amazon links
2. flight-of-the-jaguar - cover + 1 interior, Kickstarter + Amazon links
3. deep-fast - cover + 2 interior images, Kickstarter + Amazon links
4. in-the-name-of-scandal - cover + 3 interior images, Kickstarter + Amazon links

**Overview Pages Updated**:
- `works/index.html` - All 17 works listed with detail page links (verified correct slugs)
- `keynotes/index.html` - All 7 YouTube embeds + talk descriptions
- `about/index.html` - Updated 4-paragraph bio, CV + Press Kit links added
- `books/index.html` - Detail page links added to all 4 book titles
- `home/index.html` - Content verified matches live halimmadi.com
- `workshops/index.html` - Content verified matches live site
- `contact/index.html` - Form fields + social links (Formspree FORM_ID placeholder remains)

**CSS Updated**:
- `Assets/css/shared.css` - Detail page styles (.back-link, .detail-header, .detail-meta, .detail-gallery, .detail-body, .detail-links, .video-container)

### Navigation Audit (COMPLETE)

All pages verified correct:
- **Fixed**: `upcoming/index.html` nav - replaced all halimmadi.com links with local paths
- **Fixed**: `cv/index.html` nav - replaced all halimmadi.com links with local paths
- **Fixed**: `works/index.html` - corrected `/works/invasions/` to `/works/invasions-performance/`
- **Fixed**: `works/index.html` - corrected `/works/borrow-and-never-give-back/` to `/works/borrow-never-give-back/`
- All 17 work detail pages: correct nav, back-links, CSS/JS paths
- All 4 book detail pages: correct nav, back-links, CSS/JS paths
- All overview pages: correct nav links
- Only remaining halimmadi.com reference: root index.html hero subtitle (intentional external link)

### Image Audit (COMPLETE)

68 images total, all properly sized (no 919-byte error files). Zero broken references. Zero orphaned images. All HTML image src attributes have matching files on disk.

### Image Issue

Cargo's CDN (freight.cargo.site) returns HTTP 403 for all requests. The Feb 22 scrape had images in flat format that were copied into subdirectory structure. Many works still have fewer images than the live site:
- reinforcement-exe: only 1 of 12+ gallery images
- we-called-us: only 1 of 6+ gallery images
- feed-it: 0 images (video + gallery missing)
- 10 work pages have text only (no images available)
- keynote talk section images not available
- Workshop photos/logos not available

**To fix**: Download images manually from halimmadi.com in a browser (Save As), since Cargo CDN blocks programmatic access.

### Still TODO
- Download remaining images from halimmadi.com (requires manual browser save)
- Replace Formspree FORM_ID placeholder in contact/index.html
- Check responsive layout at 600px/900px/1200px breakpoints
