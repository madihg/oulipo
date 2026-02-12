# PRD: Migrant Consciousness — A Blueprint for Digital Pathfinders

## Overview
An interactive narrative web piece exploring digital borders through the lens of migrant consciousness. The user lands on a page with a single line segment. By clicking, they draw a polyline across the canvas. Each time the line crosses itself, a pulsating dot appears at the intersection. Each dot opens a mini-story — a rectangle with text and images. After 7 crossings, the user can download their unique map of trespassings and discover a gallery of others' crossings.

The piece argues that crossing physical borders teaches us something about navigating digital ones — through VPNs, identity morphing, algorithmic evasion, and intentional otherness.

## Goals
- Create an immersive, contemplative interactive experience that unfolds through user-drawn line crossings
- Present 7 narrative sections in a fixed sequence tied to intersection order
- Allow users to download their unique crossing map as a personal artifact
- Build a communal gallery of crossing maps stored via Supabase
- Achieve a refined, editorial aesthetic inspired by the curl project (EB Garamond, black/white, 1px borders)
- Work fully on desktop and mobile with touch interactions

## Quality Gates

These commands must pass for every user story:
- `next build` — Production build succeeds
- `next lint` — Linting passes

For UI stories, also include:
- Visual verification in browser at desktop (1440px) and mobile (375px) viewports

## User Stories

### US-001: Project scaffolding and design tokens
**Description:** As a developer, I want the Next.js project initialized with TypeScript, Tailwind, and curl-inspired design tokens so that all subsequent work builds on a consistent foundation.

**Acceptance Criteria:**
- [ ] Next.js 14 project with TypeScript and Tailwind CSS in `/Users/halim/Documents/becoming-borders`
- [ ] EB Garamond loaded from Google Fonts (weights 400, 500, 600 + italic)
- [ ] Tailwind config includes design tokens: colors (black `#000`, white `#fff`, grays via `rgba(0,0,0,x)`), font family (`'EB Garamond', Georgia, serif`), border (`1px solid #000`), shadow scale matching curl project
- [ ] `globals.css` sets base styles: white background, black text, EB Garamond as default, generous line-height (1.6-2.0)
- [ ] Single root page (`app/page.tsx`) renders a blank white viewport
- [ ] Git initialized with `.gitignore`

### US-002: Responsive viewport-bounded canvas
**Description:** As a user, I want to see a full-viewport canvas that adapts to my screen size so the drawing experience fills my view.

**Acceptance Criteria:**
- [ ] HTML Canvas element spans maximum viewport area (accounting for any persistent UI like counter/about)
- [ ] Canvas resizes on window resize while preserving drawn content (redraw on resize)
- [ ] Canvas uses `devicePixelRatio` for crisp rendering on retina displays
- [ ] Single horizontal line segment rendered at center of canvas on load (the starting segment)
- [ ] Starting segment is black, stroke width ~2px, length proportional to viewport width (~30-40%)

### US-003: Polyline drawing via click/tap
**Description:** As a user, I want to click (or tap) on the canvas to draw a continuous line so that I can create my own pattern of crossings.

**Acceptance Criteria:**
- [ ] First click extends a line from one end of the initial segment to the click position
- [ ] Subsequent clicks extend from the last click position to the new one (polyline behavior)
- [ ] Line renders immediately with black stroke (~2px), matching the initial segment style
- [ ] Touch events work on mobile (tap to draw)
- [ ] Each new segment animates in (subtle draw effect, ~0.3s)

### US-004: Intersection detection and dot placement
**Description:** As a user, I want dots to appear wherever my line crosses itself so that I discover the narrative content through my own drawing.

**Acceptance Criteria:**
- [ ] Line-segment intersection algorithm detects when a newly drawn segment crosses any previously drawn segment
- [ ] A dot (circle, ~12-16px diameter) appears at the exact intersection point
- [ ] Dots are black initially with a subtle pulse animation (scale 1→1.1→1, 2s loop, ease-in-out)
- [ ] Multiple intersections from a single segment are all detected and rendered
- [ ] Intersection detection works correctly regardless of segment angle or direction
- [ ] After the 7th intersection is detected, further intersections do not generate new story dots (but line drawing can continue)

### US-005: Dot interaction — open content rectangle
**Description:** As a user, I want to click a dot to open a story rectangle so that I can read the narrative content tied to that crossing.

