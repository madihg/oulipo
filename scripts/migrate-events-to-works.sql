-- ============================================================================
-- migrate-events-to-works.sql
--
-- One-time migration (executed 2026-05-20 via Supabase MCP apply_migration)
-- that merged oulipo_dashboard.events into oulipo_dashboard.works.
--
-- After this migration:
--   - oulipo_dashboard.works holds 152 rows (21 original works + 131 events).
--   - oulipo_dashboard.events is dropped. Snapshot lives in events_archive
--     (also in this schema) for 30-day rollback window.
--   - works.kind uses the new oulipo_dashboard.kind_enum (20 values, union of
--     old work_type + event_kind, with `digital` -> `net_art` and new `tools`).
--   - public.works exposes the new shape via PostgREST.
--   - public.events is kept as a backward-compat filtered VIEW so frontend
--     callers that still hit `from=events` keep working through the rewire.
--     Dropped in Phase 5 (~2026-05-27) once frontend is on works everywhere.
--   - The old event_kind enum is kept alive because events_archive references
--     it; cleaned up together when archive is dropped (~2026-06-20).
--
-- This file is checkpointed in the repo for traceability. The actual
-- execution happened via the Supabase MCP — each step below ran as a
-- separate apply_migration call so partial failures could be diagnosed.
-- Re-running this file is safe (every block is idempotent), but unnecessary
-- once the merge has succeeded.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1  Snapshot the live events table for rollback
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS oulipo_dashboard.events_archive
  AS TABLE oulipo_dashboard.events;
COMMENT ON TABLE oulipo_dashboard.events_archive IS
  'Frozen copy of events at merge time 2026-05-20. Drop after 2026-06-20.';

