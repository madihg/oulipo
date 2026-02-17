#!/usr/bin/env node
/**
 * Import vote counts from Core Dataset CSV into poems.vote_count
 *
 * Usage: node scripts/import-votes-from-csv.mjs [path-to-csv]
 * Default: ~/Downloads/Core Dataset Carnation.csv
 *
 * CSV format: Iteration,Theme,Human,Machine,Winner
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
try {
  const envPath = resolve(__dirname, '..', '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const val = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) process.env[key] = val;
  }
} catch {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Map CSV (Iteration, Theme) -> performance slug + theme_slug
const ITERATION_TO_SLUG = {
  Carnation: 'carnation-exe',
  Versus: 'versus-exe',
  Reinforcement: 'reinforcement-exe',
};

// CSV Theme (normalized) -> theme_slug in DB
const THEME_MAP = {
  // Carnation
  'liberté': 'liberte',
  'solitude': 'solitude',
  'ville': 'la-ville',
  'enfance': 'enfance',
  // Versus
  'death': 'death',
  'moral': 'moral-responsibility',
  'memory': 'memory',
  'tiat': 'the-intersection-of-art-and-technology',
  'anger': 'anger',
  // Reinforcement
  'open air backseat': 'open-air-backseat',
  'age of post truth': 'age-of-post-truth',
  'first love': 'first-love',
  'singularity': 'singularity',
  'oysters': 'oysters',
  'memories': 'memories',
  'currency': 'currency',
  'crime': 'crime',
  'grief': 'grief',
  'compromise': 'compromise',
  'desire': 'desire',
  'limerence': 'limerence',
  'major kusanagi': 'major-kusanagi',
  'care': 'care',
  'falling out of contact with old friends': 'falling-out-of-contact-with-old-friends',
  'touch grass': 'touch-grass',
  'love': 'love',
};

// Versus Solitude appears twice: first -> solitude, second -> solitude-ii
let versusSolitudeCount = 0;

function themeToSlug(iteration, theme) {
  const t = (theme || '').trim().toLowerCase();
  if (iteration === 'Versus' && t === 'solitude') {
    const idx = versusSolitudeCount++;
    return idx === 0 ? 'solitude' : 'solitude-ii';
  }
  return THEME_MAP[t] || t.replace(/\s+/g, '-');
}

function parseCSV(content) {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(',').map((p) => p.trim());
    if (parts.length < 5) continue;
    const [iter, theme, humanStr, machineStr, winner] = parts;
    if (!iter || iter === 'Iteration') continue; // skip header
    const human = parseInt(humanStr, 10);
    const machine = parseInt(machineStr, 10);
    if (isNaN(human) || isNaN(machine)) continue;
    rows.push({ iteration: iter, theme, human, machine, winner });
  }
  return rows;
}

async function main() {
  const csvPath = process.argv[2] || resolve(process.env.HOME || '', 'Downloads/Core Dataset Carnation.csv');
  console.log('Reading:', csvPath);

  let content;
  try {
    content = readFileSync(csvPath, 'utf-8');
  } catch (e) {
    console.error('Failed to read CSV:', e.message);
    process.exit(1);
  }

  const rows = parseCSV(content);
  console.log('Parsed', rows.length, 'rows\n');

  // Get performance IDs
  const { data: perfs } = await supabase.from('performances').select('id, slug');
  const perfBySlug = Object.fromEntries((perfs || []).map((p) => [p.slug, p.id]));

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const perfSlug = ITERATION_TO_SLUG[row.iteration];
    if (!perfSlug) {
      console.log('Skip unknown iteration:', row.iteration);
      skipped++;
      continue;
    }

    const themeSlug = themeToSlug(row.iteration, row.theme);
    const perfId = perfBySlug[perfSlug];
    if (!perfId) {
      console.log('Skip: performance not found:', perfSlug);
      skipped++;
      continue;
    }

    // Update human poem
    const { data: humanPoems } = await supabase
      .from('poems')
      .select('id, vote_count')
      .eq('performance_id', perfId)
      .eq('theme_slug', themeSlug)
      .eq('author_type', 'human')
      .limit(1);

    if (humanPoems?.length) {
      const { error: eh } = await supabase
        .from('poems')
        .update({ vote_count: row.human })
        .eq('id', humanPoems[0].id);
      if (!eh) {
        console.log(`  ${perfSlug} / ${themeSlug} human: ${row.human} (was ${humanPoems[0].vote_count})`);
        updated++;
      }
    } else {
      console.log(`  ⚠ No human poem: ${perfSlug} / ${themeSlug}`);
    }

    // Update machine poem
    const { data: machinePoems } = await supabase
      .from('poems')
      .select('id, vote_count')
      .eq('performance_id', perfId)
      .eq('theme_slug', themeSlug)
      .eq('author_type', 'machine')
      .limit(1);

    if (machinePoems?.length) {
      const { error: em } = await supabase
        .from('poems')
        .update({ vote_count: row.machine })
        .eq('id', machinePoems[0].id);
      if (!em) {
        console.log(`  ${perfSlug} / ${themeSlug} machine: ${row.machine} (was ${machinePoems[0].vote_count})`);
        updated++;
      }
    } else {
      console.log(`  ⚠ No machine poem: ${perfSlug} / ${themeSlug}`);
    }
  }

  console.log('\n✅ Done. Updated', updated, 'poems. Skipped', skipped, 'rows.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
