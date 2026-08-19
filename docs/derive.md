# oulipo.xyz/derive - weekly SF field guide

A public page hydrated live from the `hmart` schema in Supabase project
`oulipo_main` (`smytgqkgomsfyurskpcl`). It replaces the old Cowork
`outings-briefing` artifact.

## Data path

- `hmart.outings_events` - one row per surfaced event. Written by the
  `outings-briefing` scheduled task (Claude Code, Mondays ~4am PT).
- `hmart.outings_briefings` - one row per week: `pulse`, `top_picks`,
  `recurring`, `galleries`, `horizon` (jsonb). Upserted by the same task
  (`ON CONFLICT (week_start)`).
- `public.derive_events` / `public.derive_briefings` - read-only views over
  the two tables, `GRANT SELECT TO anon`. No `user_id` exposed. Created by
  migration `derive_public_surface`.
- `derive/index.html` fetches both views via PostgREST with the publishable
  key (`sb_publishable_...`, browser-safe) and renders client-side in
  `America/Los_Angeles`.

## Rules encoded in the page

- Modern signal v3.1 tokens; closed palette; VT323 + JetBrains Mono.
- No em dashes anywhere; the renderer sanitizes incoming data strings
  (`—` -> " - ") per the brand voice row in `public.brand_system`.
- DOM built with `textContent` only - feed strings can never inject markup.
- Copper dot = high signal. Blue leads only on the top-pick cards.
- Day by day is a tab strip, one tab per day of the week range. It opens
  on today when the week holds it, else the next day still to come, else
  the last day. Past days dim and their panel is tagged `passed`; days
  with nothing listed sit in chrome until selected. The strip scrolls
  horizontally on phones and keeps the selected tab in view without
  scrolling the page. Tabs carry `tablist`/`tab`/`tabpanel` roles and
  left/right arrow keys move between them.
- No personal names or manual-check reminders on the public page - those
  stay in the scheduled task's run report.

## Cities

The hero carries a three-city switch (SF / Paris / Barcelona) rendered from
the `CITIES` array in the page script. San Francisco is the only city hmart
assembles today, so it is the one that hydrates; Paris and Barcelona carry a
`soon` tag on the button, swap the kicker, coordinates and timezone, hide the
week sections and hold a "coming soon" line. Selection is reflected in the URL
as `?city=paris` and read back on load. To bring a city live, give it
`live: true` once the views carry its rows - the tag and the holding copy fall
away with it.

## Checks

`node scripts/check-derive.mjs` - static design-system asserts + live
fetch asserts against the views (use `--offline` to skip the network half).
