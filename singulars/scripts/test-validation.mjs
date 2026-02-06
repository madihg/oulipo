// Test script for poem_id and fingerprint validation
const BASE_URL = 'http://localhost:3001';

async function testVote(description, body) {
  try {
    const res = await fetch(`${BASE_URL}/api/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    console.log(`[${res.status}] ${description}: ${JSON.stringify(data)}`);
    return { status: res.status, data };
  } catch (err) {
    console.error(`[ERROR] ${description}: ${err.message}`);
    return { status: 'error', error: err.message };
  }
}

async function main() {
  console.log('=== Feature #52: poem_id format validation ===');

  // Test 1: non-UUID string
  await testVote('poem_id="not-a-uuid"', { poem_id: 'not-a-uuid', fingerprint: 'test_fp' });

  // Test 2: empty string
  await testVote('poem_id=""', { poem_id: '', fingerprint: 'test_fp' });

  // Test 3: number
  await testVote('poem_id=12345', { poem_id: 12345, fingerprint: 'test_fp' });

  // Test 4: SQL injection attempt
  await testVote('poem_id=SQL injection', {
    poem_id: "1'; DROP TABLE poems;--",
    fingerprint: 'test_fp'
  });

  // Test 5: Another SQL injection
  await testVote('poem_id=SQL injection 2', {
    poem_id: "' OR '1'='1",
    fingerprint: 'test_fp'
  });

  // Test 6: valid UUID format (non-existent) should pass format check
  await testVote('poem_id=valid UUID (non-existent)', {
    poem_id: '00000000-0000-0000-0000-000000000000',
    fingerprint: 'test_fp_valid'
  });

  console.log('\n=== Feature #53: fingerprint format validation ===');

  // Test 7: 10000-char fingerprint
  const longFp = 'a'.repeat(10000);
  await testVote('fingerprint=10000 chars', {
    poem_id: '00000000-0000-0000-0000-000000000000',
    fingerprint: longFp
  });

  // Test 8: fingerprint with HTML tags
  await testVote('fingerprint=<script>alert("xss")</script>', {
    poem_id: '00000000-0000-0000-0000-000000000000',
    fingerprint: '<script>alert("xss")</script>'
  });

  // Test 9: fingerprint with HTML img tag
  await testVote('fingerprint=<img onerror=...>', {
    poem_id: '00000000-0000-0000-0000-000000000000',
    fingerprint: '<img src=x onerror=alert(1)>'
  });

  // Test 10: valid fingerprint should succeed (format-wise)
  await testVote('fingerprint=valid (short)', {
    poem_id: '00000000-0000-0000-0000-000000000000',
    fingerprint: 'valid_fingerprint_123'
  });

  console.log('\nAll validation tests complete!');
}

main();
