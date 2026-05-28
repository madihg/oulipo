# Adding a work

A work is the smallest content unit on oulipo.xyz. Each one shows up:

- as a card on the **landing page** and **/works/** index
- as a per-section list item under **/works/?section=&lt;slug&gt;**
- (eventually) as a row in the Supabase `oulipo_dashboard.works` table
- as its own detail page at **/works/&lt;slug&gt;/index.html**

The whole thing comes off a single source of truth: **`Assets/data/works.json`**.

## The featured-image convention

Every work folder has the same shape:

```
Assets/images/works/<slug>/
├── featured.jpg     ← cover image. Use any extension: .jpg / .jpeg / .png / .webp
├── any-other.jpg    ← additional images, named however you like
└── ...
```

The file named **`featured.<ext>`** is the cover that shows up on:

- the landing page card
- the `/works/` browse card
- the per-category page card

To swap a cover, replace `featured.<ext>` in the folder. That's it.

## Adding a brand-new work

1. **Pick a slug** — `kebab-case`, must be unique. Used in URLs everywhere.
2. **Create the folder**:
   ```sh
   mkdir Assets/images/works/<slug>
   ```
3. **Drop your cover image** into it as `featured.<ext>`. Add any other images you want; name them however you like.
4. **Add a row to `Assets/data/works.json`**:

   ```json
   {
     "title": "Your Work",
     "slug": "<slug>",
     "section": "machine-talk",
     "type": "performance",
     "date_start": "2026-05-01",
     "year": 2026,
     "venue": "TIAT",
     "location": "San Francisco",
     "short_description": "One sentence that fits on the card.",
     "long_description": null,
     "cover_image": "Assets/images/works/<slug>/featured.jpg",
     "tags": ["ai", "poetry"],
     "series": null,
     "external_links": [],
     "doc_count": 0,
     "featured": false,
     "sort_order": null
   }
   ```

   - `section` must be one of: `machine-talk`, `algorithmic-plays`, `somatic-semantics`, `tools`.
   - Set `cover_image` to whatever extension you used for `featured.<ext>`.

5. **Create the detail page** at `works/<slug>/index.html`. Copy the structure from any existing work (e.g. `works/reinforcement-exe/index.html`) and edit:
   - title, meta line, hero image src
   - body paragraphs / image blocks
   - the prev/next nav at the bottom (chrome.js auto-wires this from `works.json` ordering — you don't have to touch it)

6. **(Optional) Seed Supabase** so the live page stays in sync once the table is wired up:
   ```sh
   node scripts/seed-works.mjs
   ```
   Requires `OULIPO_SUPABASE_URL` and `OULIPO_SUPABASE_SERVICE_KEY` in `.env.local`.

## Editing an existing work

- **Change the cover**: replace `Assets/images/works/<slug>/featured.<ext>`. No code change needed.
- **Change copy / metadata**: edit the row in `Assets/data/works.json` and re-run the seed.
- **Add/remove images on the detail page**: open `works/<slug>/index.html` and adjust the body.

## Supabase status

The `oulipo_dashboard.works` table doesn't exist on the live database yet. Until it does, the site reads `Assets/data/works.json` directly via `Assets/js/works-page.js`. To create the table:

1. Apply `scripts/works-schema.sql` in the Supabase SQL editor (project: `oulipo_main`, schema: `oulipo_dashboard`).
2. Run `node scripts/seed-works.mjs` to populate it.

After that, the works pages will fetch from Supabase first and fall back to the JSON if the network call fails — no other code change.
