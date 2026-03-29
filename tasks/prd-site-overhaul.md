[PRD]

# PRD: Oulipo.xyz Site Overhaul

## Overview

The oulipo.xyz site was ported from halimmadi.com (Cargo) but has accumulated visual inconsistencies, missing images, layout mismatches, and broken design patterns. This PRD covers two phases:

- **Phase 1 (Immediate)**: Fix all visual/structural issues - arrows, menu size, page layouts, image scraping, page rename, and CSS consistency
- **Phase 2 (Medium-term)**: Build a unified filterable works page backed by Supabase, with 10 static HTML mockup variations for review

## Goals

- Every page on oulipo.xyz visually matches or improves upon halimmadi.com
- ALL external link arrows use the `.external-arrow` class consistently (zero bare `&#8599;` entities)
- ALL images from halimmadi.com are scraped, organized, and referenced correctly
- The /now/ page is renamed to /connect/ with updated nav across all pages
- Buttons, fonts, spacing, and hover states are consistent site-wide
- Phase 2 produces 10 static mockups of a unified works+books page with filter UI, backed by a Supabase `works` table

## Reference Screenshots

**`comparisons/` folder** contains 16 screenshots from halimmadi.com showing the target design for each page. Agents working on any user story MUST review the relevant screenshots before making changes. Key screenshots:

| Timestamp | Content                                                                                                                     |
| --------- | --------------------------------------------------------------------------------------------------------------------------- |
| 15.00.14  | Works overview - top (We Called Us Poetry entry, title styling, image layout)                                               |
| 15.00.22  | Works overview - scrolled (Reinforcement.exe, image-left text-right layout)                                                 |
| 15.01.59  | Keynotes - "Rewiring the System" section with video embed (compact, left-aligned)                                           |
| 15.02.02  | Keynotes - video embed continued (responsive YouTube, description beside video)                                             |
| 15.02.05  | Keynotes - full page top (4 theme sections: Make Room, Creativity as Infrastructure, Artist as Hacker, Rewiring the System) |
| 15.03.00  | Books overview - Invasions entry (ONE cover image, text right, clean layout)                                                |
| 15.03.11  | Workshops - top (large title, "Rewriting Our Tools / Rethinking Our Roles" tagline, intro text, full-width photo)           |
| 15.03.13  | Workshops - Corporations section (bordered box, full-width event image)                                                     |
| 15.03.16  | Workshops - entries with LOGOS (Meta, Google, Prophet - logo left, text right)                                              |
| 15.03.21  | Workshops - entries with LOGOS (Johns Hopkins, UC Berkeley, Stanford)                                                       |
| 15.03.23  | Workshops - Creative Communities section (full-width photo, heading, description)                                           |
| 15.04.34  | Keynotes - theme sections with IMAGES (Make Room + EDx photo, Creativity as Infrastructure)                                 |
| 15.04.37  | Keynotes - Rewiring the System video entries (video left, metadata+description right)                                       |
| 15.04.39  | Keynotes - more video entries (Inventing Viral Gods, How to Hack a Body)                                                    |
| 15.04.41  | Keynotes - last entries (Army with No Flag, You Are the Black Box) + footer icons                                           |
| 15.04.50  | Keynotes hero image (Creative thinking for complex times)                                                                   |

## Quality Gates

These checks must pass for every user story:

- **Visual verification**: Open every modified page in browser, verify correct rendering at 600px, 900px, and 1200px widths
- **Link audit**: All internal links resolve (no 404s), all external links have `target="_blank"` and `rel="noopener noreferrer"`
- **Arrow audit**: `grep -r "&#8599;" --include="*.html"` returns zero results (all arrows use `.external-arrow` span)
- **Nav consistency**: Every page's side menu has identical link structure

---

# PHASE 1: Immediate Fixes

---

### US-001: Scrape all content images from halimmadi.com

**Description:** As a developer, I want all content images from halimmadi.com downloaded and organized into local folders so that every page can reference local assets instead of missing or placeholder images.

**Acceptance Criteria:**

