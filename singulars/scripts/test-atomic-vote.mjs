/**
 * Test: Atomic vote operation prevents race conditions (Feature #55)
 *
 * Sends 5 concurrent POST /api/vote requests with different fingerprints
 * to the same poem, then verifies:
 * 1. All 5 requests succeeded
 * 2. vote_count increased by exactly 5
 * 3. Exactly 5 vote records exist for these fingerprints
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const POEM_ID = '2ccd86f0-522c-459b-b118-6f5df8b57d9c'; // hard.exe Loss machine poem
const TEST_PREFIX = 'ATOMIC_TEST_F55';
const NUM_CONCURRENT = 5;

async function getVoteCount() {
  const res = await fetch(`${BASE_URL}/api/vote-counts/loss?performance=hard-exe`);
  if (!res.ok) throw new Error(`Failed to get vote counts: ${res.status}`);
  const data = await res.json();
  // API returns { theme_slug, poems: { [id]: { vote_count, author_type } } }
  const poemData = data.poems?.[POEM_ID];
  return poemData ? poemData.vote_count : null;
}

async function checkVoteRecord(fingerprint) {
  const res = await fetch(`${BASE_URL}/api/check-votes?fingerprint=${fingerprint}`);
  if (!res.ok) return { found: false };
  const data = await res.json();
  const hasVote = (data.votes || []).some(v => v.poem_id === POEM_ID);
  return { found: hasVote, count: data.count || 0 };
}

async function main() {
  console.log('=== Feature #55: Atomic Vote Concurrency Test ===\n');

  // Step 1: Get current vote count
  const countBefore = await getVoteCount();
  console.log(`1. Current vote_count for poem ${POEM_ID}: ${countBefore}`);

  // Step 2: Generate 5 unique fingerprints
  const fingerprints = Array.from({ length: NUM_CONCURRENT }, (_, i) =>
    `${TEST_PREFIX}_${Date.now()}_${i}`
  );
  console.log(`2. Generated ${NUM_CONCURRENT} unique fingerprints`);
  fingerprints.forEach((fp, i) => console.log(`   [${i}] ${fp}`));

  // Step 3: Send 5 concurrent requests using Promise.all
  console.log(`\n3. Sending ${NUM_CONCURRENT} concurrent POST /api/vote requests...`);
  const startTime = Date.now();

  const promises = fingerprints.map((fp, i) =>
    fetch(`${BASE_URL}/api/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poem_id: POEM_ID, fingerprint: fp }),
    }).then(async (res) => {
      const data = await res.json();
      return { index: i, status: res.status, data, fingerprint: fp };
    }).catch(err => {
      return { index: i, status: 'error', error: err.message, fingerprint: fp };
    })
  );

  const results = await Promise.all(promises);
  const elapsed = Date.now() - startTime;

  console.log(`   All ${NUM_CONCURRENT} requests completed in ${elapsed}ms\n`);

  // Step 4: Analyze results
  console.log('4. Results:');
  let successCount = 0;
  let failCount = 0;
  for (const r of results) {
    const success = r.data?.success === true;
    if (success) successCount++;
    else failCount++;
    console.log(`   [${r.index}] HTTP ${r.status}, success: ${success}, msg: ${r.data?.message || r.error || 'N/A'}`);
  }
  console.log(`\n   Successes: ${successCount}, Failures/Duplicates: ${failCount}`);

  // Step 5: Wait briefly for DB writes to settle, then check final vote count
  await new Promise(resolve => setTimeout(resolve, 1000));
  const countAfter = await getVoteCount();
  const delta = countAfter - countBefore;
  console.log(`\n5. Vote count AFTER: ${countAfter} (was ${countBefore}, delta: +${delta})`);

  // Step 6: Check individual vote records exist
  console.log(`\n6. Checking vote records for each test fingerprint...`);
  let recordCount = 0;
  for (const fp of fingerprints) {
    const result = await checkVoteRecord(fp);
    if (result.found) recordCount++;
    console.log(`   ${fp}: ${result.found ? 'VOTE FOUND' : 'NO VOTE'}`);
  }

  // Step 7: Verdict
  console.log('\n=== VERDICT ===');
  const allSucceeded = successCount === NUM_CONCURRENT;
  const countCorrect = delta === NUM_CONCURRENT;
  const recordsCorrect = recordCount === NUM_CONCURRENT;

  console.log(`All ${NUM_CONCURRENT} votes succeeded:         ${allSucceeded ? 'PASS' : 'FAIL'} (${successCount}/${NUM_CONCURRENT})`);
  console.log(`Vote count increased by exactly ${NUM_CONCURRENT}: ${countCorrect ? 'PASS' : 'FAIL'} (delta: ${delta})`);
  console.log(`Exactly ${NUM_CONCURRENT} vote records exist:  ${recordsCorrect ? 'PASS' : 'FAIL'} (found: ${recordCount})`);

  const allPassed = allSucceeded && countCorrect && recordsCorrect;
  console.log(`\nOverall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

  console.log('\nTest fingerprints used:', fingerprints.join(', '));

  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
