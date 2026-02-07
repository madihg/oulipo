#!/usr/bin/env node
/**
 * Test concurrent voting to verify atomic operation via cast_vote RPC.
 *
 * Steps:
 * 1. Get a poem_id from hard.exe (training status)
 * 2. Record current vote_count
 * 3. Send 5 concurrent votes with unique fingerprints
 * 4. Verify vote_count increased by exactly 5
 * 5. Verify exactly 5 vote records exist
 * 6. Clean up test data
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import http from 'http';

// Parse .env.local manually
const envContent = readFileSync('.env.local', 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      envVars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
    }
  }
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const NUM_CONCURRENT = 5;
const TEST_PREFIX = 'CONCURRENT_TEST_';
const TIMESTAMP = Date.now();

function postVote(poemId, fingerprint) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ poem_id: poemId, fingerprint });
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/vote',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
      timeout: 15000,
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body: { raw: body } });
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== Concurrent Vote Test ===\n');

  // Step 1: Get a poem from hard.exe (training)
  console.log('Step 1: Finding a poem from hard.exe...');
  const { data: hardExe, error: perfError } = await supabase
    .from('performances')
    .select('id, name, status')
    .eq('slug', 'hard-exe')
    .single();

  if (perfError || !hardExe) {
    console.error('Could not find hard.exe performance:', perfError?.message);
    process.exit(1);
  }
  console.log(`  Found: ${hardExe.name} (status: ${hardExe.status})`);

  if (hardExe.status !== 'training') {
    console.error('  ERROR: hard.exe is not in training status!');
    process.exit(1);
  }

  const { data: poems, error: poemError } = await supabase
    .from('poems')
    .select('id, theme, vote_count')
    .eq('performance_id', hardExe.id)
    .limit(1);

  if (poemError || !poems || poems.length === 0) {
    console.error('Could not find poems for hard.exe:', poemError?.message);
    process.exit(1);
  }

  const testPoem = poems[0];
  console.log(`  Using poem: ${testPoem.id} (theme: ${testPoem.theme})`);
  console.log(`  Current vote_count: ${testPoem.vote_count}\n`);

  // Step 2: Record initial vote count
  const initialVoteCount = testPoem.vote_count;

  // Step 3: Send 5 concurrent votes with unique fingerprints
  console.log(`Step 3: Sending ${NUM_CONCURRENT} concurrent votes...`);
  const fingerprints = [];
  for (let i = 0; i < NUM_CONCURRENT; i++) {
    fingerprints.push(`${TEST_PREFIX}${TIMESTAMP}_${i}`);
  }

  // Fire all requests simultaneously
  const promises = fingerprints.map((fp, i) =>
    postVote(testPoem.id, fp)
      .then((r) => ({ index: i, ...r, fingerprint: fp }))
      .catch((err) => ({ index: i, status: 'error', body: { error: err.message }, fingerprint: fp }))
  );

  const results = await Promise.all(promises);

  console.log('  Results:');
  let successCount = 0;
  for (const r of results) {
    const isSuccess = r.body.success === true;
    if (isSuccess) successCount++;
    console.log(`    [${r.index}] ${isSuccess ? 'SUCCESS' : 'FAILED'} (HTTP ${r.status}) - ${r.body.message || r.body.error || 'unknown'}`);
  }
  console.log(`  Total successes: ${successCount}/${NUM_CONCURRENT}\n`);

  // Wait a moment for DB to settle
  await new Promise((r) => setTimeout(r, 1000));

  // Step 4: Check updated vote_count
  console.log('Step 4: Checking updated vote_count...');
  const { data: updatedPoem, error: updateError } = await supabase
    .from('poems')
    .select('vote_count')
    .eq('id', testPoem.id)
    .single();

  if (updateError || !updatedPoem) {
    console.error('Could not fetch updated poem:', updateError?.message);
    process.exit(1);
  }

  const expectedCount = initialVoteCount + NUM_CONCURRENT;
  const actualCount = updatedPoem.vote_count;
  console.log(`  Initial count: ${initialVoteCount}`);
  console.log(`  Expected count: ${expectedCount}`);
  console.log(`  Actual count:   ${actualCount}`);
  console.log(`  Difference:     ${actualCount - initialVoteCount}`);

  const countCorrect = actualCount === expectedCount;
  console.log(`  Vote count check: ${countCorrect ? 'PASS ✅' : 'FAIL ❌'}\n`);

  // Step 5: Verify vote records
  console.log('Step 5: Checking vote records in DB...');
  const { data: voteRecords, error: voteError } = await supabase
    .from('votes')
    .select('id, voter_fingerprint, poem_id')
    .in('voter_fingerprint', fingerprints);

  if (voteError) {
    console.error('Could not query votes:', voteError.message);
    process.exit(1);
  }

  const recordCount = voteRecords?.length || 0;
  console.log(`  Found ${recordCount} vote records for test fingerprints`);
  const recordsCorrect = recordCount === NUM_CONCURRENT;
  console.log(`  Vote records check: ${recordsCorrect ? 'PASS ✅' : 'FAIL ❌'}\n`);

  // Step 6: Clean up
  console.log('Step 6: Cleaning up test data...');
  const { error: deleteError } = await supabase
    .from('votes')
    .delete()
    .in('voter_fingerprint', fingerprints);

  if (deleteError) {
    console.error('  Failed to delete test votes:', deleteError.message);
  } else {
    console.log(`  Deleted ${recordCount} test vote records`);
  }

  // Reset vote_count back to original
  const { error: decrementError } = await supabase
    .from('poems')
    .update({ vote_count: initialVoteCount })
    .eq('id', testPoem.id);

  if (decrementError) {
    console.error('  Failed to reset vote count:', decrementError.message);
  } else {
    console.log(`  Reset vote_count to ${initialVoteCount}`);
  }

  console.log('\n=== RESULTS ===');
  const allPassed = countCorrect && recordsCorrect && successCount === NUM_CONCURRENT;
  console.log(`All ${NUM_CONCURRENT} concurrent votes succeeded: ${successCount === NUM_CONCURRENT ? 'YES ✅' : 'NO ❌'}`);
  console.log(`Vote count increased by exactly ${NUM_CONCURRENT}: ${countCorrect ? 'YES ✅' : 'NO ❌'}`);
  console.log(`Exactly ${NUM_CONCURRENT} vote records created: ${recordsCorrect ? 'YES ✅' : 'NO ❌'}`);
  console.log(`\nOverall: ${allPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);

  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
