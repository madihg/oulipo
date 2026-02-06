# PRD: Singulars Website

## Overview
Singulars is an art project website living at oulipo.xyz/singulars. It showcases a series of human-vs-machine poetry performances, each with themed poem pairs. Visitors can vote on poems (training the machine for the currently live performance), browse past performances, and explore the project's philosophy. The site is a Next.js app deployed on Vercel with Supabase as the backend.

## Goals
- Present the Singulars project as a cohesive, navigable experience across 5 performances
- Enable anonymous voting on poem pairs that updates Supabase in real-time for the live performance (hard.exe)
- Show vote results with a visual dot-based system using each performance's color
- Be fully mobile-responsive from day one
- Make it easy to add new performances and poems via JSON data imports

## Quality Gates

These commands must pass for every user story:
- `npm run build` — successful production build

For UI stories, also include:
- Visual verification in browser (desktop + mobile viewports)

## User Stories

### US-001: Set up Supabase schema and seed data
**Description:** As a developer, I want the database schema created in Supabase so that the site has structured data to pull from.

**Acceptance Criteria:**
- [ ] `performances` table with fields: id, name, slug, color (hex), location, date, num_poems, num_poets, model_link, huggingface_link, status (enum: upcoming/training/trained), poets (array or relation)
- [ ] `poems` table with fields: id, performance_id (FK), theme, text, author_name, author_type (enum: human/machine), vote_count (integer, default 0)
- [ ] `votes` table with fields: id, poem_id (FK), voter_fingerprint, created_at
- [ ] Seed data imported from JSON for all 5 performances and their poems
- [ ] Row-level security policies: votes insert allowed anonymously, poems vote_count readable publicly

### US-002: Landing page layout
**Description:** As a visitor, I want to see the Singulars landing page at /singulars so that I can understand the project and navigate to performances.

**Acceptance Criteria:**
- [ ] "Singulars" title at the top
- [ ] Mini-voting experience component embedded below the title (see US-005)
- [ ] Horizontally scrollable card row showing 5 performance cards (reverse.exe, hard.exe, reinforcement.exe, versus.exe, carnation.exe — latest to earliest)
- [ ] reverse.exe card shows "upcoming" state with date/location only
- [ ] Each other card links to its performance page (/singulars/[slug])
- [ ] "Duel the Machine" button that opens https://halimmadi.com/contact-form in a new tab
- [ ] About section at the bottom with short bio and link to www.halimmadi.com
- [ ] Link to the "About Singulars" page
- [ ] Mobile responsive

### US-003: About Singulars page
**Description:** As a visitor, I want to read more about the Singulars project and explore related writings.

**Acceptance Criteria:**
- [ ] Page at /singulars/about
- [ ] In-depth description of the Singulars project
- [ ] 3-5 responsive cards with titles, each linking to a Substack post
- [ ] Cards are spread/staggered layout, responsive across breakpoints

### US-004: Performance page
**Description:** As a visitor, I want to browse all poem pairs for a given performance, organized by theme.

**Acceptance Criteria:**
- [ ] Page at /singulars/[performance-slug]
- [ ] Shows performance name, location, date, and color
- [ ] Link to the duelling model and HuggingFace training data
- [ ] Theme cards listed, each showing the theme name
- [ ] Under each theme: both poems displayed (human + machine)
- [ ] Clicking a theme card opens the full theme/voting page (US-007)
- [ ] Mobile responsive

### US-005: Mini-voting experience (landing page)
**Description:** As a visitor, I want to vote on a random poem pair from the live performance directly from the landing page.

**Acceptance Criteria:**
- [ ] Shows a random theme from hard.exe with two poems side by side (or stacked on mobile)
- [ ] Theme name displayed above the poems
- [ ] Performance name and status ("training") shown
- [ ] Cursor changes to a dot in the performance's color on hover over the poems
- [ ] Clicking a poem registers a vote in Supabase (inserts into votes table, increments poem vote_count)
- [ ] Duplicate prevention via browser fingerprint (cookie + localStorage)
- [ ] After voting, navigates to the post-vote page (US-006)
- [ ] For performances with status "trained", label shows "trained" instead of "training"

### US-006: Post-vote page
**Description:** As a voter, I want to see how my vote influenced the results after casting it.

**Acceptance Criteria:**
- [ ] Shows both poems from the pair just voted on
- [ ] Same theme and performance info as the voting experience
- [ ] Total vote counts displayed for each poem
- [ ] Visual dots on each poem: one small dot per vote, colored in the performance's color
- [ ] The user's own vote is visually distinguishable (slightly larger or highlighted)
- [ ] Mobile responsive

