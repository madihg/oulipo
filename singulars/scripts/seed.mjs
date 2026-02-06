/**
 * Seed script for Singulars database
 *
 * Usage: node scripts/seed.mjs
 *
 * Requires environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (bypasses RLS)
 *
 * This script is idempotent - it uses upsert operations and can be re-run safely.
 *
 * ──────────────────────────────────────────────────
 * EXPECTED JSON FORMAT (seed-data.json)
 * ──────────────────────────────────────────────────
 *
 * The input file must be a JSON object with a top-level "performances" array.
 * Each performance object contains its metadata and an optional "themes" array,
 * where each theme holds a pair of poems (one human, one machine).
 *
 * {
 *   "performances": [
 *     {
 *       // ── Required fields ──
 *       "name": "hard.exe",                          // string - display name of the performance
 *       "slug": "hard-exe",                          // string - unique URL slug (used in /singulars/[slug])
 *       "color": "#EF4444",                          // string - hex color for theming (cursors, dots, accents)
 *       "status": "training",                        // enum: "upcoming" | "training" | "trained"
 *
 *       // ── Optional fields ──
 *       "location": "Beirut, Lebanon",               // string | null - where the performance took place
 *       "date": "2024-11-15",                        // string (YYYY-MM-DD) | null - performance date
 *       "num_poems": 6,                              // integer - total number of poems (default: 0)
 *       "num_poets": 3,                              // integer - number of human poets (default: 0)
 *       "model_link": "https://example.com/model",   // string | null - link to the duelling ML model
 *       "huggingface_link": "https://huggingface.co/...", // string | null - link to HuggingFace training data
 *       "poets": ["Halim Madi", "Poet A"],           // string[] - names of participating poets (default: [])
 *
 *       // ── Themes with poems (optional) ──
 *       "themes": [
 *         {
 *           "theme": "Loss",                         // string - display name of the theme
 *           "theme_slug": "loss",                    // string - URL-safe slug for the theme
 *           "poems": [
 *             {
 *               // ── Required poem fields ──
 *               "text": "Poem text here\nwith line breaks\npreserved.", // string - full poem text (\n for line breaks, \n\n for stanza breaks)
 *               "author_name": "Halim Madi",         // string - name of the poem's author
 *               "author_type": "human"               // enum: "human" | "machine"
 *             },
 *             {
 *               "text": "Machine poem text...",
 *               "author_name": "hard.exe",
 *               "author_type": "machine"
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 *
 * NOTES:
 * - Each theme should contain exactly 2 poems: one "human" and one "machine".
 * - The "slug" field must be unique across all performances.
 * - Poems are matched for updates by (performance_id, theme_slug, author_type).
 * - Performances with status "upcoming" typically have no themes/poems.
 * - Performances with status "training" allow active voting.
 * - Performances with status "trained" display results in read-only mode.
 * - See scripts/seed-data.json for a complete working example.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local if it exists
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
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
} catch {
  // .env.local not found, use existing env vars
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseServiceKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nSet these in .env.local or as environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Load seed data
const dataPath = resolve(__dirname, 'seed-data.json');
const seedData = JSON.parse(readFileSync(dataPath, 'utf-8'));

async function seed() {
  console.log('🌱 Starting seed process...\n');

  for (const perf of seedData.performances) {
    const { themes, ...performanceData } = perf;

    // Upsert performance
    console.log(`📦 Upserting performance: ${performanceData.name}`);
    const { data: perfResult, error: perfError } = await supabase
      .from('performances')
      .upsert(performanceData, { onConflict: 'slug' })
      .select('id, slug')
      .single();

    if (perfError) {
      console.error(`  ❌ Error upserting performance ${performanceData.name}:`, perfError.message);
      continue;
    }

    console.log(`  ✅ Performance ID: ${perfResult.id}`);

    // Upsert poems for each theme
    if (themes && themes.length > 0) {
      for (const theme of themes) {
        console.log(`  📝 Upserting theme: ${theme.theme}`);

        for (const poem of theme.poems) {
          const poemData = {
            performance_id: perfResult.id,
            theme: theme.theme,
            theme_slug: theme.theme_slug,
            text: poem.text,
            author_name: poem.author_name,
            author_type: poem.author_type,
          };

          // Check if poem already exists (by performance_id + theme_slug + author_type)
          const { data: existing } = await supabase
            .from('poems')
            .select('id')
            .eq('performance_id', perfResult.id)
            .eq('theme_slug', theme.theme_slug)
            .eq('author_type', poem.author_type)
            .limit(1)
            .single();

          if (existing) {
            // Update existing poem
            const { error: updateError } = await supabase
              .from('poems')
              .update(poemData)
              .eq('id', existing.id);

            if (updateError) {
              console.error(`    ❌ Error updating poem:`, updateError.message);
            } else {
              console.log(`    ✅ Updated: ${poem.author_type} poem by ${poem.author_name}`);
            }
          } else {
            // Insert new poem
            const { error: insertError } = await supabase
              .from('poems')
              .insert(poemData);

            if (insertError) {
              console.error(`    ❌ Error inserting poem:`, insertError.message);
            } else {
              console.log(`    ✅ Inserted: ${poem.author_type} poem by ${poem.author_name}`);
            }
          }
        }
      }
    }
  }

  console.log('\n🎉 Seed process complete!');

  // Verify counts
  const { count: perfCount } = await supabase
    .from('performances')
    .select('*', { count: 'exact', head: true });
  const { count: poemCount } = await supabase
    .from('poems')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Database stats:`);
  console.log(`  Performances: ${perfCount}`);
  console.log(`  Poems: ${poemCount}`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
