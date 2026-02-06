/**
 * Test script: Rate limiting on POST /api/vote
 * Sends 50+ rapid requests and verifies 429 responses after threshold.
 */

const VOTE_URL = 'http://localhost:3001/api/vote';
const FINGERPRINT = 'RATE_LIMIT_TEST_63';
const POEM_ID = 'afa5348f-a8ac-4421-ab32-fa51681c6ad0'; // reinforcement.exe poem (trained, so no actual votes written)
const TOTAL_REQUESTS = 50;

async function sendVote(i) {
  const res = await fetch(VOTE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ poem_id: POEM_ID, fingerprint: FINGERPRINT }),
  });
  return { index: i, status: res.status };
}

async function run() {
  console.log(`Sending ${TOTAL_REQUESTS} rapid requests...`);

  // Send all requests in parallel for maximum speed
  const promises = [];
  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    promises.push(sendVote(i));
  }

  const results = await Promise.all(promises);

  // Count status codes
  const statusCounts = {};
  let first429 = -1;
  for (const r of results) {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    if (r.status === 429 && first429 === -1) first429 = r.index;
  }

  console.log('\nResults:');
  console.log('Status code distribution:', JSON.stringify(statusCounts));
  if (first429 !== -1) {
    console.log(`First 429 at request index: ${first429}`);
  }

  const has429 = statusCounts[429] > 0;
  const hasNon429 = (statusCounts[200] || 0) > 0;

  if (has429 && hasNon429) {
    console.log('\n✅ TEST PASSED: Rate limiting is working correctly');
    console.log(`  - ${statusCounts[200] || 0} requests succeeded (200)`);
    console.log(`  - ${statusCounts[429] || 0} requests rate-limited (429)`);
  } else if (has429) {
    console.log('\n✅ TEST PASSED: All requests were rate-limited (429)');
  } else {
    console.log('\n❌ TEST FAILED: No 429 responses received - rate limiting may not be working');
  }
}

run().catch(console.error);
