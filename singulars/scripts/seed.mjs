/**
 * Seed script for Singulars database
 *
 * Usage: node scripts/seed.mjs
 *
 * Requires environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (bypasses RLS)
 *
 * Expected JSON format: see scripts/seed-data.json
 *
 * This script is idempotent - it uses upsert operations and can be re-run safely.
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
