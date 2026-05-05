-- Works table schema for Supabase
-- Run this in the Supabase SQL Editor (project: oulipo_main, schema: oulipo_dashboard)
--
-- Hand-apply pattern matches scripts/events-schema.sql.
-- After applying, seed with: node scripts/seed-works.mjs
--
-- Section vocabulary (text, not enum, so renaming is cheap):
--   'machine-talk'        -- fine-tuned poetry models, AI duels
--   'algorithmic-plays'   -- digital theater, performance, installation
--   'somatic-semantics'   -- net art, web pieces, body-first interaction
--   'tools'               -- small software for other artists

-- 1. Works table
CREATE TABLE IF NOT EXISTS oulipo_dashboard.works (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text NOT NULL,
  slug              text UNIQUE NOT NULL,
  section           text NOT NULL,
  type              text,
  date_start        date,
  date_end          date,
  year              integer,
  venue             text,
  location          text,
  short_description text,
  long_description  text,
  cover_image       text,
  images            jsonb DEFAULT '[]'::jsonb,
  tags              text[] DEFAULT ARRAY[]::text[],
  series            text,
  external_links    jsonb DEFAULT '[]'::jsonb,
  doc_count         integer DEFAULT 0,
  featured          boolean DEFAULT false,
  sort_order        integer,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_works_section ON oulipo_dashboard.works (section);
CREATE INDEX IF NOT EXISTS idx_works_year    ON oulipo_dashboard.works (year DESC);
CREATE INDEX IF NOT EXISTS idx_works_slug    ON oulipo_dashboard.works (slug);

-- 3. Auto-update updated_at on row changes
-- (Reuses update_updated_at() if it already exists from events-schema.sql.)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS works_updated_at ON oulipo_dashboard.works;
CREATE TRIGGER works_updated_at
  BEFORE UPDATE ON oulipo_dashboard.works
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Row Level Security: public read, authenticated write
ALTER TABLE oulipo_dashboard.works ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public works read"  ON oulipo_dashboard.works;
CREATE POLICY "Public works read"
  ON oulipo_dashboard.works
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated works write" ON oulipo_dashboard.works;
CREATE POLICY "Authenticated works write"
  ON oulipo_dashboard.works
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Optional: a permissive section-vocabulary CHECK to catch typos at write time.
ALTER TABLE oulipo_dashboard.works
  DROP CONSTRAINT IF EXISTS works_section_vocab;
ALTER TABLE oulipo_dashboard.works
  ADD CONSTRAINT works_section_vocab
  CHECK (section IN (
    'machine-talk',
    'algorithmic-plays',
    'somatic-semantics',
    'tools'
  ));
