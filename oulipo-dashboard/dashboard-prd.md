[PRD]
# PRD: Oulipo Dashboard

## Overview
Oulipo Dashboard is a personal artist dashboard that accelerates Halim Madi's creative practice. It lives at oulipo/dashboard as a standalone Next.js app, password-protected, and organized into three domains: Studio (learning/writing), Gallery (sharing/publishing), and Market (outreach/relationships). Speed and mobile usability are non-negotiable.

## Goals
- Centralize artist workflow tools in one fast, responsive interface
- Surface past research and writing automatically when working on new pieces
- Reduce friction for publishing to Substack and Instagram
- Keep the website (oulipo.xyz) updated with events without manual HTML editing
- Manage contacts and outreach from a single CRM
- Be usable on a phone as easily as on a laptop

## Quality Gates

These commands must pass for every user story:
- `npm run build` — successful production build

For UI stories, also include:
- Visual verification in browser (desktop + mobile viewports)

## User Stories

### US-001: Project scaffolding and password protection
**Description:** As Halim, I want a password-protected Next.js app at oulipo/dashboard so that only I can access my tools.

**Acceptance Criteria:**
- [ ] Next.js app initialized in `oulipo/dashboard` with App Router
- [ ] Single shared password stored in env var (`DASHBOARD_PASSWORD`)
- [ ] Login page with password input, session persisted via cookie
- [ ] Unauthenticated requests redirect to login
- [ ] CSS matches oulipo.xyz design system (invoke `/oulipo-brand` for rules)
- [ ] App is fast — no unnecessary client-side JS, minimal bundle

### US-002: Side panel navigation
**Description:** As Halim, I want a navigation panel with three sections (Studio, Gallery, Market) so I can quickly switch between tools.

**Acceptance Criteria:**
- [ ] Desktop: side panel on the right, always visible
- [ ] Mobile: bottom tab bar with three tabs (Studio, Gallery, Market)
- [ ] Each section expands to show its apps
- [ ] Studio contains: Context Scan
- [ ] Gallery contains: Content Publisher, Update Events, Deadline Calendar
- [ ] Market contains: CRM, Outreach Agent
- [ ] Active app highlighted in panel/tab bar
- [ ] Transitions are instant — no loading spinners for navigation

### US-003: Context Scan — manual scan
**Description:** As Halim, I want to paste text and have an LLM search my Google Drive and Notion for related past work so I can see what I've already written about a topic.

