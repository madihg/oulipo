import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

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
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
} catch { /* ignore */ }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const seedData = JSON.parse(readFileSync(resolve(__dirname, 'seed-data.json'), 'utf-8'));

async function verify() {
  console.log('=== PERFORMANCE VERIFICATION ===\n');

  // Get all performances from DB
  const { data: performances, error: perfError } = await supabase
    .from('performances')
    .select('*');

  if (perfError) {
    console.error('Error fetching performances:', perfError.message);
    process.exit(1);
  }

  console.log(`Expected: ${seedData.performances.length} performances`);
  console.log(`Actual: ${performances.length} performances`);
  console.log();

  const fieldChecks = ['name', 'slug', 'color', 'location', 'date', 'status', 'num_poems', 'num_poets', 'model_link', 'huggingface_link'];
  let allMatch = true;

  for (const expected of seedData.performances) {
    const actual = performances.find(p => p.slug === expected.slug);
    if (!actual) {
      console.log(`❌ Missing performance: ${expected.name}`);
      allMatch = false;
      continue;
    }

    let perfMatch = true;
    for (const field of fieldChecks) {
      const exp = JSON.stringify(expected[field] ?? null);
      const act = JSON.stringify(actual[field] ?? null);
      if (exp !== act) {
        console.log(`❌ ${expected.name}.${field}: expected ${exp}, got ${act}`);
        perfMatch = false;
        allMatch = false;
      }
    }

    // Check poets array
    const expPoets = JSON.stringify(expected.poets || []);
    const actPoets = JSON.stringify(actual.poets || []);
    if (expPoets !== actPoets) {
      console.log(`❌ ${expected.name}.poets: expected ${expPoets}, got ${actPoets}`);
      perfMatch = false;
      allMatch = false;
    }

    if (perfMatch) {
      console.log(`✅ ${expected.name}: all fields match`);
    }
  }

  console.log();
  console.log(allMatch ? '✅ ALL PERFORMANCE FIELDS VERIFIED' : '❌ SOME FIELDS MISMATCH');

  // Now verify poems
  console.log('\n=== POEM VERIFICATION ===\n');

  const { data: poems, error: poemError } = await supabase
    .from('poems')
    .select('*');

  if (poemError) {
    console.error('Error fetching poems:', poemError.message);
    process.exit(1);
  }

  // Count expected poems
  let expectedPoemCount = 0;
  for (const perf of seedData.performances) {
    if (perf.themes) {
      for (const theme of perf.themes) {
        expectedPoemCount += theme.poems.length;
      }
    }
  }

  console.log(`Expected: ${expectedPoemCount} poems`);
  console.log(`Actual: ${poems.length} poems`);
  console.log();

  let allPoemsMatch = true;

  for (const perf of seedData.performances) {
    const dbPerf = performances.find(p => p.slug === perf.slug);
    if (!dbPerf || !perf.themes) continue;

    for (const theme of perf.themes) {
      for (const expectedPoem of theme.poems) {
        const dbPoem = poems.find(p =>
          p.performance_id === dbPerf.id &&
          p.theme_slug === theme.theme_slug &&
          p.author_type === expectedPoem.author_type
        );

        if (!dbPoem) {
          console.log(`❌ Missing poem: ${perf.name} / ${theme.theme} / ${expectedPoem.author_type}`);
          allPoemsMatch = false;
          continue;
        }

        let poemMatch = true;

        // Check theme
        if (dbPoem.theme !== theme.theme) {
          console.log(`❌ ${perf.name}/${theme.theme}/${expectedPoem.author_type} theme: expected "${theme.theme}", got "${dbPoem.theme}"`);
          poemMatch = false;
          allPoemsMatch = false;
        }

        // Check text
        if (dbPoem.text !== expectedPoem.text) {
          console.log(`❌ ${perf.name}/${theme.theme}/${expectedPoem.author_type} text: MISMATCH`);
          console.log(`   Expected starts: "${expectedPoem.text.slice(0, 50)}..."`);
          console.log(`   Actual starts:   "${dbPoem.text.slice(0, 50)}..."`);
          poemMatch = false;
          allPoemsMatch = false;
        }

        // Check author_name
        if (dbPoem.author_name !== expectedPoem.author_name) {
          console.log(`❌ ${perf.name}/${theme.theme}/${expectedPoem.author_type} author_name: expected "${expectedPoem.author_name}", got "${dbPoem.author_name}"`);
          poemMatch = false;
          allPoemsMatch = false;
        }

        // Check performance_id association
        if (dbPoem.performance_id !== dbPerf.id) {
          console.log(`❌ ${perf.name}/${theme.theme}/${expectedPoem.author_type} performance_id: expected "${dbPerf.id}", got "${dbPoem.performance_id}"`);
          poemMatch = false;
          allPoemsMatch = false;
        }

        if (poemMatch) {
          console.log(`✅ ${perf.name} / ${theme.theme} / ${expectedPoem.author_type} by ${expectedPoem.author_name}: all fields match`);
        }
      }
    }
  }

  console.log();
  console.log(allPoemsMatch ? '✅ ALL POEM FIELDS VERIFIED' : '❌ SOME POEM FIELDS MISMATCH');

  console.log('\n=== SUMMARY ===');
  console.log(`Performances: ${performances.length}/5 ${performances.length === 5 ? '✅' : '❌'}`);
  console.log(`Poems: ${poems.length}/${expectedPoemCount} ${poems.length === expectedPoemCount ? '✅' : '❌'}`);
  console.log(`Performance fields: ${allMatch ? '✅' : '❌'}`);
  console.log(`Poem fields: ${allPoemsMatch ? '✅' : '❌'}`);

  if (allMatch && allPoemsMatch && performances.length === 5 && poems.length === expectedPoemCount) {
    console.log('\n🎉 ALL VERIFICATIONS PASSED');
  } else {
    console.log('\n❌ SOME VERIFICATIONS FAILED');
    process.exit(1);
  }
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