- [ ] Use a reliable scraper (e.g., `wget --recursive` with image filters, or a Python script using requests + BeautifulSoup) to extract all content images from halimmadi.com
- [ ] Images organized into existing folder structure: `Assets/images/{works,books,keynotes,workshops,portrait,home}/`
- [ ] Work-specific images go into subdirectories: `Assets/images/works/carnation-exe/`, `Assets/images/works/versus-exe/`, etc.
- [ ] Book-specific images go into subdirectories: `Assets/images/books/invasions/`, `Assets/images/books/deep-fast/`, etc.
- [ ] Skip logos, icons, favicons, and background textures - only content images (photos, covers, screenshots)
- [ ] Cargo image URLs use `freight.cargo.site/w/SIZE/i/HASH/FILENAME` format - extract hash-to-filename mappings from page JSON
- [ ] Create a manifest file (`Assets/images/MANIFEST.md`) listing every downloaded image, its source URL, and destination path
- [ ] All downloaded images are under 2MB each (resize if larger)

**Technical Notes:**

- Cargo embeds image metadata in preloaded JSON on each page. Extract with: `curl -sL "https://www.halimmadi.com/PAGE" | grep -oE '"name":"[^"]*\.(jpg|jpeg|png)"[^}]*"hash":"[^"]*"'`
- Download URL format: `https://freight.cargo.site/w/1500/i/HASH/FILENAME`

---

### US-002: Reduce burger menu icon size

**Description:** As a visitor, I want the burger menu icon to be proportionally sized so it doesn't dominate the header area.

**Acceptance Criteria:**

- [ ] `.menu-toggle` in `Assets/css/shared.css` changed from `width: 24px; height: 24px` to `width: 20px; height: 20px`
- [ ] Span lines inside `.menu-toggle` remain at 2px height, gap adjusted proportionally
- [ ] Touch target maintained at minimum 44x44px via padding (add padding if needed)
- [ ] Verified on mobile (600px) and desktop (1200px) - icon is visible and tappable
- [ ] All pages inherit the change via shared.css (no inline overrides)

---

### US-003: Fix all arrow inconsistencies site-wide

**Description:** As a visitor, I want all external link arrows to look identical everywhere on the site so the design feels polished and consistent.

**Acceptance Criteria:**

- [ ] Every external link arrow uses `<span class="external-arrow">&#x2197;</span>` markup
- [ ] Zero instances of bare `&#8599;` remain in any HTML file (verify with grep)
- [ ] Fixed locations include:
  - `books/index.html`: Kickstarter and Amazon links for all 4 books
  - `about/index.html`: CV, Press Kit, GitHub, Instagram, LinkedIn, YouTube, Newsletter links
  - `works/index.html`: All work entry links (Live site, Dataset, etc.)
  - All 17 work detail pages: external links in `.detail-links` sections
  - All 4 book detail pages: Kickstarter and Amazon links
- [ ] `.external-arrow` class in shared.css uses Diatype Mono Variable with `font-variation-settings: "slnt" 0, "MONO" 1`
- [ ] Arrows render identically to side menu arrows on every page

---

### US-004: Rename Now page to Connect

**Description:** As a visitor, I want the contact/connect page to be at /connect/ with a clear name so I know where to find contact info.

**Acceptance Criteria:**

- [ ] Folder renamed: `git mv now connect`
- [ ] `connect/index.html` title changed to "Connect - Halim Madi"
- [ ] Meta description updated to reflect "Connect" naming
- [ ] All nav links across all pages updated: `href="/now/"` becomes `href="/connect/"`
- [ ] Side menu text changes from "Now" to "Connect"
- [ ] `now/` directory no longer exists (verify with `ls`)
- [ ] Old `/now/` URL handled: create `now/index.html` with `<meta http-equiv="refresh" content="0;url=/connect/">` redirect
- [ ] Home page CTA button ("Contact Halim") links to `/connect/`
- [ ] Verify: `grep -r "/now/" --include="*.html"` returns only the redirect file

---

### US-005: Books overview page - single image per book

**Description:** As a visitor, I want the books overview page to show one cover image per book (matching halimmadi.com) so the page is clean and scannable, with additional images reserved for detail pages.

**Acceptance Criteria:**

- [ ] Each book entry on `books/index.html` shows exactly ONE image (the 3D cover rendering)
- [ ] Cover images to keep: `invasions-cover.jpg`, `flight-cover.jpg`, `deep-fast-cover.jpg`, `scandal-cover.jpg`
- [ ] Additional interior/detail images removed from overview, moved to respective detail pages
- [ ] Layout matches halimmadi.com: image LEFT (using `order: -1`), text RIGHT, 7fr/5fr grid
- [ ] Book detail pages (`books/invasions/index.html`, etc.) contain ALL images including the ones removed from overview

