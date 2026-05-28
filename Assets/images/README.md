# Image folders — where to drop pictures

Everything the site renders lives under this folder. Three rules.

## 1. Works

**Drop work pictures into `Assets/images/works/<slug>/`.**

`<slug>` must match the `slug` column of the row in `oulipo_dashboard.works`.
Examples already in the tree: `borderline/`, `carnation-exe/`, `feed-it/`,
`reinforcement-exe/`. The folder name = the slug.

Inside, name **the one you want shown on /works/ and the home featured strip**
`featured.jpg` (or `.jpeg`, `.png`, `.webp`). All other files in the folder are
treated as gallery shots.

```
Assets/images/works/borderline/
├── featured.jpg          ← the cover; this is what gets pulled
├── gallery-1.jpg
├── gallery-2.jpg
└── …
```

If you don't drop a `featured.*`, the existing `cover_image` column in Supabase
keeps whatever it had. No silent breakage.

## 2. Books

**Drop book pictures into `Assets/images/books/<slug>/`.** Same idea.

Use `featured.*` for the cover the site should show. As a legacy fallback we
also accept `cover.*` for books, because that's how the four existing book
folders were named — but `featured.*` wins if both exist.

```
Assets/images/books/in-the-name-of-scandal/
├── featured.png          ← preferred
├── cover.png             ← fallback (ignored if featured.* exists)
├── interior-1.jpg
└── …
```

## 3. After dropping

Run the sync script. It walks both folders, finds every `featured.*` /
`cover.*`, and writes the path into Supabase's `cover_image` column for the
matching `works.slug`. Idempotent — rerun any time.

```sh
node scripts/sync-featured-images.mjs --dry-run   # preview
node scripts/sync-featured-images.mjs             # write
```

Needs `OULIPO_SUPABASE_URL` + `OULIPO_SUPABASE_SERVICE_KEY` in `.env.local`
(same as the other scripts in `scripts/`).

## Notes

- **Keynotes + workshops** drop into `Assets/images/keynotes/` and
  `Assets/images/workshops/`. No slug subfolders — flat files. The home
  recent-strip + /engagements/ pulls them via `cover_image` on the row.
- **Portraits + home hero** live in `Assets/images/portrait/` and
  `Assets/images/home/`. Hand-curated, not auto-synced.
- **Generated/scraped junk** sometimes accumulates here (old freight-cargo
  imports, screenshots, etc.). Run a referencing scan periodically — see the
  cleanup section in `scripts/sync-featured-images.mjs` or the `Context.md`
  notes.