**Acceptance Criteria:**
- [ ] Clicking a black dot opens a content rectangle overlay
- [ ] The dot turns grey (`rgba(0,0,0,0.4)`) after being clicked (pulse animation stops)
- [ ] Dots are assigned to sections in fixed order: 1st intersection = BORDER-FEELING, 2nd = BECOME-BORDER, etc.
- [ ] Already-opened (grey) dots can be re-clicked to reopen their rectangle
- [ ] Dot click target is generous (~40px hit area) for mobile usability
- [ ] Canvas drawing is paused while a rectangle is open

### US-006: Content rectangle with text and images
**Description:** As a user, I want each rectangle to show a text passage and scattered images so that I experience the narrative as a visual composition.

**Acceptance Criteria:**
- [ ] Rectangle appears centered or near-center with thin 1px black border on white background
- [ ] Rectangle contains the section's text content in EB Garamond, 16-18px, generous line-height
- [ ] 2-3 images per section are spread across the viewport outside the rectangle (not inside it), positioned pseudo-randomly but within visible bounds
- [ ] Images have no border, subtle box-shadow (`rgba(0,0,0,0.08)`)
- [ ] X button in upper-right corner of rectangle (EB Garamond, thin, ~14px)
- [ ] Clicking X closes the rectangle and dismisses the images
- [ ] Rectangle and images fade in on open (opacity 0→1, ~0.5s ease)
- [ ] Rectangle and images fade out on close

### US-007: Populate all 7 content sections
**Description:** As a developer, I want all 7 narrative sections populated with their text content and placeholder images so the full experience is testable.

**Acceptance Criteria:**
- [ ] Section 1 (BORDER-FEELING): Full text as provided
- [ ] Section 2 (BECOME-BORDER): Full text as provided
- [ ] Section 3 (EEL-POWER): Full text as provided
- [ ] Section 4 (MORPH-OTHER): Full text as provided
- [ ] Section 5 (SCREEN-SKIN): Placeholder text ("The screen came later...")
- [ ] Section 6 (ANA-MENDIETA): Full text as provided including the quote attribution
- [ ] Section 7 (NOTICE): Full text as provided, plus download button (see US-009)
- [ ] Each section has 2-3 placeholder images (can be solid gray rectangles or sourced later)

### US-008: Progress counter
**Description:** As a user, I want to see a counter showing how many crossings I've found so I know where I am in the journey.

**Acceptance Criteria:**
- [ ] Counter displayed at bottom center of viewport: "1 of 7", "2 of 7", etc.
- [ ] Counter updates when a new intersection is detected (not when a dot is clicked)
- [ ] Shows "0 of 7" initially before any intersections
- [ ] Styled in EB Garamond, ~13-14px, `rgba(0,0,0,0.5)`, letter-spacing 0.05em
- [ ] Counter is persistent and visible even when rectangles are open
- [ ] Does not interfere with canvas interaction (pointer-events: none or positioned outside canvas)

### US-009: Download crossing map
**Description:** As a user who has completed all 7 crossings, I want to download my unique map so I can keep it as a personal artifact.

**Acceptance Criteria:**
- [ ] The NOTICE section (7th rectangle) includes a "Save a screenshot of my quilt of crossings" button
- [ ] Clicking the button captures the canvas (line drawing + dots) as a PNG
- [ ] PNG is downloaded to the user's device with filename `crossing-[timestamp].png`
- [ ] The capture includes only the canvas content (lines and dots on white), not UI overlays
- [ ] Button styled with 1px black border, EB Garamond, hover state with subtle shadow lift

### US-010: Upload crossing to Supabase gallery
**Description:** As a user, I want my crossing map automatically saved to a shared gallery so others can see it after they complete their own journey.

**Acceptance Criteria:**
- [ ] On download, the canvas PNG is also uploaded to Supabase Storage (bucket: `crossings`)
- [ ] A record is inserted into a `crossings` table with: `id`, `image_url`, `created_at`
- [ ] Upload happens silently in the background — no loading spinner or blocking
- [ ] If upload fails, it fails silently (user still gets their download)
- [ ] Gallery stores up to ~100 most recent crossings (older entries can be pruned via Supabase policy or cron)

### US-011: Crossing gallery — revealed after download
**Description:** As a user who just downloaded my crossing, I want to see others' crossings so the piece becomes communal.

**Acceptance Criteria:**
- [ ] After download, the NOTICE rectangle updates to show "download and see others' crossings"
- [ ] Clicking "see others' crossings" reveals a gallery view
- [ ] Gallery displays stored crossing images in a grid or masonry layout
- [ ] Each crossing shows its timestamp
- [ ] Gallery is scrollable if there are many entries
- [ ] Gallery follows the same aesthetic: white background, 1px borders on images, EB Garamond labels
- [ ] Gallery is also accessible from the About section (see US-012)

