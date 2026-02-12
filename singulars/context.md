# Singulars Project Context

Reference file for Claude Code sessions. This captures decisions, setup details, and progress so nothing gets lost between conversations.

## Supabase Setup

- **Project name:** singulars
- **Dashboard:** https://supabase.com/dashboard (look for "singulars" project)
- **Credentials location:** `.env.local` (not committed to git)
- **Required env vars:**
  - `NEXT_PUBLIC_SUPABASE_URL` — Project URL from Settings > API
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key
  - `SUPABASE_SERVICE_ROLE_KEY` — service_role secret key (for seed scripts, bypasses RLS)
- **These same vars need to be added to Vercel** (Settings > Environment Variables) for the deployed site to work

## Database Schema

Three tables: `performances`, `poems`, `votes`
- Schema file: `scripts/schema.sql`
- Apply with: `node scripts/apply-schema.mjs`
- Seed with: `node scripts/seed.mjs [optional-json-path]`
- Default seed file: `scripts/seed-data.json`
- Real poems extracted from PDF: `scripts/poems-from-pdf.json`

## Performances

| Performance | Slug | Color | Status | Themes |
|---|---|---|---|---|
| reverse.exe | reverse-exe | #8B5CF6 | upcoming | 0 |
| hard.exe | hard-exe | #2AA4DD | training | 4 (Particles, Diegetic, Sun, Romance) |
| reinforcement.exe | reinforcement-exe | #02F700 | trained | 18 themes |
| versus.exe | versus-exe | #FEE005 | trained | 7 (incl. Solitude split into 2 rounds) |
| carnation.exe | carnation-exe | #F6009B | trained | 4 (Liberté, Solitude, La Ville, Enfance) |

Total: 33 themes, 66 poems

## Data Pipeline

1. Poems were extracted from `Carnation Poems.pdf` (Google Sheets export of all performances)
2. Human/machine labeling was done via content analysis + PDF markers
3. All human poems initially attributed to "Halim Madi" — some need correction (other poets contributed to versus.exe)
4. `scripts/poems-from-pdf.json` is the authoritative data file with real poems
5. `scripts/seed-data.json` still has placeholder/fake poems — should be replaced

## Deployment

- **Vercel project:** singulars (prj_veTzLqLcD5tqMJKXH13Y6rKUDwDF)
- **Team:** team_9h3UVrcMfPTPWYdvGpnKezrd
- **Domains:** singulars.vercel.app, also accessible via oulipo.xyz/singulars (rewrite from parent project)
- **Framework:** Next.js 14 (App Router)
- **Node:** 22.x

## Key Decisions Made

- Anonymous voting with fingerprint-based dedup (@fingerprintjs/fingerprintjs)
- Poems displayed as pairs: 1 human + 1 machine per theme
- Only "training" performances accept votes
- Vote counts start at 0 on the website (live performance counts stored in `_live_votes` metadata in JSON)
- Touch Grass theme (reinforcement.exe): order swapped from PDF — first poem is machine based on content analysis
- Enfance (carnation.exe): PDF label contradicts content — attributed to Halim based on Arabic reference in poem

## What Still Needs Doing

- [ ] Add Supabase credentials to `.env.local` and Vercel env vars
- [ ] Seed database with `poems-from-pdf.json`
- [ ] Clean up old placeholder poems from DB (different theme_slugs)
- [ ] Verify human/machine assignments — Halim to review
- [ ] Identify non-Halim poets in versus.exe and update author_name
- [ ] Update performance metadata (locations, dates, model_link, huggingface_link) if placeholders
- [ ] Replace `seed-data.json` with real data from `poems-from-pdf.json`
