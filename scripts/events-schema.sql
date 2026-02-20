-- Events table schema for Supabase
-- Run this in the Supabase SQL Editor

-- 1. Create enum for event kinds
CREATE TYPE event_kind AS ENUM (
  'performance',
  'workshop',
  'keynote',
  'panel',
  'residency',
  'professional_experience',
  'education'
);

-- 2. Create events table
CREATE TABLE events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  org          text NOT NULL,
  description  text,
  kind         event_kind,
  location     text,
  link         text,
  date         date NOT NULL,
  date_end     date,
  date_display text NOT NULL,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- 3. Index on date for query performance
CREATE INDEX idx_events_date ON events (date);

-- 4. Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 5. Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies
-- Anon users can only read
CREATE POLICY anon_read ON events
  FOR SELECT
  TO anon
  USING (true);

-- Authenticated users get full CRUD
CREATE POLICY authenticated_all ON events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
