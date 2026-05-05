# PRD: oulipo.xyz · halimmadi.com merge — v2 site rebuild

**Status:** locked direction · ready for implementation
**Date:** 2026-05-02
**Owner:** Halim Madi
**Source wireframes:** [wireframes/v2.html](../wireframes/v2.html)
**Source canvas (full exploration):** [wireframes/index.html](../wireframes/index.html)

---

## 1. Overview

Merge the existing static halimmadi.com (portfolio) and oulipo.xyz (poetry/experiments hub) into a single site whose **landing page is the works browse page**. Add a persistent top email-signup bar (auto-subscribes to Substack) and a Parallel.ai-style command surface (HUMAN/MACHINE toggle, "/" + ⌘K palette, single-letter keyboard shortcuts) that lets visitors and developer-curious users navigate by typing.

The current site is two disconnected static sites; this rebuild collapses them into a coherent IA with four section "tribes" (machine talk, algorithmic plays, somatic semantics, tools), color-coded throughout, with per-section landing pages reachable via category-tag clicks or palette commands.

---

## 2. Goals

- **Reduce friction to subscribe.** Newsletter signup visible on every page, single field, one click.
- **Lead with the work.** Landing page IS the works browse page — name is small, work is big.
- **Make the IA legible.** Four named sections, each color-coded and reachable both visually (cards, tags) and via keyboard (`/works machine-talk`, key shortcut, palette).
- **Communicate "this person codes."** Parallel-style command palette + key shortcuts make it obvious without saying it.
- **Match brand.** Standard / Terminal Grotesque / Diatype Variable / Diatype Mono Variable. Paper #fafaf7 / ink #1a1a1a. Section accent colors used as accents only (top borders, dots, tags), never as body text on white.
- **Dark mode supported.** MACHINE mode = always dark; HUMAN mode = system preference + manual override.

---

## 3. Quality Gates

These commands must pass for every user story:

- `npx html-validate "**/*.html"` — HTML validity across the static site
- `npx playwright test` — smoke tests for: signup post, palette open/close, key shortcuts, view-toggle, category navigation
- `npx @lhci/cli autorun --collect.staticDistDir=.` — Lighthouse score thresholds: a11y ≥ 95, performance ≥ 90, best-practices ≥ 95
- **Visual review at 3 breakpoints:** 375px (mobile), 768px (tablet), 1280px (desktop) — must be confirmed by Halim before merge

For UI stories, **manual visual verification is required** (not just automated tests).

---

## 4. User Stories

### US-001: Persistent top signup bar

**Description:** As a visitor, I want a thin email-signup bar at the top of every page so that I can subscribe to the newsletter from anywhere on the site without scrolling.

**Acceptance Criteria:**

- [ ] Bar is fixed to viewport top, height 44–52px, full-width
- [ ] Left: "halim madi" wordmark in Diatype Mono Variable, links to `/`
- [ ] Right: visible label `email`, single email input, `subscribe` link/button
- [ ] Visible on all pages, including the landing page (does not overlap the hero — body has matching padding-top)
- [ ] Input has `<label for="email">` (accessible) and `inputmode="email"`
- [ ] On submit, posts to Substack signup endpoint, shows inline success/error in the bar (no page reload)
- [ ] Validates on blur (browser default email validation is acceptable)
- [ ] Bar collapses to wordmark + tappable "subscribe" affordance at <600px (form expands when tapped)

### US-002: Landing page hero/about block

**Description:** As a first-time visitor, I want to immediately understand who Halim is and the four kinds of work he does, so that I can choose where to dive in.

**Acceptance Criteria:**