### US-007: Full voting experience (theme page)
**Description:** As a visitor, I want a full-page voting experience for a specific theme.

**Acceptance Criteria:**
- [ ] Page at /singulars/[performance-slug]/[theme-slug]
- [ ] Theme name displayed prominently above
- [ ] Two poems displayed (same layout as mini-vote but full page)
- [ ] Cursor becomes a dot in the performance's color
- [ ] If performance status is "training" (hard.exe): vote registers in Supabase
- [ ] If performance status is "trained": vote goes through visually, shows results, but displays message "Thanks for voting — training is closed. Here are the results." and does NOT write to database
- [ ] If performance status is "upcoming" (reverse.exe): shows "coming soon" state, no voting
- [ ] After voting, shows post-vote results inline (same page, no navigation)
- [ ] Mobile responsive

### US-008: Custom cursor
**Description:** As a visitor, I want the cursor to reflect the performance's identity when interacting with poems.

**Acceptance Criteria:**
- [ ] When hovering over voteable poem areas, cursor changes to a filled circle
- [ ] Circle color matches the current performance's hex color
- [ ] Cursor reverts to default outside voting areas
- [ ] Works on desktop only (mobile uses tap)

### US-009: CSS and brand consistency
**Description:** As a developer, I want the site to follow the existing oulipo.xyz design system.

**Acceptance Criteria:**
- [ ] Uses the same CSS approach/variables as the rest of oulipo.xyz
- [ ] Typography, spacing, and color usage consistent with existing site
- [ ] Performance colors are the only added palette items
- [ ] All pages match the overall oulipo.xyz aesthetic

### US-010: API routes for voting
**Description:** As a developer, I want Next.js API routes to handle vote submission securely.

**Acceptance Criteria:**
- [ ] POST /api/vote accepts { poem_id, fingerprint }
- [ ] Checks if fingerprint has already voted on this poem pair (both poems in the theme)
- [ ] If duplicate: returns current vote counts without registering
- [ ] If performance status is not "training": returns vote counts without registering
- [ ] If valid: inserts vote, increments vote_count, returns updated counts
- [ ] Rate limiting to prevent abuse

### US-011: Data import pipeline
**Description:** As a developer, I want a script to import poem data from JSON into Supabase.

**Acceptance Criteria:**
- [ ] Script reads a JSON file with performances and poems
- [ ] Upserts performances and poems into Supabase
- [ ] Can be re-run safely (idempotent)
- [ ] Documents the expected JSON format

## Functional Requirements
- FR-1: All pages under /singulars/* route within the existing oulipo.xyz Next.js app
- FR-2: Voting writes to Supabase only for performances with status "training"
- FR-3: Fingerprint-based duplicate prevention per poem pair per visitor
- FR-4: Vote counts update in real-time on the post-vote view
- FR-5: Performance cards scroll horizontally on all screen sizes
- FR-6: All poem text renders preserving line breaks and stanza formatting
- FR-7: The site must be fully functional on mobile (responsive, tap-to-vote)

## Non-Goals
- User accounts or authentication
- Admin panel for managing performances/poems (data managed via JSON import)
- Real-time WebSocket updates (standard fetch/refetch is fine)
- Automated testing suite (visual QA is primary)
- The agents (oulipo-brand, mobile-responsiveness, oulipo-copy) — handled separately
- Content for the "About Singulars" page (copy to be provided separately)

## Technical Considerations
- Next.js App Router with /singulars as a route group
- Supabase JS client for database operations
- Browser fingerprinting via a lightweight library (e.g., @fingerprintjs/fingerprintjs)
- Performance colors stored in DB and passed as CSS custom properties
- Poem text stored as plain text with newlines preserved
- Consider Supabase RPC functions for atomic vote + increment operations

## Success Metrics
- All 5 performance pages render with correct data
- Voting works end-to-end for hard.exe (training status)
- Voting is view-only for trained performances
- Vote dots render correctly and scale with vote count
- Site is usable and looks good on mobile
- `npm run build` passes with zero errors

## Open Questions
- What are the exact hex colors for each performance?
- What is the copy for the "About Singulars" page?
- What are the Substack URLs for the thought cards?
- What are the model/HuggingFace links for each performance?
- What is the date/location for reverse.exe?
- Should the dot visualization cap out visually at some number, or always show 1:1 dots to votes?