**Acceptance Criteria:**
- [ ] Text input area where I paste content (no context needed)
- [ ] "Scan" button triggers the search
- [ ] Google OAuth flow for Drive access (first time only, token persisted)
- [ ] Notion OAuth flow for Notion access (first time only, token persisted)
- [ ] Claude API analyzes pasted text, extracts key concepts
- [ ] Searches Google Drive (full-text) and Notion (search API) for matches
- [ ] Results displayed as compact cards: title + short description
- [ ] Each card has a button that opens the source doc in a new tab (deep link to Drive or Notion)
- [ ] Results load progressively (stream as found, don't wait for all)

### US-004: Context Scan — manual import for Kindle/Matter/Instapaper
**Description:** As Halim, I want to import my Kindle highlights and read-later notes so the context scan can search those too.

**Acceptance Criteria:**
- [ ] Import page/modal accessible from Context Scan
- [ ] Accepts JSON or CSV upload for Kindle highlights, Matter saves, Instapaper exports
- [ ] Imported notes stored in Supabase (oulipo-dashboard project)
- [ ] Context Scan searches imported notes alongside Drive and Notion
- [ ] Import is idempotent (re-importing the same file doesn't create duplicates)
- [ ] Card results from imported notes show source (Kindle, Matter, etc.) and link if available

### US-005: Context Scan — passive scan for active projects
**Description:** As Halim, I want to pin projects so the system automatically surfaces related past work as I write.

**Acceptance Criteria:**
- [ ] Ability to "pin" a Notion page or Google Doc as an active project
- [ ] Pinned projects listed in the Context Scan interface
- [ ] System periodically re-scans pinned projects (e.g. every few hours or on manual refresh)
- [ ] New matches surfaced as notifications/cards in the dashboard
- [ ] Can unpin projects when done

### US-006: Content Publisher — text input and Substack draft
**Description:** As Halim, I want to paste a piece of writing and generate a Substack-ready draft so I can publish faster.

**Acceptance Criteria:**
- [ ] Text input area that accepts pasted text or a Google Doc link
- [ ] If Google Doc link: fetches content via Drive API
- [ ] "Generate Substack draft" button
- [ ] Claude API transforms the text into Substack-formatted copy (title, subtitle, body with markdown)
- [ ] Output displayed in an editable preview
- [ ] Can request edits via a text input ("make the intro shorter", "add a section about X")
- [ ] "Copy to clipboard" button for final output
- [ ] Handles essays, workshop descriptions, talk summaries, and art piece write-ups

### US-007: Content Publisher — Instagram carousel generator
**Description:** As Halim, I want to upload photos and a long text, and get back an Instagram carousel with text overlaid on my photos plus a separate caption, so I can create posts quickly.

**Input:**
- Upload multiple photos (drag-and-drop or file picker)
- Paste or type a long-form text (essay, piece description, workshop notes, etc.)

**Output:**
- A carousel of the uploaded photos, each with text overlaid (extracted/summarized from the long text by Claude API)
- A separate Instagram caption (different from the overlay text) — copy-paste ready

**Acceptance Criteria:**
- [ ] Photo upload area accepts multiple images (drag-and-drop + file picker)
- [ ] Text input area for the long-form source text
- [ ] Claude API reads the text and generates: (a) short overlay text per slide, distributed across the number of photos uploaded, and (b) a separate IG caption
- [ ] All slides shown side-by-side in a horizontal preview strip (scrollable)
- [ ] Each slide shows the uploaded photo with text overlaid on it
- [ ] Text overlay font is configurable (font selector, font to be provided later)
- [ ] Text overlay is editable per slide — click to edit directly on the preview
- [ ] Text position/size adjustable per slide (drag to reposition, resize handle)
- [ ] Carousel format: 5:4 aspect ratio (1080x1350px) for IG posts
- [ ] Can reorder slides, remove slides, or add a slide with another photo
- [ ] IG caption displayed below the carousel preview, editable inline
- [ ] Can request edits to caption via text input ("shorter", "add hashtags", etc.)
- [ ] "Export" button generates PNGs server-side (Sharp/node-canvas) and downloads as ZIP
- [ ] "Copy caption" button copies the caption text to clipboard
- [ ] Preview in browser (canvas-based), export server-side for pixel-perfect PNGs

### US-008: Update Events (upcoming + CV)
**Description:** As Halim, I want to paste an event and have the dashboard update my website's upcoming page and CV automatically.

**Acceptance Criteria:**
- [ ] Text input where I paste event info (link, location, freeform text)
- [ ] Claude API extracts: organization, title, description, type (workshop/work/keynote), location, date, link
- [ ] If any field is ambiguous, asks me to confirm/fill in
- [ ] Updates `events.json` at `/Users/halim/Documents/oulipo/events.json`
- [ ] Updates inline `const EVENTS` in `upcoming/index.html`
- [ ] Updates inline `const EVENTS` in `cv/index.html`
- [ ] Event inserted in chronological order
- [ ] Shows confirmation with formatted event entry
- [ ] Types are: workshop, work, keynote
- [ ] Uses proper Unicode characters for arrows and dashes in JSON serialization

### US-009: Deadline Calendar
**Description:** As Halim, I want to paste a deadline link and have it added to my Google Calendar so I can track application deadlines.

**Acceptance Criteria:**
- [ ] Text input where I paste a link or describe a deadline
- [ ] Claude API extracts: deadline name, date, organization, link
- [ ] If ambiguous, asks me to confirm
- [ ] Creates event in a dedicated "Application Deadlines" Google Calendar via Calendar API (same Google OAuth)
- [ ] Calendar event includes the link in the description
- [ ] Shows confirmation with what was added and the date
- [ ] If the "Application Deadlines" calendar doesn't exist, creates it

### US-010: CRM — database design and setup
**Description:** As a developer, I want the CRM database schema in Supabase so contacts can be stored and tagged.

**Acceptance Criteria:**
- [ ] Supabase project: oulipo-dashboard (separate from singulars)
- [ ] `contacts` table: id, name, email, city, notes, source (manual/email-scan/import), created_at, updated_at
- [ ] `tags` table: id, name, slug, color, description
- [ ] `contact_tags` join table: contact_id, tag_id
- [ ] Default tags created: `mailing-list`, `gallery`, `conference`, `ally`, `sf`, `paris`, `berlin`, `london`, `new-york`, `tokyo`
- [ ] City tags are dynamic — new cities added as needed
- [ ] Contacts can have multiple tags
- [ ] `imported_notes` table (for Context Scan): id, source (kindle/matter/instapaper), title, content, author, link, imported_at
- [ ] Row-level security: all operations require authenticated session (dashboard password)

### US-011: CRM — manual contact add
**Description:** As Halim, I want to add a contact by email and tag them so I can build my network database.

**Acceptance Criteria:**
- [ ] Input field for email address
- [ ] On submit, prompts for tags (multi-select from existing tags + create new)
- [ ] Optional: name, city, notes fields
- [ ] Contact saved to Supabase
- [ ] If contact already exists (by email), updates tags (additive)
- [ ] Confirmation shown with contact card

### US-012: CRM — email inbox scan
**Description:** As Halim, I want the CRM to scan my Gmail inbox and surface relevant contacts so I don't have to add everyone manually.

**Acceptance Criteria:**
- [ ] "Scan inbox" button triggers Gmail API search (same Google OAuth)
- [ ] Claude API analyzes email threads to identify relevant contacts (not spam, not transactional)
- [ ] Results shown as cards with: name, email, context snippet, suggested tags
- [ ] I can approve/reject/edit each suggested contact before saving
- [ ] Approved contacts saved to Supabase with tags
- [ ] Scan is incremental — remembers last scan date, only processes new emails
- [ ] Option to scan full inbox (first time setup, may take a while)

### US-013: CRM — contact list and search
**Description:** As Halim, I want to browse and search my contacts by name, email, tag, or city.

**Acceptance Criteria:**
- [ ] Contact list view with search bar
- [ ] Filter by tag (multi-select)
- [ ] Filter by city
- [ ] Each contact shows: name, email, tags, city, last updated
- [ ] Click contact to see full details and edit tags/notes
- [ ] Natural language updates work: "Alexandra moved from SF to Paris" updates her city tag
- [ ] Bulk tag operations (select multiple contacts, add/remove tag)

### US-014: CRM — mailing list import
**Description:** As Halim, I want to import my existing mailing list and Substack subscribers so the CRM starts with my current contacts.

**Acceptance Criteria:**
- [ ] Import accepts CSV upload (email, name columns at minimum)
- [ ] All imported contacts auto-tagged `mailing-list`
- [ ] Substack subscriber export format supported
- [ ] Import is idempotent (duplicates by email are merged, not created)
- [ ] Shows import summary: X new contacts, Y updated, Z skipped

### US-015: Outreach Agent — portfolio email drafts
**Description:** As Halim, I want to generate personalized portfolio emails for gallery and conference contacts so I can do outreach efficiently.

**Acceptance Criteria:**
- [ ] Select target audience by tag: `gallery`, `conference`, or custom tag filter
- [ ] Shows filtered contact list with checkboxes to select recipients
- [ ] Claude API generates personalized email per contact using: their name, context from CRM notes, and a portfolio of selected works/links
- [ ] Email includes a Cal.com booking link: cal.com/halim-madi
- [ ] Each draft shown in preview, editable before sending
- [ ] "Create Gmail draft" button creates a draft in Gmail (via Gmail API) — does NOT send
- [ ] Drafts created one at a time, I review and send manually from Gmail
- [ ] Can edit the base template/tone before generating all drafts

### US-016: Outreach Agent — reply detection and Cal.com follow-up
**Description:** As Halim, I want to know when outreach contacts reply so I can send them my booking link.

**Acceptance Criteria:**
- [ ] Tracks which contacts received outreach emails (stored in Supabase)
- [ ] Periodically checks Gmail for replies to outreach threads
- [ ] When reply detected, notification in dashboard
- [ ] One-click "Draft Cal.com follow-up" generates a reply draft with cal.com/halim-madi link
- [ ] Draft created in Gmail, not sent automatically

### US-017: Google OAuth setup
**Description:** As a developer, I want a single Google OAuth flow that covers Drive, Gmail, and Calendar so Halim logs in once.

**Acceptance Criteria:**
- [ ] OAuth consent screen configured with scopes: Drive (read), Gmail (read + draft create), Calendar (read + write)
- [ ] Login flow on first use of any Google-dependent feature
- [ ] Tokens stored securely (encrypted in Supabase or server-side session)
- [ ] Token refresh handled automatically
- [ ] If token expires, re-prompts for login without losing context

### US-018: Notion OAuth setup
**Description:** As a developer, I want Notion OAuth so the Context Scan can search Notion workspaces.

**Acceptance Criteria:**
- [ ] Notion integration created with search capability
- [ ] OAuth flow on first use of Context Scan
- [ ] Token stored securely alongside Google tokens
- [ ] Search uses Notion API search endpoint
- [ ] Results include page title, snippet, and deep link to Notion page

## Functional Requirements
- FR-1: All pages load in under 1 second on a fast connection (speed is paramount)
- FR-2: Dashboard is fully functional on mobile with bottom tab navigation
- FR-3: CSS matches oulipo.xyz design system exactly — no CSS frameworks
- FR-4: Google OAuth covers Drive, Gmail, and Calendar in a single login flow
- FR-5: Claude API calls stream responses where possible for perceived speed
- FR-6: All CRM data lives in Supabase (oulipo-dashboard project)
- FR-7: Context Scan imported notes live in the same Supabase project
- FR-8: Event updates write directly to files in the oulipo folder on disk
- FR-9: IG carousel exports at 1080x1350px (5:4) as PNG
- FR-10: All outreach creates Gmail drafts — never sends automatically

## Non-Goals
- Multi-user support (this is a single-user dashboard)
- Substack API integration (doesn't exist — copy-paste workflow)
- Direct Instagram posting (Meta API not worth the complexity — export images + copy caption)
- Real-time collaboration
- Mobile native app (responsive web is sufficient)
- Automated email sending (always draft, never send)

## Technical Considerations
- Next.js App Router, standalone app in `oulipo/dashboard`
- Supabase project: oulipo-dashboard (under oulipo.xyz org)
- Google OAuth with combined scopes (Drive + Gmail + Calendar)
- Notion OAuth for workspace search
- Claude API (Anthropic) for all LLM features — use streaming for speed
- Canvas API for browser-side carousel preview, Sharp/node-canvas for server-side PNG export
- File system access needed for event updates (writes to oulipo folder) — this means the dashboard must run where the oulipo repo lives, or use a git-based workflow
- Password auth via simple middleware + cookie session (no user accounts)
- Consider edge runtime for API routes where possible for speed

## Success Metrics
- Dashboard loads in under 1 second
- Context Scan returns results in under 5 seconds
- IG carousel export produces correct 5:4 PNGs
- Event updates reflect in upcoming and CV pages immediately
- CRM holds all contacts with correct tags
- Outreach drafts appear in Gmail ready to review
- All features work on mobile (bottom tab nav, responsive layouts)
- `npm run build` passes with zero errors

## Open Questions
- What font should be used for IG carousel text overlays?
- What does the portfolio email template look like? (selected works, bio, specific framing?)
- Should the passive context scan run on a cron, or only when the dashboard is open?
- For event updates: if the dashboard runs on Vercel, it can't write to local files. Should it commit to git instead, or must it run locally?
- How should Kindle highlights be exported? (Kindle app export format, Readwise, manual copy?)
- Should the "Application Deadlines" calendar have reminders (e.g. 1 week before, 1 day before)?
[/PRD]
