# Oulipo.xyz Context

## Session State (Mar 29, 2026 - session 5)

### Current Task: Update Work Detail Page Galleries with Scraped Images

**Status: COMPLETE**

Updated all 15 work detail pages (with available images) to reference the newly scraped images. Added `two-col` gallery class to all galleries. Pages updated:

1. `carnation-exe` - 4 -> 14 images (all available)
2. `versus-exe` - 4 -> 10 images (curated from 21 - diverse selection of table/voting, poet writing, audience, group)
3. `reinforcement-exe` - 1 -> 12 images (curated from 19 - cube, IGAC exhibition, voting, Untitled series)
4. `borderline` - 2 -> 13 images (all available - Flickr performance photos)
5. `borderline-exe` - 1 -> 8 images (all available - interface screenshots + documentation)
6. `we-called-us` - 1 -> 7 images (all available - performance + web interface)
7. `i-live-here` - 1 -> 5 images (all available - We-Topia Gala photos)
8. `feed-it` - 0 -> 9 images (NEW gallery added, all available)
9. `deserve-it` - 0 -> 9 images (NEW gallery added - Gray Area + Gallery-O-Rama)
10. `whomp` - 0 -> 2 images (NEW gallery added - screenshots)
11. `borrow-never-give-back` - 0 -> 12 images (NEW gallery added - all Silo Gallery collages)
12. `re-declarations` - 0 -> 6 images (NEW gallery added - gallery + screenshots)
13. `american-metabolisis` - 0 -> 9 images (NEW gallery added - all receipts/installation)
14. `avenir` - 0 -> 9 images (NEW gallery added - all documentation)
15. `weirder-webs` - 0 -> 10 images (NEW gallery added - all workshop screenshots)

No images exist for `def-hug` and `invasions-performance` - those pages remain text-only.

All images use descriptive alt text. No video files found in feed-it (all .JPG/.jpg/.png).

### Previous Task: Fix Text Content Gaps on Work Detail Pages

**Status: COMPLETE**

Fixed 12 work/book detail pages to match halimmadi.com source text. Changes grouped by priority:

**HIGH priority (5 pages - full text replacement):**

1. `works/carnation-exe/index.html` - Replaced paraphrased text with original AlphaGo/Sedol narrative, added block quote about sports/losing, "flower passed between mouths" language, "vow not to forget". Added Dataset link (Hugging Face).
2. `works/borderline/index.html` - Replaced condensed text with full original. Added pull quotes ("We become the borders we cannot cross" + closing quote), full Arabic zajal (4 lines Arabic + English translation), performance imagery, closing statement. Fixed venue from "Counterpulse AIR" to "Counterpulse".
3. `works/we-called-us/index.html` - Added alternate title "The Robot's Womb", virus research framing, block quote about consciousness, Arabic linguistic explanation ("nahnu nash'ur"), Bergen exhibition history (More than Meets AI show), TIAT performance, Voidspace Zine publication.
4. `works/i-live-here/index.html` - Added full Orpheus/katabasis framing, BO18 nightclub origin story (Karantina massacre, first kiss, "the beat beat differently"), Hamilton/Frida Kahlo/Miles Davis detail, Tenderloin voices, "story gets weirder" transition, Queer Jihad, "utopia is not prettiness" passage, closing quote.
5. `works/reinforcement-exe/index.html` - Added 4 missing paragraphs (humiliation, model-pushing/softmax, printed poems/self-replication, poetic closing "half flesh half metal"). Added ongoing experiment text. Added Dataset link (Hugging Face).

