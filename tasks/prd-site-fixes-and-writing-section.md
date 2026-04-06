[PRD]

# PRD: Site Visual Fixes, halimmadi.com Parity, and Writing Section

## Overview

The oulipo.xyz site has several visual and content issues that need fixing to match the source of truth at halimmadi.com. The Connect page has clutter (too many horizontal rules, spacing inconsistencies in dynamically rendered events, and link formatting issues). The burger menu is invisible across the site. Most pages lack the white top bar present on the home page. Work detail pages stack all images at the top instead of distributing them through the text. The works overview page is missing images for 10 entries. The books page uses wrong cover images. Additionally, a new "Writing" section is needed to surface Substack content.

## Goals

- Fix all visual inconsistencies on the Connect page (line clutter, spacing, link formatting)
- Make the burger menu visible and match halimmadi.com sizing across all pages
- Add the white header bar (name + burger) to every page, matching home page
- Redistribute images on work detail pages to match halimmadi.com layout (interspersed with text)
- Add representative images to all works on the overview page (def(hug) through Avenir)
- Fix books page to use correct cover images from halimmadi.com at correct sizing
- Populate keynotes/workshops pages with real images (or create clear placeholder folders)
- Add a Writing section that surfaces Substack posts as crisp summaries

## Quality Gates

These must pass for every user story:

- **No broken images**: `grep -r 'src="' *.html | xargs -I {} curl -sf {} > /dev/null` - all image src paths resolve to actual files
- **Visual verification**: Open each modified page in browser and compare side-by-side with halimmadi.com
- **Responsive check**: Verify at 600px, 900px, and full-width breakpoints
- **No regressions**: Existing fonts, alignment, and design language must be preserved

---

## User Stories

### US-001: Clean Up Connect Page Line Clutter

**Description:** As a visitor, I want the Connect page to feel clean and minimal so that content is easy to scan without visual noise.

**Acceptance Criteria:**

- [ ] Remove excessive `<hr>` tags - the current pattern of `<hr>` after every section title AND after every entry creates too many lines
- [ ] Specifically: remove `<hr>` between "Connect" title and connect-links, reduce `<hr>` between "Latest Work" and "Latest Writing" sections to feel less segmented
- [ ] "Latest Work" (Word Garden) should not have a horizontal rule both above and below it - simplify to a single separator or spacing
- [ ] The overall visual rhythm should use whitespace (margin/padding) more than ruled lines
- [ ] Keep the page feeling structured but not caged

---

### US-002: Fix Upcoming Events Formatting on Connect Page

**Description:** As a visitor, I want the dynamically rendered upcoming events to display cleanly without spacing artifacts.

**Acceptance Criteria:**

- [ ] Remove the separate "Link ↗" element from event rendering entirely. Instead, make the bolded event title (the `<b>org → title</b>` line) itself the clickable link. E.g., clicking "CultureHub LA → Everyone" navigates to the event URL. Update `renderEvent()` in connect/index.html accordingly.
- [ ] Fix the "Jun 29 - 30" display next to "Coimbra, Portugal" - there's a strange extra space in the meta line assembly. Check `buildMetaLine()` for trailing/leading whitespace in the join logic
- [ ] Fix "Jun 18 - 19" similarly - ensure all date_display values render without extra gaps
- [ ] Verify at narrow viewport widths that "Connect" in the page title line doesn't render with overlapping or muddy line artifacts

---

### US-003: Fix Invisible Burger Menu Across All Pages

**Description:** As a visitor, I want to see and use the burger menu on every page so I can navigate the site.

**Acceptance Criteria:**

- [ ] Scrape halimmadi.com to determine the exact burger menu size (the 3-bar icon dimensions, stroke width, spacing)
- [ ] Current CSS: `.menu-toggle` is `width: 20px; height: 20px` with `padding: 12px` (declared twice - first `padding: 0` then `padding: 12px`). The double padding declaration may be causing issues - the first `padding: 0` is overridden by `padding: 12px` but the `width/height: 20px` combined with padding creates a confusing box model
- [ ] Fix the `.menu-toggle` CSS to match halimmadi.com exactly - likely needs: explicit width/height for the clickable area, consistent padding, and the span bars should be visually prominent
- [ ] Verify the burger menu is visible on: home, works, keynotes, workshops, books, about, connect, upcoming, cv
- [ ] Verify the menu opens/closes correctly on all pages
- [ ] Test at 600px and 768px breakpoints

---

### US-004: Add White Header Bar to All Pages

**Description:** As a visitor, I want every page to have the same white top bar with "Halim Madi" name and burger menu, matching the home page.

**Acceptance Criteria:**

- [ ] The home page has `<div class="header-bar"></div>` (white background, fixed, 3.5rem height, z-index 150). All other pages lack this element.
- [ ] Add `<div class="header-bar"></div>` as the first element inside `<body>` on ALL pages: works, keynotes, workshops, books, about, connect, upcoming, cv, and all work/book detail pages
- [ ] Move the `.header-bar` CSS from home page's inline `<style>` into `shared.css` so it's available everywhere
- [ ] Include the responsive override: `@media (max-width: 600px) { .header-bar { height: 2.8rem; } }`
- [ ] Verify the header bar doesn't overlap or push down page content (check margin-top adjustments if needed)
- [ ] Keynotes page specifically called out - must have identical top bar as home page

