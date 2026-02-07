import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (t && !t.startsWith('#')) {
    const i = t.indexOf('=');
    if (i > 0) env[t.slice(0, i)] = t.slice(i + 1);
  }
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { error } = await sb.from('votes').delete().eq('voter_fingerprint', 'SINGLE_TEST_check');
if (error) console.error('Error:', error.message);
else console.log('Cleaned up SINGLE_TEST_check vote');

const { error: e2 } = await sb.from('poems').update({ vote_count: 2 }).eq('id', '1e9f3585-ee28-4288-adaf-ff8f61084181');
if (e2) console.error('Error:', e2.message);
else console.log('Reset vote_count to 2');