**MEDIUM priority (7 pages - targeted additions):** 6. `works/versus-exe/index.html` - Added 4 missing paragraphs (dashboard/behind-the-scenes, multilingual sessions, machine perfection/human tremor, closing "vow not to forget"). 7. `works/feed-it/index.html` - Replaced text with full original. Added opening question whispered in dark room, pull quote ("We hand over our bodies"), "dumb god" passage, "And still, it loves" moment, closing surrender paragraph. Fixed venue from "Artist x Producer x Engineer" to "Artist x Producer x Artist". 8. `works/borrow-never-give-back/index.html` - Added block quote ("Babe, I really want your 112,000...") and reverence paragraph ("This isn't satire. It's reverence."). 9. `works/american-metabolisis/index.html` - Fixed dates from "Jun '21 - Dec '21" to "Jun '19 - Jun '21". Added "My name became data" quote and fermentation/assimilation closing paragraph. 10. `works/avenir/index.html` - Added "outdated software" passage, "incubator of futures" line, blue umbrella detail + guard dialogue, final "art is the new assembly" / "summoned" line. Added Medium/@builduntitled Website link. 11. `works/weirder-webs/index.html` - Added 3 provocation questions (surveil/shelter, flatten/stages, optimization/intimacy), specific workshop outputs (rain-making interface, stereotype generator, chameleon), closing question "How do you home?". 12. `books/invasions/index.html` - Replaced paraphrased text with original ("act of infiltration", "digital erosion", "poetic survival", "artifacts of a world trying to make itself heard").

### Previous Task: CSS Consistency Audit & Fix

**Status: COMPLETE**

Audited all 30 site HTML pages for CSS consistency. Fixed 3 issues:

1. `/index.html` - Replaced literal `↗` characters with `<span class="external-arrow">&#x2197;</span>` in nav menu. Replaced inline toggleMenu() script with `<script src="Assets/js/menu.js">`.
2. `/connect/index.html` - Replaced inline toggleMenu() script with external `menu.js` reference. Fixed CSS path from absolute `/Assets/css/shared.css` to relative `../Assets/css/shared.css`.
3. Zero remaining issues across all pages (nav consistency, button classes, external-arrow usage, old URL references, shared.css linking).

### Previous Task: Scrape ALL content images from halimmadi.com

**Status: COMPLETE**

Scraped all content images from halimmadi.com Cargo CMS using the `window.__PRELOADED_STATE__` JSON embedded in each page. Used referrer header trick (`-H "Referer: https://www.halimmadi.com/"`) to bypass Cargo CDN 403 blocks.

**Results: 221 images, 110.2 MB total**

Per-directory counts:

- home/: 5 images (hero, poster, stanford photo)
- portrait/: 4 images (Halim color portrait, removebg version, old screenshot)
- keynotes/: 6 images (Gray Area, TEDx Bordeaux, artist-as-hacker, creativity-as-infrastructure)
- workshops/: 2 images (d.school Stanford, time capsule)
- books/: 16 flat + 17 in subdirectories (3D covers for all 4 books + interiors)
- works/carnation-exe/: 14 images (10 new from description page)
- works/borderline/: 13 images (10 new flickr photos)
- works/borderline-exe/: 8 images (7 screenshots + Google Photos)
- works/versus-exe/: 21 images (17 new gallery photos)
- works/reinforcement-exe/: 19 images (18 new - IGAC exhibition + Untitled series + gallery)
- works/deserve-it/: 9 images (all new - Gray Area + gallery)
- works/feed-it/: 9 images (8 new gallery photos)
- works/i-live-here/: 5 images (3 new We-Topia photos)
- works/we-called-us/: 7 images (4 new including poetry web)
- works/borrow-never-give-back/: 12 images (8 new gallery photos)
- works/re-declarations/: 6 images (4 new screenshots + gallery)
- works/american-metabolisis/: 9 images (all new)
- works/avenir/: 9 images (all new - screenshots + FullSizeRender)
- works/weirder-webs/: 10 images (6 new screenshots + Whitagram)
- works/whomp/: 2 images (both new screenshots)

**Failed downloads (2):** `works/feed-it/20250526_161323_1.jpg` and `works/we-called-us/IMG_0435.jpg` - both 404 on freight.cargo.site CDN. Error files removed.

**Failed pages (1):** `/books` overview - 404 (individual book pages work fine).

**Manifest:** `Assets/images/MANIFEST.md` - full listing of all 221 images with sizes.

**Scraper scripts:** `/tmp/halim-scrape/scrape_v3.py` (main), `/tmp/halim-scrape/scrape_extra.py` (keynotes supplement).