---

### US-005: Redistribute Images on Work Detail Pages to Match halimmadi.com

**Description:** As a visitor viewing individual work pages, I want images interspersed with text (as on halimmadi.com) rather than all stacked at the top.

**Acceptance Criteria:**

- [ ] Scrape each work page on halimmadi.com to determine the exact image-text interleaving pattern per work
- [ ] Currently all 17 work detail pages use: `<detail-header>` then `<detail-gallery>` (all images) then `<detail-body>` (all text). This must change to match halimmadi.com's pattern where images appear between paragraphs
- [ ] For each work detail page, restructure HTML so images are placed between text paragraphs matching halimmadi.com's layout
- [ ] Update CSS as needed - may need a new layout class for inline images between paragraphs (e.g., full-width image between `<p>` tags)
- [ ] Gallery images that remain grouped should keep the `.two-col` or `.three-col` grid where appropriate
- [ ] Apply to ALL 17 work detail pages (even text-only ones stay text-only)
- [ ] Preserve all existing alt text and image paths

**Files affected:** All `/works/{slug}/index.html` pages and potentially `shared.css`

---

### US-006: Add Images to Works Overview Page (def(hug) through Avenir)

**Description:** As a visitor browsing the works overview, I want every work entry to have a representative image so the page feels complete.

**Acceptance Criteria:**

- [ ] The following 10 works on `/works/index.html` currently have `text-only` class with no images: Feed It, Weirder Webs, Deserve It, def(hug), Invasions (Performance), Whomp, Borrow & Never Give Back, Re/declarations, American Metabolisis, Avenir
- [ ] For works WITH image subdirectories (feed-it, weirder-webs, deserve-it, whomp, borrow-never-give-back, re-declarations, american-metabolisis, avenir): scrape halimmadi.com/works to determine which image is used as the representative overview image, then use that same image
- [ ] For works WITHOUT image subdirectories (def-hug, invasions-performance): check halimmadi.com for images. If none exist there either, leave as text-only
- [ ] Add 1-2 images per entry using the existing `.work-entry-images` grid (`.single` for one image, default 2-col for two)
- [ ] Remove the `.text-only` class from entries that now have images
- [ ] Use relative paths: `../Assets/images/works/{slug}/{filename}`

---

### US-007: Fix Books Page Images to Match halimmadi.com

**Description:** As a visitor, I want each book on the books overview page to show the correct image from halimmadi.com at proper sizing.

**Acceptance Criteria:**

- [ ] Scrape halimmadi.com/books (or each individual book page) to determine which image is used next to each of the 4 books
- [ ] Current images used: `invasions-cover.jpg`, `flight-cover.jpg`, `deep-fast-cover.jpg`, `scandal-cover.jpg` - verify these match halimmadi.com. If halimmadi.com uses 3D mockup renders instead of flat covers, switch to the 3D versions (which exist in `Assets/images/books/{slug}/` subdirectories)
- [ ] Fix image sizing - the current grid is `7fr 5fr` with image on left. Match the proportions and visual weight from halimmadi.com
- [ ] Ensure images are not stretched or compressed - use `object-fit: contain` if needed
- [ ] Verify at 900px and 600px breakpoints

**Files affected:** `/books/index.html`, potentially image files in `/Assets/images/books/`

---

### US-008: Fix Keynotes and Workshops Missing Images (Gray Squares)

**Description:** As a visitor, I want the keynotes and workshops pages to show real images instead of gray placeholder squares.

**Acceptance Criteria:**

- [ ] Scrape halimmadi.com/keynotes and halimmadi.com/workshops to find the actual images used
- [ ] Available images already scraped: `Assets/images/keynotes/` has 6 images, `Assets/images/workshops/` has 2 images
- [ ] If gray squares exist because HTML references images that don't exist, fix the `src` paths to point to existing images
- [ ] If gray squares exist because the `<img>` tags have no `src` or use placeholder styling, replace with actual images
- [ ] If specific images are missing and can't be scraped, create clearly named placeholder folders with a README noting which images are needed:
  - `Assets/images/keynotes/NEEDED/` with a text file listing missing image descriptions
  - `Assets/images/workshops/NEEDED/` with a text file listing missing image descriptions
- [ ] Verify no broken `<img>` tags remain on either page

---

### US-009: Add Writing Page (Books + Substack Auto-Fetch via RSS)

**Description:** As a visitor, I want a dedicated Writing page that shows Halim's books and auto-fetches his Substack posts, so I can browse all his written work in one place.

**Acceptance Criteria:**