-- ----------------------------------------------------------------------------
-- 1.2  New unified kind enum (20 values)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE oulipo_dashboard.kind_enum AS ENUM (
    'performance','installation','net_art','book','workshop_piece','film','tools',
    'exhibition','workshop','keynote','panel','talk','residency',
    'professional_experience','education','award','fellowship',
    'press','publication','art_writing'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 1.3  Extend works with the columns events brings in
-- ----------------------------------------------------------------------------
ALTER TABLE oulipo_dashboard.works
  ADD COLUMN IF NOT EXISTS org          text,
  ADD COLUMN IF NOT EXISTS date_display text,
  ADD COLUMN IF NOT EXISTS kind         oulipo_dashboard.kind_enum;

-- ----------------------------------------------------------------------------
-- 1.4  Migrate works.type -> works.kind (digital -> net_art)
-- ----------------------------------------------------------------------------
UPDATE oulipo_dashboard.works SET kind =
  (CASE type::text WHEN 'digital' THEN 'net_art' ELSE type::text END)::oulipo_dashboard.kind_enum
WHERE kind IS NULL;

-- ----------------------------------------------------------------------------
-- 1.5  Backfill date_display for existing works rows
-- ----------------------------------------------------------------------------
UPDATE oulipo_dashboard.works SET date_display = COALESCE(date_display,
  CASE
    WHEN date_end IS NOT NULL AND date_end <> date_start
      THEN to_char(date_start,'YYYY') || '–' || to_char(date_end,'YYYY')
    WHEN date_start IS NOT NULL
      THEN to_char(date_start,'YYYY')
    ELSE 'undated'
  END)
WHERE date_display IS NULL;

-- ----------------------------------------------------------------------------
-- 1.6  Drop the legacy NOT NULL on works.type so the events INSERT (which
--      writes only `kind`) can proceed. The type column itself is dropped
--      in Phase 1.7 below; this is only relaxing the constraint first.
-- ----------------------------------------------------------------------------
ALTER TABLE oulipo_dashboard.works ALTER COLUMN type DROP NOT NULL;

-- ----------------------------------------------------------------------------
-- 1.7  Copy every row from events into works
--
-- Slug rule: lowercase, alnum-only, dash-collapsed title + `-YYYY-<4-char id>`.
-- The 4-char id suffix disambiguates the 12 title overlaps (the same title
-- appearing both as a work and as multiple events). Ugly but unique.
--
-- venue is NULL for migrated rows: events had no venue column. org carries
-- the host organisation; the two were conflated in the events table.
-- ----------------------------------------------------------------------------
INSERT INTO oulipo_dashboard.works (
  id, title, slug, kind, date_start, date_end, date_display,
  venue, org, location, short_description, long_description,
  cover_image, images, tags, external_links, featured,
  created_at, updated_at
)
SELECT
  e.id, e.title,
  regexp_replace(
    lower(regexp_replace(e.title,'[^a-zA-Z0-9]+','-','g')),
    '(^-+|-+$)','','g'
  )
  || '-' || to_char(e.date,'YYYY')
  || '-' || substr(e.id::text,1,4),
  (CASE e.kind::text WHEN 'digital' THEN 'net_art' ELSE e.kind::text END)::oulipo_dashboard.kind_enum,
  e.date, e.date_end, e.date_display,
  NULL, e.org, e.location,
  left(e.description, 240), e.description,
  e.cover_image,
  '[]'::jsonb, '{}'::text[],
  CASE WHEN e.link IS NOT NULL AND e.link <> ''
    THEN jsonb_build_array(jsonb_build_object('label','link','url',e.link))
    ELSE '[]'::jsonb END,
  COALESCE(e.featured,false),
  e.created_at, e.updated_at
FROM oulipo_dashboard.events e
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 1.8  Lock the new columns, drop the dependent public views, drop the legacy
--      type column + work_type enum, then recreate the views over the new
--      shape (DROP-then-CREATE because CREATE OR REPLACE can't reshape
--      view column lists).
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.works;
DROP VIEW IF EXISTS public.events;

ALTER TABLE oulipo_dashboard.works
  ALTER COLUMN kind         SET NOT NULL,
  ALTER COLUMN date_display SET NOT NULL;

ALTER TABLE oulipo_dashboard.works DROP COLUMN IF EXISTS type;
DROP TYPE  IF EXISTS oulipo_dashboard.work_type;

CREATE VIEW public.works AS SELECT * FROM oulipo_dashboard.works;
GRANT SELECT ON public.works TO anon, authenticated;

-- public.events shim: a filtered view over works that exposes only the
-- event-shaped kinds. Lets old fetch callers keep working until each one
-- is migrated to public.works in Phase 2.
CREATE VIEW public.events AS
  SELECT * FROM oulipo_dashboard.works
  WHERE kind IN ('performance','workshop','keynote','panel','talk',
                 'residency','exhibition','book','art_writing','press',
                 'publication','professional_experience','education',
                 'award','fellowship');
GRANT SELECT ON public.events TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 1.9  Drop the old events base table. event_kind enum is left alive
--      because events_archive still references it; both are cleaned up
--      together in Phase 5 after the soak window.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS oulipo_dashboard.events;

-- ============================================================================
-- Verification (run separately, not part of the migration itself)
-- ============================================================================
-- SELECT count(*) FROM oulipo_dashboard.works;                            -- 152
-- SELECT kind, count(*) FROM oulipo_dashboard.works GROUP BY kind;        -- 17 populated kinds
-- SELECT count(*) FROM oulipo_dashboard.works WHERE kind IS NULL;         -- 0
-- SELECT title, count(*) FROM oulipo_dashboard.works
--   GROUP BY title HAVING count(*) > 1;                                   -- 10 dup-title rows
-- SELECT count(*) FROM oulipo_dashboard.events_archive;                   -- 131

-- ============================================================================
-- Rollback (within 30 days; full reversal)
-- ============================================================================
-- BEGIN;
-- DROP VIEW IF EXISTS public.events;
-- DROP VIEW IF EXISTS public.works;
-- CREATE TABLE oulipo_dashboard.events AS TABLE oulipo_dashboard.events_archive;
-- ALTER TABLE oulipo_dashboard.events ADD PRIMARY KEY (id);
-- DELETE FROM oulipo_dashboard.works w
--   USING oulipo_dashboard.events_archive a WHERE w.id = a.id;
-- ALTER TABLE oulipo_dashboard.works ADD COLUMN type text;
-- UPDATE oulipo_dashboard.works
--   SET type = CASE kind::text WHEN 'net_art' THEN 'digital' ELSE kind::text END;
-- ALTER TABLE oulipo_dashboard.works ALTER COLUMN type SET NOT NULL;
-- ALTER TABLE oulipo_dashboard.works
--   DROP COLUMN kind, DROP COLUMN org, DROP COLUMN date_display;
-- CREATE VIEW public.works  AS SELECT * FROM oulipo_dashboard.works;
-- CREATE VIEW public.events AS SELECT * FROM oulipo_dashboard.events;
-- COMMIT;

-- ============================================================================
-- Phase 5 cleanup (run ~2026-06-20)
-- ============================================================================
-- DROP VIEW  IF EXISTS public.events;
-- DROP TABLE IF EXISTS oulipo_dashboard.events_archive;
-- DROP TYPE  IF EXISTS oulipo_dashboard.event_kind;