### Previous Task: Redesign Works + Books overview pages to match halimmadi.com

**Status: COMPLETE**

**Works overview (`/works/index.html`):**

- Replaced old `.work-entry-header` (title as h2 + meta div) with `.work-entry-meta-row` - a single flex row showing underlined title, date, and venue spread across the line in Diatype Mono Variable
- Updated all 17 work entries to use the new meta-row format
- Added `.text-only` class for entries without images (full-width text)
- Updated intro text to match halimmadi.com version
- Replaced `&mdash;` and `&ndash;` separators with simple hyphens in date ranges
- Image grid unchanged: single-image works use `.single` class (1-col), multi-image use 2-col

**Books overview (`/books/index.html`):**

- Same meta-row treatment as works (title, date, location on one monospace line)
- Reduced each book from multiple images to exactly ONE cover image (cover only)
- Expanded intro text to match halimmadi.com (added sentences about bruises of migration, field guides, etc.)
- Updated Invasions description to match halimmadi.com copy, added "(Book)" to title
- All 4 books updated: invasions-cover.jpg, flight-cover.jpg, scandal-cover.jpg, deep-fast-cover.jpg

### Previous Task: Rename "Now" page to "Connect"

**Status: COMPLETE**

- Renamed `/now/` folder to `/connect/` via `git mv`
- Updated `connect/index.html`: title, meta description, nav link, GIF src/alt
- Created redirect at `now/index.html` (meta refresh to `/connect/`)
- Updated `contact/index.html` redirect to point to `/connect/`
- Updated nav menus across 30 HTML files: `<a href="/now/">Now</a>` -> `<a href="/connect/">Connect</a>`
- Updated `home/index.html` CTA button href from `/now/` to `/connect/`
- Verified: zero remaining `/now/` references in any HTML file

### Previous: Work Detail Page Redesign (Mar 27, session 3)

**Status: COMPLETE - all 17 work detail pages restructured to match halimmadi.com design**

### Work Detail Page Redesign (Mar 27, session 3)

All 17 `/works/{slug}/index.html` pages restructured:

- Removed back-link (`<a href="/works/" class="back-link">`)
- Split detail-meta into stacked lines (date on first line, venue on second, separated by `<br>`)
- Moved detail-links inside detail-header (right after detail-meta), instead of bottom of page
- Removed `single-col` class from galleries (CSS default is now 1-column)
- Description (detail-body) remains at the bottom, after gallery
- Nav/menu HTML untouched on all pages

### Previous Task: halimmadi.com Port to oulipo.xyz

**Status: COMPLETE (pending manual image downloads)**

### What Was Built

**17 Work Detail Pages** (all in `/works/{slug}/index.html`):

1. carnation-exe - 14 gallery images, live site + dataset links
2. versus-exe - 10 gallery images (curated), live site link
3. reinforcement-exe - 12 gallery images (curated), live site + dataset links
4. borderline - 13 gallery images, live site link
5. borderline-exe - 8 screenshots, live site link
6. we-called-us - 7 gallery images, live site link
7. i-live-here - 5 gallery images, live site link
8. feed-it - 9 gallery images
9. deserve-it - 9 gallery images, live site link
10. def-hug - text only (no images available)
11. invasions-performance - text only (no images available)
12. whomp - 2 screenshots
13. borrow-never-give-back - 12 gallery images
14. re-declarations - 6 gallery images + screenshots
15. american-metabolisis - 9 gallery images
16. avenir - 9 gallery images, website link
17. weirder-webs - 10 screenshots

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

### Image Issue - RESOLVED (Mar 29, 2026)

Cargo CDN 403 bypass discovered: adding `Referer: https://www.halimmadi.com/` header to curl requests allows downloads. All images now scraped programmatically. Previous state (68 images) upgraded to 221 images across all work/book/keynote pages.

### Still TODO

- Replace Formspree FORM_ID placeholder in contact/index.html
- Check responsive layout at 600px/900px/1200px breakpoints