- [ ] Create a standalone `/writing/index.html` page
- [ ] **Books section at the top**: Display all 4 books in a 2-column card grid inspired by the Singulars performances layout (see reference screenshot). Each book card has: cover image, title (linked to book detail page), date, short description. Cards should be compact - not the full book-entry treatment from the current books page.
- [ ] Auto-fetch Substack posts from `https://halimmadi.substack.com/feed` (RSS) using client-side JavaScript
- [ ] **Latest Writing section**: The 3 most recent Substack posts displayed prominently below the books
- [ ] **Archive**: Full list of all Substack posts in a clean chronological list below
- [ ] Each Substack entry shows: title (linked to Substack post), one-line summary/hook, date
- [ ] The Connect page keeps its existing "Latest Writing" section with the 3 hardcoded Substack links - these stay as-is
- [ ] Add "Writing" as a new nav menu item across all pages (in the side menu, alongside Works/Keynotes/Workshops/Books)
- [ ] Maintain existing brand: Standard font, monospace captions, no shadows/gradients, opacity-based color system
- [ ] Handle RSS fetch errors gracefully (show fallback message)
- [ ] Responsive: 2-col book cards collapse to 1-col at 600px

---

### US-010: Add Writing to Navigation Menu

**Description:** As a visitor, I want to find the Writing page from the navigation menu.

**Acceptance Criteria:**

- [ ] Keep "Newsletter" link as-is in the nav (still points to halimmadi.substack.com with external arrow)
- [ ] Add a new "Writing" link in the nav menu, positioned in the first section alongside Works/Keynotes/Workshops/Books
- [ ] "Writing" links to `/writing/` (the new page from US-009)
- [ ] Update across ALL pages that have the nav menu (30+ HTML files)
- [ ] No external arrow on Writing link (it's an internal page)

---

## Functional Requirements

- **FR-1:** The `.menu-toggle` button must be visible on all pages with dimensions matching halimmadi.com exactly
- **FR-2:** Every page must include the `.header-bar` div providing a white fixed bar at the top
- **FR-3:** The Connect page must render upcoming events without extra spacing between link text and arrows
- **FR-4:** Upcoming events on Connect page must use the bolded title line as the clickable link - no separate "Link ↗" element
- **FR-5:** Work detail pages must interleave images with text paragraphs matching the halimmadi.com layout per-work
- **FR-6:** All 17 works on the overview page must have at least one representative image (except works with genuinely no images available)
- **FR-7:** Each book on the books overview must show the correct image as shown on halimmadi.com
- **FR-8:** The Writing page must auto-fetch Substack posts via RSS and display them with title, summary, and date
- **FR-9:** A "Writing" link must appear in the nav menu on all pages, alongside Works/Keynotes/Workshops/Books
- **FR-10:** "Newsletter" stays as-is in the nav (external link to Substack)
- **FR-11:** All changes must preserve current font choices, sizing, and alignment (explicitly praised by user)

## Non-Goals (Out of Scope)

- Changing the overall site design, typography, or alignment (these are good as-is)
- Building a CMS or dynamic content management system
- Adding a full blog engine - the Writing section is a simple static or RSS-based listing
- Changing the side menu drawer behavior or animation
- Modifying the CV or upcoming pages (beyond header bar addition)
- Adding new fonts or CSS frameworks
- Changing the Supabase events schema

## Technical Considerations

- **Static site**: No build step, no framework. All changes are direct HTML/CSS edits.
- **halimmadi.com scraping**: Use the established Cargo CDN pattern with `Referer: https://www.halimmadi.com/` header to bypass 403 blocks. Image URLs use `freight.cargo.site/w/SIZE/i/HASH/FILENAME` format.
- **Supabase events**: The Connect page renders events dynamically from Supabase. Formatting fixes (US-002) require changes to the JavaScript `renderEvent()` and `buildMetaLine()` functions.
- **30+ HTML files**: The header bar (US-004) and nav rename (US-010) touch every page. Use a systematic find-and-replace approach.
- **Image redistribution (US-005)**: This is the most labor-intensive story. Each of the 17 work pages needs individual attention to match halimmadi.com's specific layout.

## Success Metrics

- Zero gray squares / broken images across the entire site
- Burger menu visible and functional on every page
- Side-by-side comparison with halimmadi.com shows matching layout for works, books, and detail pages
- Connect page loads cleanly with no visual clutter or spacing artifacts
- Writing section successfully surfaces at least 3 Substack posts

## Open Questions

1. ~~Writing page location~~ **RESOLVED**: Standalone `/writing/` page, plus keep the 3 latest links on Connect page
2. ~~Newsletter rename~~ **RESOLVED**: Keep "Newsletter" as-is. Add separate "Writing" nav item
3. ~~Static vs RSS~~ **RESOLVED**: Auto-fetch via Substack RSS feed
4. ~~CultureHub LA~~ **RESOLVED**: Keep event data as-is. The fix is to make the bolded event title the clickable link and remove the separate "Link ↗" element from all events
5. **Substack RSS CORS**: Substack RSS may not allow direct browser-side fetch due to CORS. May need a CORS proxy (e.g., `cors-anywhere`, Cloudflare Worker, or a serverless function). Alternatively, could use Substack's API if available. Needs investigation during implementation.

[/PRD]