---

### US-006: Match works overview title and layout styling to halimmadi.com

**Description:** As a visitor, I want the works overview page to match halimmadi.com's visual treatment of work titles, metadata, and image grids.

**Acceptance Criteria:**

- [ ] Analyze halimmadi.com/works and compare title styling, metadata position, and image grid layout
- [ ] Work entry titles (h2) styled consistently: 1.3rem, underlined, Diatype Variable
- [ ] Metadata (date, venue) uses Diatype Mono Variable, `var(--type-size-caption)`, placed directly below title
- [ ] Image grids match halimmadi.com per work:
  - Single image works: full width (1fr grid)
  - 2-image works: side by side (1fr 1fr)
  - 4-image works: 2x2 grid (1fr 1fr, gap 0.5rem)
- [ ] Featured tags present on: Carnation.exe, Borderline, We Called Us, Versus.exe, Reinforcement.exe, Oulipo.xyz
- [ ] "Works" h1 at top in Terminal Grotesque, 4rem

---

### US-007: Match book detail page image layouts to halimmadi.com

**Description:** As a developer, I want each book detail page to display images in the same layout as its halimmadi.com counterpart so the visual experience matches the original.

**Acceptance Criteria:**

- [ ] Analyze each book's page on halimmadi.com for exact image count, order, and layout
- [ ] `books/invasions/index.html`: Cover image prominent at top, interior images below in appropriate layout
- [ ] `books/flight-of-the-jaguar/index.html`: Cover + VR video embed + interior image
- [ ] `books/deep-fast/index.html`: Cover + 2 interior images
- [ ] `books/in-the-name-of-scandal/index.html`: Cover + 3 interior images
- [ ] Images use scraped assets from US-001 (correct file paths)
- [ ] Gallery layout uses `.detail-gallery` classes from shared.css

---

### US-008: Match work detail page image layouts to halimmadi.com

**Description:** As a developer, I want each work detail page to display images in the same layout as its halimmadi.com counterpart.

**Acceptance Criteria:**

- [ ] Analyze each work's description page on halimmadi.com for image count, order, and layout
- [ ] Update all 17 work detail pages with correct image references and gallery layouts
- [ ] Key pages with multiple images:
  - `works/carnation-exe/index.html`: 4 gallery + 2 description images
  - `works/we-called-us/index.html`: 8+ images
  - `works/versus-exe/index.html`: 7 images
  - `works/reinforcement-exe/index.html`: 15+ images
  - `works/feed-it/index.html`: images + video embed
- [ ] Images use scraped assets from US-001
- [ ] Gallery layouts use `.detail-gallery`, `.two-col`, `.three-col` classes as appropriate
- [ ] Video embeds use responsive 16:9 container (56.25% padding-bottom technique)

---

### US-008b: Re-scrape full text for all individual work and book pages

**Description:** As a developer, I want the complete text content from every individual work and book page on halimmadi.com so that our detail pages have the full descriptions, not truncated versions.

**Acceptance Criteria:**

- [ ] Re-scrape ALL text from each individual work description page on halimmadi.com (the previous scrape missed content on several pages including carnation, american metabolisis, invasions, etc.)
- [ ] For each work/book, capture: full description paragraphs, pull quotes, image captions, credit lines, collaborator names, and any other text content
- [ ] Compare scraped text against current detail page content - identify gaps where text was truncated or missing
- [ ] Update all 17 work detail pages and 4 book detail pages with complete text
- [ ] Preserve HTML formatting: paragraph breaks, emphasis, block quotes
- [ ] For works with no full page on Cargo (def(hug), Invasions Performance) - document that these only have short descriptions
- [ ] Save raw scraped text to `.private/scraped-descriptions-v2.md` for reference

---

### US-009: Fix workshops page layout

**Description:** As a visitor, I want the workshops page to match halimmadi.com's structure with categorized sections, photos, logos, and placeholder images ready for real photos where missing.

**Reference screenshots:** `comparisons/CleanShot 2026-03-29 at 15.03.11`, `15.03.13`, `15.03.16`, `15.03.21`, `15.03.23`

**Acceptance Criteria:**

