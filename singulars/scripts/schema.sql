-- Singulars Database Schema
-- Run this SQL in the Supabase SQL Editor to set up the database

-- ============================================
-- 1. Create custom types
-- ============================================

DO $$ BEGIN
  CREATE TYPE performance_status AS ENUM ('upcoming', 'training', 'trained');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE author_type AS ENUM ('human', 'machine');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2. Create tables
-- ============================================

-- Performances table
CREATE TABLE IF NOT EXISTS performances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  color text NOT NULL, -- hex color e.g. "#FF5733"
  location text,
  date date,
  num_poems integer DEFAULT 0,
  num_poets integer DEFAULT 0,
  model_link text,
  huggingface_link text,
  status performance_status NOT NULL DEFAULT 'upcoming',
  poets text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Poems table
CREATE TABLE IF NOT EXISTS poems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  performance_id uuid NOT NULL REFERENCES performances(id) ON DELETE CASCADE,
  theme text NOT NULL,
  theme_slug text NOT NULL,
  text text NOT NULL,
  author_name text NOT NULL,
  author_type author_type NOT NULL,
  vote_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poem_id uuid NOT NULL REFERENCES poems(id) ON DELETE CASCADE,
  voter_fingerprint text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 3. Create indexes
-- ============================================

-- Unique constraint for vote deduplication (one vote per fingerprint per poem)
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_fingerprint_poem
  ON votes(voter_fingerprint, poem_id);

-- Index for querying poem pairs by performance and theme
CREATE INDEX IF NOT EXISTS idx_poems_performance_theme
  ON poems(performance_id, theme_slug);

-- Unique index on performance slugs (already handled by UNIQUE constraint, but explicit)
CREATE UNIQUE INDEX IF NOT EXISTS idx_performances_slug
  ON performances(slug);

-- ============================================
-- 4. Row-Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE poems ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Performances: public read
DROP POLICY IF EXISTS "Public read access for performances" ON performances;
CREATE POLICY "Public read access for performances"
  ON performances FOR SELECT
  TO anon
  USING (true);

-- Poems: public read
DROP POLICY IF EXISTS "Public read access for poems" ON poems;
CREATE POLICY "Public read access for poems"
  ON poems FOR SELECT
  TO anon
  USING (true);

-- Votes: anonymous insert
DROP POLICY IF EXISTS "Anonymous insert for votes" ON votes;
CREATE POLICY "Anonymous insert for votes"
  ON votes FOR INSERT
  TO anon
  WITH CHECK (true);

-- Votes: public read (for count queries)
DROP POLICY IF EXISTS "Public read access for votes" ON votes;
CREATE POLICY "Public read access for votes"
  ON votes FOR SELECT
  TO anon
  USING (true);

-- ============================================
-- 5. RPC Function for atomic voting
-- ============================================

CREATE OR REPLACE FUNCTION cast_vote(p_poem_id uuid, p_fingerprint text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_theme_slug text;
  v_performance_id uuid;
  v_performance_status performance_status;
  v_existing_vote_id uuid;
  v_pair_poem_ids uuid[];
  v_result json;
BEGIN
  -- Get the poem's theme and performance info
  SELECT p.theme_slug, p.performance_id
  INTO v_theme_slug, v_performance_id
  FROM poems p
  WHERE p.id = p_poem_id;

  IF v_theme_slug IS NULL THEN
    RETURN json_build_object('error', 'Poem not found', 'voted', false);
  END IF;

  -- Get performance status
  SELECT perf.status INTO v_performance_status
  FROM performances perf
  WHERE perf.id = v_performance_id;

  -- Only allow voting on "training" performances
  IF v_performance_status != 'training' THEN
    -- Return current counts without registering vote
    SELECT json_build_object(
      'voted', false,
      'reason', 'Performance is not in training mode',
      'status', v_performance_status::text,
      'counts', (
        SELECT json_agg(json_build_object('poem_id', p.id, 'vote_count', p.vote_count, 'author_type', p.author_type::text))
        FROM poems p
        WHERE p.performance_id = v_performance_id AND p.theme_slug = v_theme_slug
      )
    ) INTO v_result;
    RETURN v_result;
  END IF;

  -- Get all poem IDs in this theme pair
  SELECT array_agg(p.id)
  INTO v_pair_poem_ids
  FROM poems p
  WHERE p.performance_id = v_performance_id AND p.theme_slug = v_theme_slug;

  -- Check if fingerprint already voted on any poem in this pair
  SELECT v.id INTO v_existing_vote_id
  FROM votes v
  WHERE v.voter_fingerprint = p_fingerprint
    AND v.poem_id = ANY(v_pair_poem_ids)
  LIMIT 1;

  IF v_existing_vote_id IS NOT NULL THEN
    -- Already voted - return current counts
    SELECT json_build_object(
      'voted', false,
      'reason', 'Already voted on this poem pair',
      'duplicate', true,
      'counts', (
        SELECT json_agg(json_build_object('poem_id', p.id, 'vote_count', p.vote_count, 'author_type', p.author_type::text))
        FROM poems p
        WHERE p.performance_id = v_performance_id AND p.theme_slug = v_theme_slug
      )
    ) INTO v_result;
    RETURN v_result;
  END IF;

  -- Insert vote
  INSERT INTO votes (poem_id, voter_fingerprint)
  VALUES (p_poem_id, p_fingerprint);

  -- Increment vote count
  UPDATE poems SET vote_count = vote_count + 1
  WHERE id = p_poem_id;

  -- Return updated counts
  SELECT json_build_object(
    'voted', true,
    'voted_for', p_poem_id,
    'counts', (
      SELECT json_agg(json_build_object('poem_id', p.id, 'vote_count', p.vote_count, 'author_type', p.author_type::text))
      FROM poems p
      WHERE p.performance_id = v_performance_id AND p.theme_slug = v_theme_slug
    )
  ) INTO v_result;
  RETURN v_result;
END;
$$;
