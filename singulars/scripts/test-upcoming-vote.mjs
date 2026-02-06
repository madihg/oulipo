/**
 * Test script: Insert a temp poem into reverse.exe (upcoming), attempt a vote, verify rejection.
 * Cleans up after itself.
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // 1. Get reverse.exe performance id
  const { data: perf, error: perfErr } = await supabase
    .from('performances')
    .select('id, status')
    .eq('slug', 'reverse-exe')
    .single();

  if (perfErr || !perf) {
    console.error('Failed to get reverse.exe:', perfErr);
    process.exit(1);
  }
  console.log(`reverse.exe id: ${perf.id}, status: ${perf.status}`);

  // 2. Insert a temporary test poem
  const { data: testPoem, error: poemErr } = await supabase
    .from('poems')
    .insert({
      performance_id: perf.id,
      theme: 'Test Theme',
      theme_slug: 'test-theme',
      text: 'This is a test poem for upcoming validation',
      author_name: 'Test Author',
      author_type: 'human',
      vote_count: 0,
    })
    .select('id')
    .single();

  if (poemErr || !testPoem) {
    console.error('Failed to insert test poem:', poemErr);
    process.exit(1);
  }
  console.log(`Test poem id: ${testPoem.id}`);

  // 3. Attempt to vote via the API
  try {
    const resp = await fetch('http://localhost:3001/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        poem_id: testPoem.id,
        fingerprint: 'TEST_UPCOMING_19',
      }),
    });
    const result = await resp.json();
    console.log('Vote response:', JSON.stringify(result, null, 2));

    // 4. Check if vote was written
    const { data: votes } = await supabase
      .from('votes')
      .select('id')
      .eq('voter_fingerprint', 'TEST_UPCOMING_19')
      .eq('poem_id', testPoem.id);

    console.log(`Votes found: ${votes?.length || 0}`);

    if (result.success === false && (!votes || votes.length === 0)) {
      console.log('✅ TEST PASSED: Vote correctly rejected for upcoming performance');
    } else {
      console.log('❌ TEST FAILED: Vote should have been rejected');
    }
  } catch (e) {
    console.error('Error calling vote API:', e.message);
  }

  // 5. Cleanup: delete test poem and any votes
  await supabase.from('votes').delete().eq('voter_fingerprint', 'TEST_UPCOMING_19');
  await supabase.from('poems').delete().eq('id', testPoem.id);
  console.log('Cleanup complete');
}

run().catch(console.error);