### US-012: About section
**Description:** As a user, I want to access an about section to understand the piece and find the gallery.

**Acceptance Criteria:**
- [ ] Small "about" label in lower-left corner of viewport
- [ ] Styled in EB Garamond, ~13px, `rgba(0,0,0,0.5)`, letter-spacing 0.05em
- [ ] Clicking opens an overlay/panel with explanation of the piece
- [ ] Panel includes a link to the crossing gallery (gallery loads in same view or navigates)
- [ ] Panel has X close button, same style as content rectangles
- [ ] About text content to be provided (placeholder for now)

### US-013: Mobile and touch optimization
**Description:** As a mobile user, I want the full experience to work with touch so I can draw and interact on my phone.

**Acceptance Criteria:**
- [ ] Touch events (touchstart, touchmove, touchend) mapped to drawing interactions
- [ ] Dot tap targets are at least 44px for accessibility
- [ ] Content rectangles are sized appropriately for small screens (near full-width on mobile)
- [ ] Images in content sections reposition for mobile viewports
- [ ] Counter and about label remain visible and tappable
- [ ] No horizontal scroll, no overflow issues
- [ ] Canvas redraws correctly on orientation change

## Functional Requirements
- FR-1: The system must render a single horizontal line segment on page load as the starting point
- FR-2: Each user click/tap must extend a line from the last point (or initial segment end) to the click position
- FR-3: The system must detect all intersection points between the new segment and all existing segments in real-time
- FR-4: Each intersection must place a clickable dot and increment the crossing counter
- FR-5: Dots must open content rectangles with text and scattered images in fixed sequential order
- FR-6: The 7th content section must include a download mechanism that captures the canvas as PNG
- FR-7: On download, the system must upload the PNG to Supabase Storage and record metadata
- FR-8: After download, the system must reveal a gallery of previously stored crossings
- FR-9: The canvas must be bounded to the viewport and resize responsively
- FR-10: All interactions must work via both mouse (desktop) and touch (mobile)

## Non-Goals (Out of Scope)
- Real-time collaborative drawing (multi-user canvas)
- User accounts or authentication
- CMS for editing narrative content
- Animated line drawing playback / replay of someone's crossing journey
- Audio or sound design
- Internationalization / translation
- Print-optimized layout
- Analytics or tracking beyond the gallery

## Technical Considerations
- **Canvas rendering:** Use HTML Canvas 2D API. Maintain an array of all segments for intersection detection. Redraw full state on resize.
- **Intersection algorithm:** Line-segment intersection using parametric form (check if two segments cross using cross-product method). Must be efficient for potentially 20+ segments.
- **Screenshot capture:** Use `canvas.toDataURL('image/png')` for clean capture since the drawing is on an HTML Canvas element. No need for html2canvas.
- **Supabase:** Use Supabase JS client. Storage bucket for PNGs, single `crossings` table for metadata. No auth required — anonymous uploads.
- **Responsive canvas:** Listen to `resize` and `orientationchange` events. Store drawing data as normalized coordinates (0-1 range) and scale to current canvas dimensions on redraw.
- **State management:** React state or useReducer for: segments array, intersections array, opened sections, gallery visibility. No external state library needed.
- **Aesthetic:** Curl-inspired — EB Garamond (400/500/600), pure black/white, 1px solid black borders, no border-radius on rectangles, generous whitespace, subtle animations (0.3-0.5s ease), box-shadows using rgba(0,0,0,0.08-0.15).

## Success Metrics
- All 7 narrative sections are accessible through the crossing interaction
- Canvas drawing feels responsive and immediate (< 16ms per frame)
- Intersection detection is accurate with no false positives or missed crossings
- Download produces a clean PNG of the user's unique crossing pattern
- Gallery displays stored crossings from Supabase
- Works on Chrome, Safari, Firefox on desktop and iOS Safari / Chrome Android on mobile

## Open Questions
- What images should accompany each section? (User will provide or source later)
- Full text for SCREEN-SKIN section? (Placeholder for now)
- About section text? (Placeholder for now)
- Should the gallery show crossings in a specific order (newest first, random)?
- Should the initial segment always be horizontal and centered, or vary?
- Maximum number of clicks allowed before the experience suggests the user try a different direction?