- [ ] Large "Workshops" h1 title at top in Terminal Grotesque (matching halimmadi.com)
- [ ] Tagline row beneath title: "REWRITING OUR TOOLS" and "RETHINKING OUR ROLES" in monospace, separated
- [ ] Intro paragraph with 3 bold audience segments ("For executives...", "For artists...", "For students...")
- [ ] Full-width hero photo below intro (use scraped image or grey placeholder)
- [ ] Three category sections: "Creative Communities", "Classrooms", "Corporations"
- [ ] Each category section has:
  - h2 heading (bold)
  - Intro paragraph with description
  - Full-width section photo (scraped or grey placeholder)
- [ ] Workshop entries within each section use this layout (from screenshots):
  - Metadata row: title (monospace, left), date (monospace, center), venue+location (monospace, right)
  - Below metadata: organization LOGO on left (~100px wide), description paragraph on right
  - Logos visible in screenshots: Johns Hopkins, UC Berkeley, Stanford, Meta, Google, Prophet, TIAT, Mozilla, Gray Area, SF Art Fair
- [ ] Where real logos are missing, use grey placeholder with `data-placeholder="true"`
- [ ] Where real photos are missing, use grey placeholder box (`background: rgba(0, 0, 0, 0.08)`) with 16:9 aspect ratio and `data-placeholder="true"`
- [ ] Entries separated by 1px border (rgba(0, 0, 0, 0.1))
- [ ] Page matches halimmadi.com workshops structure as shown in comparison screenshots

---

### US-010: Fix keynotes page video display and layout

**Description:** As a visitor, I want the keynotes page to match halimmadi.com's layout with hero image, theme sections with photos, and compact video entries with side-by-side metadata.

**Reference screenshots:** `comparisons/CleanShot 2026-03-29 at 15.02.05`, `15.04.34`, `15.04.37`, `15.04.39`, `15.04.41`, `15.04.50`

**Acceptance Criteria:**

- [ ] Hero image at top: full-width photo ("Creative thinking for complex times" - see 15.04.50)
- [ ] Intro paragraph below hero
- [ ] Four theme sections, each with:
  - h2 heading ("Keynotes that Make Room", "Creativity as Infrastructure", "Artist as Hacker", "Rewiring the System")
  - Description paragraph
  - Section photo on the RIGHT side of the heading/description (see 15.04.34 - EDx photo next to "Make Room")
  - Horizontal rule separating sections
- [ ] Video entries within "Rewiring the System" use side-by-side layout (see 15.04.37):
  - Metadata row: title (monospace, bold), year (monospace), venue+location (monospace)
  - Below: video embed LEFT (~40-50% width), description paragraph RIGHT
  - NOT full-width video - compact, fitting within the content flow
- [ ] All YouTube embeds use responsive container with 56.25% padding-bottom
- [ ] Each theme section has "Selected talks:" label above entries
- [ ] All 7 videos display correctly:
  - RTmyFg4l5yc (Weirding AI)
  - NUH9c76gt68 (The Death of Stars)
  - hCwKWmRaBMA (Joy is a System)
  - -6iQUtJRUh8 (Inventing Viral Gods)
  - OPrnQqlND_o (How to Hack a Body)
  - 4YOElE7zKTQ (The Army with No Flag)
  - ELehUZgGU0k (You Are the Black Box)

---

### US-011: Clean up Connect page (formerly Now)

**Description:** As a visitor, I want the Connect page to be clean, well-styled, and consistent with the rest of the site.

**Acceptance Criteria:**

- [ ] GIF removed from the page
- [ ] Contact links at top styled with `.button-8` class (matching home page CTAs) - small, outlined buttons
- [ ] Button styles consistent with home page: `0.2rem solid border`, `0.5rem border-radius`, `0.8rem 1rem padding`
- [ ] All `.button-8` styles defined once in `shared.css` (no inline duplication)
- [ ] Page uses `shared.css` link instead of duplicating styles inline
- [ ] Upcoming events section cleaned up:
  - Remove inline CSS duplication (link to shared.css)
  - Clean, readable event list
  - Consistent typography (Diatype Mono for dates, Standard for descriptions)
- [ ] Responsive at 600px, 900px, 1200px
- [ ] Use ui-ux-pro-max skill recommendations for layout optimization

---

### US-012: Clean up CV page

**Description:** As a visitor, I want the CV page to be visually clean and consistent with the site's design system.

**Acceptance Criteria:**

