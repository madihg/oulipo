# Oulipo.xyz Context

## Session State (Jul 2, 2026 - modern signal redesign)

### Current Task: Apply "modern signal" v3.1 design system to the Kitchen Lab landing

**Status: BUILT + VERIFYING** - index.html fully rebuilt per DESIGN-SYSTEM.md
section 10 (Halim supplied the spec in-chat; it is the IG design system for
@yalla_halim translated to web). Uncommitted - awaiting Halim's review.

What changed:

- `index.html` - complete rewrite. Tokens verbatim (blue #1C39E8, ink #0B0B0D,
  paper #FBFBF9, chrome #B8BCC2, copper #C9772E). VT323 lowercase display +
  JetBrains Mono (labels UPPERCASE 13px +0.08em, prose sentence case 16/1.65),
  loaded from Google Fonts. Nav with chrome hairline; hero with waw glyph
  mark + Beirut coordinates; announcement banner (12px blue left bar - the one
  place blue leads: Banff computational writing, Sep 07-18 2026); featured
  wall (2 tiles + hug-width chips); series rows (borderline.exe, case against
  the son, latent space games); petri-dish wall (4:5 tiles, 4px seam, 2 ink
  quote tiles + 1 copper glyph tile interleaved, chips on hover); ink footer
  (meem glyph, marquee ticker, one blue tick = the site's mark). Glitch +
  scanline micro-interactions, registration-cross cursor on walls,
  prefers-reduced-motion kills all motion. No JS. All piece links unchanged.
- `scripts/treat-images.py` - pure-Pillow port of the canonical treat.py
  (grayscale, contrast 1.15/brightness 1.05, duotone ink->paper, halftone
  cell 5 strength 0.3, seeded grain seed 7 Pegtop soft-light 0.5). Bakes
  Assets/images/kitchen-lab/treated/ (featured/series at 1080x1350, dishes
  at 640x800, JPEG q88).
- `scripts/arabic-marks.py` - Diwan Thuluth glyph marks (waw ink, meem white,
  ha copper), halftoned transparent PNGs in Assets/images/marks/.
- `scripts/check-design-system.mjs` - 17 ship checks (tokens, no pure
  white/black, casing transforms, blue budget, 4px seam, treated-only images,
  no em dashes, reduced-motion, focus ring). All pass.
- `scripts/screenshot-landing.mjs` - full-page desktop+mobile captures via
  playwright against `python3 -m http.server 4242` (launch.json:
  oulipo-static).

Gotcha fixed: tile hairlines must live on a ::before overlay - an
absolutely-positioned img paints ABOVE its parent's outline.

**MACHINE WARNING: Halim's disk is at 100% (263MB free of 228GB). A
mid-session ENOSPC killed Bash entirely. Freed session temp files; he needs
to clear space.**

Open items: Halim to approve the redesign, then commit via the usual
branch->PR path. Adversarial review workflow (wf_0e7bd33f-842) findings
applied. Old landing recoverable via git (HEAD~ index.html).

### Revision round (Jul 2, same day) - Halim's feedback

Applied 6 of 7 asks:

1. Removed the 3 unclickable filler tiles (2 quote text-tiles + copper glyph
   tile) from the petri-dish wall. Now 17 real clickable tiles only. NOTE:
   17 is prime -> the 4-col grid trails one orphan tile. No filler allowed
   (Halim's call), and all 17 sandbox pieces are already linked, so nothing
   real to pad with. Left ragged; offered to adjust.
2. Killed the featured hover scanline (the "riso comes and goes") - removed
   .tile::after entirely. Chip underline hairline on hover is the only
   remaining featured hover, quiet + intentional.
3. Announcement banner -> CONNECT CAROUSEL. 4 real upcoming events from
   Supabase public.works (Strange Choir/Coimbra Jun29-Jul3, Weird Modernisms
   Jul1-4, Becoming Crossings Jul31, Banff Sep7-18), 16s CSS step cycle,
   pause on hover, links to halimmadi.com/connect/, blue CONNECT cta. Footer
   ticker updated to the same real events.
4. Hero mark: أوليبو (oulipo in Arabic), smaller (clamp 56-96px), silver
   chrome 3D treatment. Footer mark: مطبخ (kitchen), chrome, on ink ground.
5. (same as 4)
6. Removed "Beirut-born" from footer byline.
7. BLOCKED: OpenAI gpt-image sigil EXPLORATION. Key in
   hmart-share/instagram/.env hit "Billing hard limit has been reached"
   (HTTP 400). scripts/gen-oulipo-sigils.py is READY (8 candidates: 2 oulipo
   word treatments, matbakh/mukhtabar footer words, 4 bolder abstract
   sigils) - reruns clean once Halim raises the OpenAI billing cap.

FALLBACK used for the word-marks: local code pipeline (no OpenAI) -
scripts/render-word-masks.mjs shapes Arabic via headless browser (system
Diwan Thuluth; PIL can't shape Arabic w/o libraqm), scripts/chrome-word-
marks.py applies extruded silver-chrome + blue iridescence + copper glint +
halftone. Outputs Assets/images/marks/gen/{oulipo-ar,matbakh,mukhtabar}-
chrome.png. These are the marks currently on the page.

Orphaned (no longer referenced, safe to delete): Assets/images/marks/
{waw-ink,meem-white,ha-copper}.png and scripts/arabic-marks.py.

### Revision round 2 (Jul 2, same day) - Halim's second pass

1. Blue connect banner now CLOSED on all sides (border: 1px chrome + 12px
   blue left) and given a paper background so the hero watermark doesn't
   bleed through it.
2. Hero "oulipo" mark: dropped the chrome word (looked rough), now a LARGE
   flat-ink أوليبو ghosted watermark behind the hero (.hero-mark: width
   clamp 240-500px, opacity .12, z-index -1). scripts/flat-word-marks.py
   builds it (solid ink + faint halftone) from the browser-shaped mask.
3. Footer mark: now reads "kitchen lab" = مختبر المطبخ (mukhtabar al-matbakh),
   LARGE paper-tone ghosted watermark behind footer content (.foot-glyph
   absolute, opacity .14). site-foot got position:relative + overflow:hidden;
   foot-glyph moved to be a SIBLING of .foot-inner (z-index layering).
4. Borrowed IG liquid-chrome objects (hmart-share/instagram/marks/v3/
   chrome-01 blob, chrome-04 ring, chrome-03 splash), cropped + downscaled to
   ~360px into Assets/images/marks/gen/chrome-{blob,ring,splash}.png. Placed
   subtly: chrome ring floats upper-right in hero; chrome blob inline beside
   the "petri dishes" section label; chrome splash flex-end in footer.
5. Connect carousel titles no longer truncate: removed nowrap/ellipsis, added
   .ann-slides min-height (96px desktop / 120px mobile) so absolute slides
   don't clip; banner stacks column on mobile with CTA below.

Marks now on page: gen/oulipo-ink-flat.png (hero), gen/kitchenlab-paper-flat
.png (footer), gen/chrome-{ring,blob,splash}.png. The chrome word-marks
(oulipo-ar-chrome, matbakh-chrome, mukhtabar-chrome) are now UNUSED (kept on
disk; the flat versions won).

### Revision round 3 (Jul 2, same day) - sigil exploration + review fixes

- Halim ADDED OPENAI CREDITS; scripts/gen-oulipo-sigils.py reran clean (8
  gpt-image-1 images, ~$1.7 est). RESULT: the 4 ABSTRACT sigils came out
  great (sigil-waw-molten = molten و + crown, sigil-orbit = ring+comet-tail,
  sigil-splash = symmetric seal, sigil-knot = chrome knot). The 4 Arabic
  WORD marks FAILED - gpt-image-1 cannot spell specific Arabic words
  (oulipo-diwan/kufi/matbakh/mukhtabar all misspelled). LESSON: for real
  Arabic words use the browser-shape pipeline (render-word-masks.mjs), never
  gpt-image. Contact sheet: Assets/images/marks/gen/_contact-sheet.png.
- Halim chose "upgrade the subtle spots": swapped the 3 borrowed IG chrome
  objects for the bolder generated sigils, same subtle scale/positions -
  HERO float = sigil-orbit, PETRI DISHES label inline = sigil-splash, FOOTER
  detail = sigil-waw-molten. (chrome-ring/blob/splash now unused on page.)
- Review workflow wf_d2fbdee6-042 (23 agents) confirmed 4 findings; 2 were
  FALSE POSITIVES (verifier lacked the full design doc: ticker chrome-on-ink
  is sanctioned by 10.7, footer --chrome-alt links by 10.9). Applied the 2
  real ones: .section-label + .series-kind ink-45 -> ink-60 (ink-45 = 3.12:1
  fails AA at 13px; ink-60 = 5.14:1); .chrome-inline got pointer-events:none.
  --ink-45 token now unused.

All 18 ship checks pass, no console errors. Shipped: PR #47 squash-merged to
main 2026-07-03, live on oulipo.xyz (verified, zero 4xx).

### Revision round 4 (Jul 5) - canonical sigil forms

Halim supplied two hand-picked chrome marks in ~/Downloads/export/ (mark.png
= faceted crystalline SHARD, mark-1.png = RING/torus) and set them as the
design system's canonical sigil forms. Applied:

- HERO (top) float: sigil-shard.png (was sigil-orbit).
- FOOTER (bottom) detail: sigil-ring.png (was sigil-waw-molten).
- REMOVED the inline sigil next to the "Petri dishes" label (was
  sigil-splash); reverted .section-label to a plain block.
- scripts/gen-oulipo-sigils.py rewritten: MARKS now only SHARD + RING
  variants (sigil-shard/-b, sigil-ring/-b). Dropped the Arabic word-mark
  generation entirely (gpt-image can't spell Arabic - see
  reference_gptimage_arabic.md; use render-word-masks.mjs for words).
  The oulipo chrome sigil vocabulary is now exactly two forms: faceted shard +
  ring. sigil-orbit/-waw-molten/-splash/-knot remain in gen/ but are OFF-CANON
  and unused by the page.

## Previous Session State (Apr 5, 2026 - session 7)

### Current Task: Site Quality Fixes Round 2

**Status: COMPLETE** - All 7 issues addressed. 33 files modified.

1. **Burger menu fix** (shared.css): Reduced from 44px visible to 22px visible lines with 4px gap, 1.5px line height. Added invisible `::before` pseudo-element for 44px touch target. Properly aligned with "Halim Madi" text.
2. **Removed "Books" from nav** (31 HTML files): `<a href="/books/">Books</a>` removed from all site pages. Nav now: Works/Keynotes/Workshops/Writing.
3. **Connect page overhaul** (connect/index.html): Switched from centered narrow column to full-width left-aligned layout using shared.css `.page` padding. Removed `.page-layout` wrapper. Section titles now monospace uppercase (Diatype Mono Variable). Merged "Latest Work" + "Latest Writing" into single "Latest" section with 3 items. Removed `<hr>` lines between events. Changed arrow to colon in event format (`org: title` instead of `org -> title`). Event titles use underline links instead of bold-no-decoration.
4. **Books page fixes** (books/index.html): Reduced image max-width from 320px to 200px. Changed grid from 7fr/5fr to 5fr/2fr. Enriched all 4 book descriptions from 1 paragraph to 2 paragraphs each using scraped halimmadi.com text.
5. **Writing page fix** (writing/index.html): Reduced book image max-width from 280px to 180px.
6. **Workshops image cleanup** (workshops/index.html): Removed wrong keynote images from Classrooms (ai-artist-studio.jpg) and Corporations (tedx-bordeaux-2.jpg) sections.
7. **Book detail page text enrichment** (4 files): Updated invasions, flight-of-the-jaguar, in-the-name-of-scandal, deep-fast detail pages from 1 paragraph to 3 paragraphs each using scraped halimmadi.com text.

### Previous Session State (Apr 5, 2026 - session 6)

1. **Added event to Supabase**: "Building the Strange Choir" workshop at ICCC'26, Coimbra, Portugal, Jun 29-30 (ID: 1af5dc36)
2. **PRD written**: `tasks/prd-site-fixes-and-writing-section.md` - 10 user stories
3. **US-001 DONE**: Connect page - removed excessive `<hr>` tags, added subtle bottom borders
4. **US-002 DONE**: Event formatting - bolded title is clickable link, removed separate "Link" element
5. **US-003 DONE**: Burger menu - explicit `width: 44px; height: 44px; padding: 12px; gap: 5px`
6. **US-004 DONE**: Added `.header-bar` div to all 32 pages, CSS in shared.css
7. **US-005 DONE**: Verified detail pages already match halimmadi.com (gallery block then text - no interspersing needed)
8. **US-006 DONE**: Added images to 8 text-only work entries (Feed It, Weirder Webs, Deserve It, Whomp, Borrow & Never Give Back, Re/declarations, American Metabolisis, Avenir). def(hug) and Invasions stay text-only (no images available)
9. **US-007 DONE**: Books page uses 3D mockup images, max-width 320px
10. **US-008 DONE**: Replaced gray placeholders on keynotes (4 real images) and workshops (hero + 2 category images, removed logo placeholders)
11. **US-009 DONE**: Created `/writing/index.html` - books in 2-col card grid + Substack RSS via rss2json.com
12. **US-010 DONE**: Added "Writing" nav link to all pages

### Previous Session State (Mar 29, 2026 - session 5)

### Previous Task: Update Work Detail Page Galleries with Scraped Images

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

## Working model (2026-06-01) — WORK FROM MAIN, no more worktree split

Halim and Claude now both work from the main repo at `~/Documents/oulipo`.
The earlier two-folder split (Claude committing from a `.claude/worktrees/`
checkout while Halim edited in main) caused repeated divergence: Halim's
image drops never reached the site because they lived only in his working
dir. That is retired.

How it works now:

- Halim drops images / edits files in `~/Documents/oulipo` (his folder).
- Claude edits + commits + pushes from that SAME folder. His drops are the
  files Claude commits — no bridge, no second copy.
- settings.local.json grants Claude git checkout/reset/stash/fetch/clean/
  merge/branch (plus the pre-existing add/commit/push) in the main repo.
- Ship path: short branch off origin/main → push → `gh pr merge --admin`
  (keeps a review trail; Vercel auto-deploys origin/main to www.oulipo.xyz).
- featured._ rule: whatever is named featured._ in a work's image folder is
  the cover + page hero. scripts/sync-featured-images.mjs resolves it from
  git ls-files (NOT the macOS filesystem, which leaks case-insensitive
  casing — that bit versus-exe: featured.JPG vs git's featured.jpg).
- scripts/import-from-main.mjs still exists as a bridge but is no longer the
  primary path now that work happens in main directly.
