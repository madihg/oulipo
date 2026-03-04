-- Extend event_kind enum with new CV section types
-- Run this in Supabase SQL Editor against the singulars project

-- 1. Add new enum values
ALTER TYPE oulipo_dashboard.event_kind ADD VALUE IF NOT EXISTS 'exhibition';
ALTER TYPE oulipo_dashboard.event_kind ADD VALUE IF NOT EXISTS 'award';
ALTER TYPE oulipo_dashboard.event_kind ADD VALUE IF NOT EXISTS 'fellowship';
ALTER TYPE oulipo_dashboard.event_kind ADD VALUE IF NOT EXISTS 'talk';
ALTER TYPE oulipo_dashboard.event_kind ADD VALUE IF NOT EXISTS 'press';
ALTER TYPE oulipo_dashboard.event_kind ADD VALUE IF NOT EXISTS 'book';
ALTER TYPE oulipo_dashboard.event_kind ADD VALUE IF NOT EXISTS 'publication';
ALTER TYPE oulipo_dashboard.event_kind ADD VALUE IF NOT EXISTS 'art_writing';

-- 2. Fix existing events with wrong kinds

-- Exhibitions currently tagged as performance
UPDATE oulipo_dashboard.events SET kind = 'exhibition' WHERE title = 'Borrow + Never Give Back' AND org = 'Silo Gallery';
UPDATE oulipo_dashboard.events SET kind = 'exhibition' WHERE title = 'Invasions' AND org = 'Silo Gallery';
UPDATE oulipo_dashboard.events SET kind = 'exhibition' WHERE title = 'America Metabolizes Me' AND org = 'Silo Gallery';
UPDATE oulipo_dashboard.events SET kind = 'exhibition' WHERE title = 'Re/declarations' AND org = 'Silo Gallery';
UPDATE oulipo_dashboard.events SET kind = 'exhibition' WHERE title = 'Deserve It' AND org = 'Gray Area';
UPDATE oulipo_dashboard.events SET kind = 'exhibition' WHERE title = 'We Called Us Poetry' AND org = 'Bergen University CDN';
UPDATE oulipo_dashboard.events SET kind = 'exhibition' WHERE title = 'Hard.exe' AND org = 'Mozilla Foundation';
UPDATE oulipo_dashboard.events SET kind = 'exhibition' WHERE title = 'Reinforcement.exe' AND org = 'Ethereum Scholar';
UPDATE oulipo_dashboard.events SET kind = 'exhibition' WHERE title = 'Carnation.exe' AND org = 'Yellow Cube Gallery';

-- Versus.exe is listed under Exhibitions in the CV PDF
UPDATE oulipo_dashboard.events SET kind = 'exhibition' WHERE title = 'Versus.exe' AND org = 'Mozilla AI Residency';

-- Border/Line is listed under Exhibitions in the CV PDF
UPDATE oulipo_dashboard.events SET kind = 'exhibition' WHERE title LIKE 'Border/Line%' AND org = 'Counterpulse';

-- Robert Coover Award: null -> award
UPDATE oulipo_dashboard.events SET kind = 'award' WHERE title = 'Robert Coover Award' AND org = 'ELO';

-- Media Archeology Lab: performance -> residency
UPDATE oulipo_dashboard.events SET kind = 'residency' WHERE title = 'Residency' AND org = 'Media Archeology Lab';