- [ ] Page uses `shared.css` link instead of duplicating styles inline
- [ ] Custom styles kept to minimum, defined in `<style>` block for page-specific needs only
- [ ] Section headings use Diatype Variable, consistent with other pages
- [ ] Date/metadata uses Diatype Mono Variable
- [ ] Column layout responsive: 2 cols at 600px, 3 cols at 900px, 4 cols at 1200px
- [ ] Event links use `.external-arrow` class for arrows
- [ ] Typography sizes match the rest of the site (body text, captions)
- [ ] Remove any redundant CSS that's already in shared.css

---

### US-013: CSS consistency audit and button standardization

**Description:** As a developer, I want all pages to use shared.css as the single source of truth for common styles, with `.button-8` as the standard button class everywhere.

**Acceptance Criteria:**

- [ ] All pages link to `shared.css` (no pages duplicating shared styles inline)
- [ ] `.button-8` is the only button style used across the site
- [ ] `.button-8` definition in shared.css: outlined, 0.2rem solid border, 0.5rem border-radius, 0.8rem 1rem padding, Standard font, rgba(0, 0, 0, 0.85) color, opacity 0.7 hover, 0.3s ease transition
- [ ] No inline `style` attributes that override shared.css patterns (except page-specific layout)
- [ ] `.external-arrow` defined once in shared.css, used everywhere
- [ ] `.caption` class standardized for all metadata/date displays
- [ ] Verify: every page's `<head>` includes `<link rel="stylesheet" href="../Assets/css/shared.css" />` (or appropriate relative path)

---

# PHASE 2: Unified Works Page (Medium-term)

---

### US-014: Create Supabase works table

**Description:** As a developer, I want a `works` table in the `oulipo_dashboard` schema (oulipo_main Supabase project) alongside the existing `events` table, so that works and books data can be fetched dynamically for the unified page.

**Acceptance Criteria:**

- [ ] Table created: `oulipo_dashboard.works`
- [ ] Schema includes:
  - `id` (uuid, primary key, default gen_random_uuid())
  - `title` (text, not null)
  - `slug` (text, unique, not null)
  - `type` (enum: 'performance', 'book', 'installation', 'workshop_piece', 'digital', 'film')
  - `date_start` (date)
  - `date_end` (date, nullable)
  - `venue` (text)
  - `location` (text)
  - `short_description` (text) - for overview cards
  - `long_description` (text) - for detail pages (full HTML or markdown)
  - `cover_image` (text) - primary image path
  - `images` (jsonb) - array of additional image paths
  - `tags` (text[]) - filterable tags (e.g., 'ai', 'poetry', 'performance', 'queer', 'migration', 'computational')
  - `series` (text, nullable) - e.g., 'singulars' for carnation/versus/reinforcement
  - `external_links` (jsonb) - array of {label, url} objects
  - `featured` (boolean, default false)
  - `sort_order` (integer)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())
- [ ] Row-level security: public read access (anon key), write access restricted
- [ ] Seed script created (`scripts/seed-works.mjs`) that populates all 17 works + 4 books from existing page data
- [ ] Works table lives in `oulipo_dashboard` schema alongside the existing `events` table
- [ ] `works` and `events` are separate tables (no foreign keys between them) but coexist in the same schema for future integration
- [ ] Supabase project is `oulipo_main` (ref: smytgqkgomsfyurskpcl)
- [ ] Publishable anon key documented for browser-side fetching

---

### US-015: Create 10 unified works page design variations

**Description:** As Halim, I want to review 10 different layout approaches for a unified works+books page so I can choose the best direction before implementation.

**Acceptance Criteria:**

- [ ] Create folder: `designs/unified-works/`
- [ ] 10 standalone HTML files: `variation-01.html` through `variation-10.html`
- [ ] Each file is self-contained (inline CSS, no external dependencies needed to view)
- [ ] Each variation includes:
  - Filter/theme bar at top with clickable tags
  - Work cards that show/hide based on filter selection
  - Mix of works AND books in the same grid
  - Responsive layout (works at 600px, 900px, 1200px)
- [ ] Variations should explore different approaches:
  1. Masonry grid with tag pills
  2. Singulars-inspired 3-column grid with grayscale-to-color hover
  3. Full-width horizontal cards with large images
  4. Minimal list view (title + date + type only, expand on click)
  5. Timeline/chronological view
  6. Bento grid (mixed card sizes)
  7. Magazine layout (featured hero + smaller grid)
  8. Two-panel (filters left sidebar, works right)
  9. Isotope-style animated filtering with smooth transitions
  10. Card stack / carousel per category