- [ ] Below the top signup bar: `<h1>Halim Madi</h1>` (Terminal Grotesque)
- [ ] 4-line intro paragraph (≤ 4 sentences, Diatype Variable, max-width 56ch)
- [ ] 4 category fields rendered as a 2×2 grid (desktop) / 1-col stack (mobile)
- [ ] Each category field shows: color dot + category name (h2 Diatype Variable bold) + 1-line explanation (Diatype Variable regular)
- [ ] Category names: `Machine talk`, `Algorithmic plays`, `Somatic semantics`, `Tools`
- [ ] Each category color-coded with its accent color (machine #F6009B, theater #2AA4DD, semantics #8B5CF6, tools #02F700)
- [ ] Each category field is clickable, navigating to its category landing page

### US-003: Landing page works browser

**Description:** As a visitor, I want the bottom of the landing page to be a browse-able works list so that I can explore what Halim has made without leaving the page.

**Acceptance Criteria:**

- [ ] Below the about block: works list, year-grouped
- [ ] Cards are edge-to-edge of the content column (no inset padding inside the card, full content width)
- [ ] Each card shows: title (h3 Diatype Variable bold), venue/context (Diatype Mono Variable uppercase), location, year, doc/asset count
- [ ] Each card has a category tag in the category's accent color
- [ ] Year groups separated by horizontal rule with the year label in Diatype Mono Variable
- [ ] Clicking a card navigates to the individual work page; clicking the tag navigates to the category landing page
- [ ] Layout matches HHMD reference at mobile (single-col stack) and switches to 2-col at ≥900px

### US-004: HUMAN/MACHINE mode toggle

**Description:** As a visitor, I want to toggle between a "human" reading experience and a "machine" command-palette-first dark mode so that I can navigate the site the way I prefer.

**Acceptance Criteria:**

- [ ] Toggle is fixed to bottom-right, two radio dots: `◯ HUMAN  ◉ MACHINE` (Diatype Mono Variable, uppercase)
- [ ] HUMAN mode: paper background, ink text, default site
- [ ] MACHINE mode: ink background (#0a0a0a), paper text, command palette open by default, page content collapsed to monospace markdown-style link list (mirroring Parallel screenshot 2)
- [ ] Toggle state persists in `localStorage` under key `oulipo.mode`
- [ ] Toggle has visible focus ring; reachable by Tab; activatable by Space/Enter
- [ ] Pressing the `m` key toggles between modes (when not focused in an input)

### US-005: Command palette ("/" and ⌘K)

**Description:** As a visitor (esp. a developer), I want to type commands to navigate so that I can move around the site faster than clicking.

**Acceptance Criteria:**

- [ ] Pressing `/` (when not focused in an input) or `⌘K`/`Ctrl+K` (always) opens the palette
- [ ] Palette is a modal overlay: input at top, list of suggestions below
- [ ] Suggestions show: command name, short description, and a `Page` / `Action` chip on the right
- [ ] Default command set: `/works`, `/works machine-talk`, `/works algorithmic-plays`, `/works somatic-semantics`, `/works tools`, `/connect`, `/writing`, `/about`, `/keynotes`, `/workshops`, `/newsletter` (focuses the top signup field)
- [ ] Typing filters the list (case-insensitive substring match on command + description)
- [ ] `↑` `↓` arrow keys move selection; `Enter` fires; `Esc` closes
- [ ] Closes after navigation; restores focus to the prior element
- [ ] Visible focus ring on input; entire palette is keyboard-only operable
- [ ] In MACHINE mode, the palette is open by default and cannot be dismissed (Esc minimizes the page content but palette stays in input-focus state)

### US-006: Single-letter keyboard shortcuts

**Description:** As a visitor, I want single-letter shortcut buttons in the corner that fire on key press so that I can jump to common destinations.

**Acceptance Criteria:**

- [ ] Bottom-right corner (next to HUMAN/MACHINE toggle): three labeled buttons `CONNECT [c]`, `INSTAGRAM [i]`, `NEWSLETTER [n]`
- [ ] Pressing the letter (when not focused in an input, palette closed) fires the action
  - [ ] `c` → navigates to `/connect`
  - [ ] `i` → opens `https://instagram.com/yalla_halim` in a new tab
  - [ ] `n` → focuses the email input in the top signup bar
- [ ] Buttons themselves are clickable (same actions)
- [ ] Buttons have visible focus rings and `aria-keyshortcuts` attribute
- [ ] Shortcut hint chips use Diatype Mono Variable, monospace 1, 0.85rem

### US-007: Works page — view toggle (Categories | Works)

**Description:** As a visitor, I want two ways to browse the works — by category or as a flat list — so that I can either explore a tribe or scan everything.

**Acceptance Criteria:**

- [ ] Top of `/works` shows a toggle: `Categories | Works` (Diatype Mono Variable, current view bold/underlined)
- [ ] **Categories view (default):** 4 stacked edge-to-edge cards, one per category, each with name + description + 3 sample works inside
- [ ] **Works view:** flat list of all works (edge-to-edge cards, year-grouped), with a category-filter rail on the right (sticky on desktop, collapsible on mobile)
- [ ] Filter rail: 5 chips (`all` + 4 categories), color-coded; clicking a chip filters the list in place (no page navigation)
- [ ] Toggle state and active filter persist in URL query (`?view=categories` or `?view=works&filter=machine-talk`)

### US-008: Category landing page

**Description:** As a visitor clicking a category tag, I want to land on a page dedicated to that category so that I can read about the tribe and see all its works.

**Acceptance Criteria:**

- [ ] Routes: `/works/machine-talk`, `/works/algorithmic-plays`, `/works/somatic-semantics`, `/works/tools`
- [ ] Top: category name as h1 (Terminal Grotesque), color dot to its left
- [ ] Description paragraph below (Diatype Variable, ~3 sentences)
- [ ] Works list below (edge-to-edge cards, same component as `/works` view)
- [ ] Breadcrumb at top: `works › machine-talk` (Diatype Mono Variable)
- [ ] Page is reachable from: landing page category card, works page chip in Categories view, any work card's category tag, palette `/works <category>` command

### US-009: Keynotes & Workshops page

**Description:** As an organizer, I want to see Halim's keynote and workshop offerings side by side so that I can pick the right format for my event.

**Acceptance Criteria:**

- [ ] Route: `/speaking` (single page combining keynotes + workshops)
- [ ] Desktop: 50/50 split, vertical divider; left = Keynotes, right = Workshops
- [ ] Mobile: stacked, Keynotes on top
- [ ] Each side has: bold h2 name, ~2-line manifesto, logos strip (3–6 institutions: google, stanford, umd, mozilla, gray area, culturehub), video grid (3–4 thumbnails of past talks)
- [ ] Each side has a CTA: `book a talk →` / `host a workshop →` linking to `/connect` with the relevant door pre-selected
- [ ] Top signup bar persists; bottom HUMAN/MACHINE toggle + shortcut chips persist

### US-010: Individual work page

**Description:** As a visitor clicking a work, I want a single page that gives me the full picture: header context, then text and images alternating.

**Acceptance Criteria:**

- [ ] Route: `/works/<slug>` (slug stored in works table)
- [ ] Top: 2-column editorial header — left: category dot + section label, h1 title (Terminal Grotesque), description paragraph, meta (commissioner, collaborators, year), buttons (live model / read paper / etc.); right: hero image (3:4 portrait or 16:9 wide depending on orientation)
- [ ] Mobile: stacks (text first, then image)
- [ ] Below header: alternating text blocks and image blocks (single column, image grid, full-bleed image)
- [ ] Footer of page: prev/next work navigation + back to `/works/<category>`

### US-011: About page

**Description:** As a visitor, I want a richer "About" page with bio + portrait + timeline so that I can understand Halim's trajectory.

**Acceptance Criteria:**

- [ ] Route: `/about`
- [ ] Top: portrait left (3fr), bio block right (5fr) — name h1, pronouns/locations meta, bio paragraph, residencies + awards lists
- [ ] Below: timeline (year + event rows, dashed separator between rows, ≥5 entries)
- [ ] No standalone signup card here (the persistent top bar is enough)

### US-012: Writing page

**Description:** As a visitor interested in Halim's writing, I want to see books and essays in one place.

**Acceptance Criteria:**

- [ ] Route: `/writing`
- [ ] Top: page h1 + 1-line description (Diatype Variable)
- [ ] Books grid: 4 columns desktop, 2 mobile; each book has cover image, title, format/year
- [ ] Essays/zines list below: title + venue, dashed separators
- [ ] **No signup card on this page** (top bar handles it)

### US-013: Connect page

**Description:** As someone who wants to reach out, I want to pick the purpose of my message before I write it so that Halim can prioritize.

**Acceptance Criteria:**

- [ ] Route: `/connect`
- [ ] Top: h1 `say hi.` + 1-line description
- [ ] "I'm here to..." radio selector with 4 doors: `book a talk`, `commission a piece`, `press / interview`, `just say hi`
- [ ] Selected door is visually distinct (filled ink background, paper text, 2px hand-drawn shadow)
- [ ] Below: unified contact form — name, email, message
- [ ] Inline checkbox: `also subscribe me to the letter` (defaults checked)
- [ ] Submit posts to a serverless endpoint (Vercel function or similar) that emails halim@oulipo.xyz and, if checkbox checked, also subscribes to Substack
- [ ] Pre-select door via query param: `/connect?door=book-a-talk`

### US-014: Auto-subscribe integration with Substack

**Description:** As a backend, I want signup form submissions to flow to Substack so that subscribers automatically receive the newsletter.

**Acceptance Criteria:**

- [ ] Single signup endpoint at `/api/subscribe` (Vercel serverless function)
- [ ] Endpoint accepts `{ email }`, validates format, posts to Substack's signup endpoint (or stores in Supabase + cron-syncs — pick one in implementation)
- [ ] Returns `200` with `{ ok: true }` on success, `400` with `{ error }` on bad input, `500` with `{ error }` on upstream failure
- [ ] Signup bar (US-001), connect page checkbox (US-013), and palette `/newsletter` (US-005) all call this endpoint
- [ ] Successful submission shows inline confirmation; email is not retried automatically

### US-015: Dark mode

**Description:** As a visitor, I want a dark theme that matches the brand so that I can read in low-light or prefer dark UI.

**Acceptance Criteria:**

- [ ] Two CSS variable sets: light (paper #fafaf7, ink #1a1a1a) and dark (paper #0a0a0a, ink #f5f5f0)
- [ ] Section accent colors stay vivid in dark mode
- [ ] Mode resolution order: MACHINE toggle → manual HUMAN-mode dark override → `prefers-color-scheme`
- [ ] All components tested in both modes; no contrast failures (≥4.5:1 body text)

---

## 5. Functional Requirements

- FR-1: The system MUST render a persistent signup bar at the top of every page.
- FR-2: The system MUST allow keyboard navigation between bar → main content → footer, with Tab order matching visual order, and provide a `skip to main content` link as the first focusable element.
- FR-3: When `/` is pressed and no input is focused, the system MUST open the command palette.
- FR-4: When `⌘K` (Mac) or `Ctrl+K` (other) is pressed, the system MUST open the command palette regardless of focus.
- FR-5: When the palette is open and the user types, the system MUST filter suggestions in real time (case-insensitive substring on command + description).
- FR-6: When `Esc` is pressed and the palette is open, the system MUST close the palette and restore focus to the previously focused element.
- FR-7: When a single-letter shortcut key (`c`, `i`, `n`, `m`) is pressed and no input/palette is focused, the system MUST fire the corresponding action.
- FR-8: When the HUMAN/MACHINE toggle is set to MACHINE, the system MUST apply the dark theme, expose all page content as a markdown-style link list, and open the palette by default.
- FR-9: When a user clicks a category tag on a work card, the system MUST navigate to the corresponding category landing page.
- FR-10: When a user submits the signup form, the system MUST POST to `/api/subscribe`, show a loading state on the submit affordance, and replace it with success/error inline (no page reload).
- FR-11: When a category landing page loads with `?from=card`, the system MAY scroll the works list into view automatically.
- FR-12: When the works page loads with `?view=categories`, the system MUST render the Categories view; with `?view=works&filter=<slug>`, the system MUST render the Works view with the named filter active.
- FR-13: When the user lands on `/connect?door=<slug>`, the system MUST pre-select the named door.
- FR-14: All pages MUST render correctly at 375px, 768px, and 1280px viewport widths with no horizontal scroll.
- FR-15: All interactive elements MUST have visible focus rings (`outline: 3px solid var(--focus-ring)` or equivalent).

---

## 6. Non-Goals (out of scope)

- **CMS or admin UI.** Works data is seeded via scripts to Supabase; no in-browser editing.
- **User accounts / login.** No authentication on the public site.
- **Multi-language i18n.** English only at launch.
- **Search.** The command palette is the search surface; no full-text search of work content.
- **Comments / social interactions.** No comment threads on works.
- **Live data dashboards.** No "now training" / live performance ticker for v2 (deferred — was variant E in original exploration).
- **The "playful coder" landing element** (cursor-as-poem, terminal landing, avatar) — deferred; HUMAN/MACHINE toggle + palette are the v2 substitute for "this person codes".
- **Migrating singulars.oulipo.xyz** — stays on its own subdomain and repo.

---

## 7. Technical Considerations

### Stack

- **Static HTML + vanilla CSS + minimal JS modules**, matching existing oulipo.xyz pattern
- **No framework** (no React in production — the wireframes use React only because Babel-in-browser is convenient for sketching)
- **JS modules** in `Assets/js/`: `signup.js`, `palette.js`, `shortcuts.js`, `mode-toggle.js`, `works-view.js`
- **Serverless functions** in `api/` (Vercel): `subscribe.js`, `contact.js`

### Data

- **Works:** Supabase `oulipo_main.oulipo_dashboard.works` table (already exists per project memory)
- **Categories:** static JSON shipped in `Assets/data/categories.json` (4 entries with slug, name, color, description)
- **Build-time fetch:** a `scripts/build-works.mjs` reads from Supabase and writes `Assets/data/works.json` so production HTML can ship pre-rendered card markup without a runtime DB hit

### Routing

- Hand-authored static HTML files: `index.html`, `works/index.html`, `works/<category>/index.html`, `works/<slug>/index.html`, `speaking/index.html`, `writing/index.html`, `about/index.html`, `connect/index.html`
- Slug pages can be generated at build time from works.json

### Performance

- Lighthouse perf ≥ 90: lazy-load images below the fold, use `srcset` + WebP, preload Cargo CDN fonts
- No external JS larger than 5kb each (palette/shortcuts/mode are tiny)

### Accessibility

- All interactive elements: visible focus, `aria-label` for icon-only, `aria-keyshortcuts` for keyboard chips
- Skip link as first focusable element
- Section colors are accents only — never used as text on white
- Respect `prefers-reduced-motion` on palette open animation
- All form inputs have `<label for="">`; no placeholder-only fields

---

## 8. Success Metrics

- **Signup rate:** ≥ 2× current Substack signup rate within 30 days post-launch
- **Bounce rate on landing:** < 50% (currently unknown; baseline at launch)
- **Time-to-first-work-click on landing:** < 8 seconds for new visitors (track with privacy-respecting analytics)
- **Lighthouse a11y score:** ≥ 95 on every page
- **Palette adoption:** ≥ 5% of returning visitors invoke `/` or `⌘K` within 90 days (loose, vanity)
- **Visual sign-off:** Halim approves screenshots at 375 / 768 / 1280 for every page before merge

---

## 9. Open Questions

- **Newsletter backend.** Substack has no public signup API — implementation either: (a) embed Substack's iframe widget (loses brand control), (b) Supabase table + manual CSV import to Substack (loses real-time), or (c) ConvertKit/Buttondown migration (cleanest but a switching cost). **Need decision before US-014.**
- **Works data backfill.** Are all current works already in Supabase, or does the rebuild need a one-time import script? Project memory says works table exists but is unclear on coverage.
- **Speaking page video hosting.** Vimeo embeds vs YouTube vs self-hosted MP4? Affects card markup and Lighthouse score.
- **MACHINE-mode link list rendering.** Should it pull from a sitemap.xml or be hand-curated per page? (Simpler to ship hand-curated.)
- **Domain consolidation.** halimmadi.com → 301 to oulipo.xyz, or keep both as the same site served from both domains? Halim to confirm with registrar.

---

## Appendix A — File map (target)

```
oulipo/
├── index.html                          # landing = works browser
├── works/
│   ├── index.html                      # /works (Categories | Works toggle)
│   ├── machine-talk/index.html         # category landing
│   ├── algorithmic-plays/index.html
│   ├── somatic-semantics/index.html
│   ├── tools/index.html
│   └── <slug>/index.html               # individual work page
├── speaking/index.html                 # keynotes + workshops side-by-side
├── writing/index.html
├── about/index.html
├── connect/index.html
├── api/
│   ├── subscribe.js                    # Vercel function
│   └── contact.js
├── Assets/
│   ├── css/
│   │   ├── tokens.css                  # CSS variables, light + dark
│   │   ├── base.css                    # typography, layout primitives
│   │   ├── components.css              # signup bar, palette, shortcuts, cards
│   │   └── pages.css                   # page-specific overrides
│   ├── js/
│   │   ├── signup.js
│   │   ├── palette.js
│   │   ├── shortcuts.js
│   │   ├── mode-toggle.js
│   │   └── works-view.js
│   └── data/
│       ├── categories.json
│       └── works.json                  # built from Supabase
├── scripts/
│   └── build-works.mjs                 # build-time Supabase → JSON
├── docs/
│   └── prd-v2.md                       # this file
└── wireframes/
    ├── index.html                      # original exploration canvas
    └── v2.html                         # locked direction canvas
```

---

## Appendix B — Brand tokens (encoded)

```css
:root {
  --paper: #fafaf7;
  --ink: #1a1a1a;
  --ink-muted: rgba(0, 0, 0, 0.7);
  --ink-subtle: rgba(0, 0, 0, 0.5);
  --border: rgba(0, 0, 0, 0.75);

  --c-machine: #f6009b;
  --c-theater: #2aa4dd;
  --c-semantics: #8b5cf6;
  --c-tools: #02f700;
  --c-now: #fee005;

  --font-display: "Terminal Grotesque", serif;
  --font-body: "Standard", system-ui, sans-serif;
  --font-h2: "Diatype Variable", system-ui, sans-serif;
  --font-mono: "Diatype Mono Variable", ui-monospace, monospace;

  --focus-ring: 3px solid var(--ink);
}

[data-mode="dark"] {
  --paper: #0a0a0a;
  --ink: #f5f5f0;
  --ink-muted: rgba(255, 255, 255, 0.7);
  --ink-subtle: rgba(255, 255, 255, 0.5);
  --border: rgba(255, 255, 255, 0.75);
  --focus-ring: 3px solid var(--ink);
}
```