- [ ] Each variation uses oulipo brand: Standard/Terminal Grotesque/Diatype fonts, opacity-based colors, no shadows/rounded corners/gradients
- [ ] Filter tags include: All, Performance, Book, Installation, Digital, AI, Poetry, Queer, Migration, Singulars
- [ ] Sample data from real works (at least 8 entries with real titles, dates, descriptions)
- [ ] Each variation has a `<!-- VARIATION: [name] - [1-line description] -->` comment at top

---

## Functional Requirements

- FR-1: The image scraper must handle Cargo's `freight.cargo.site/w/SIZE/i/HASH/FILENAME` URL format
- FR-2: All external links must open in new tab (`target="_blank"`) with `rel="noopener noreferrer"`
- FR-3: All external link arrows must use `<span class="external-arrow">&#x2197;</span>` - no exceptions
- FR-4: The burger menu must maintain a 44x44px minimum touch target even at 20x20px visual size
- FR-5: Grey placeholder images must use `data-placeholder="true"` attribute for easy future replacement
- FR-6: The Connect page must not duplicate shared.css styles inline
- FR-7: The CV page must not duplicate shared.css styles inline
- FR-8: Video embeds must use responsive 16:9 containers (56.25% padding-bottom)
- FR-9: The Supabase works table must have public read access via anon key
- FR-10: Design variations must be self-contained HTML files viewable by opening directly in a browser
- FR-11: The `/now/` URL must redirect to `/connect/` via meta refresh
- FR-12: The `/contact/` URL must continue to redirect (update to point to `/connect/`)

## Non-Goals (Out of Scope)

- **No framework migration**: Site stays static HTML/CSS - no React, Next.js, or build tools
- **No dark mode**: Not implementing dark mode or theme switching
- **No CMS**: Content stays in HTML files (except Phase 2 Supabase data)
- **No image optimization pipeline**: Images downloaded as-is, no WebP conversion or CDN setup
- **No SEO overhaul**: Meta tags and OG images are out of scope
- **No mobile app**: Desktop and responsive web only
- **No analytics**: No tracking pixels or analytics integration
- **Phase 2 does NOT include building the final unified page** - only the 10 mockups and Supabase table

## Technical Considerations

- **Cargo image scraping**: halimmadi.com uses Cargo CMS which stores images on `freight.cargo.site`. Each image requires both a hash and filename in the URL. Hash-to-filename mappings are embedded in page JSON.
- **Supabase project**: `oulipo_main` (ref: smytgqkgomsfyurskpcl). Contains two schemas: `singulars` (performances/poems) and `oulipo_dashboard` (events). Contains two schemas: `singulars` (performances/poems) and `oulipo_dashboard` (events + new `works` table).
- **Publishable key**: `sb_publishable_m509hZmnUb8NZRG94irXqA_AViI-8qf` (same as events)
- **CSS shared.css**: Located at `Assets/css/shared.css`. All pages should link to this. Page-specific styles go in inline `<style>` blocks.
- **File structure**: Overview pages at `/works/index.html`, detail pages at `/works/[slug]/index.html`
- **Responsive breakpoints**: 900px (grid collapse), 768px (menu full-width), 600px (reduced padding/type)

## Success Metrics

- Zero bare `&#8599;` arrow entities in any HTML file
- Every page's visual layout matches or improves upon halimmadi.com equivalent
- All images load from local `Assets/images/` paths (no external freight.cargo.site references)
- Burger menu visually smaller but still easily tappable on mobile
- Connect page is clean, GIF-free, with consistent button styling
- 10 design variations produced and reviewable in `designs/unified-works/`
- Supabase `oulipo_dashboard.works` table populated with all 21 entries (17 works + 4 books)

## Open Questions

1. **Book detail page: Flight of the Jaguar** has a VR video on halimmadi.com - should we embed the video or screenshot it?
2. **Reinforcement.exe** has 15+ images - should the detail page show all of them or cap at a reasonable number (e.g., 8-10)?
3. **Design variations**: Should any of the 10 mockups include JS-based filtering (vanilla JS) or keep them purely CSS (`:checked` + sibling selectors)?
4. **Connect page upcoming events**: Keep fetching from Supabase or switch to static HTML for now?

[/PRD]
