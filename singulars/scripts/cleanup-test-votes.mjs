import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

async function cleanup() {
  const fingerprints = ['POSITIVE_TEST_19', 'TEST_TRAINED_19', 'BROWSER_TEST_TRAINED', 'TEST_UPCOMING_19'];
  for (const fp of fingerprints) {
    const { error } = await supabase.from('votes').delete().eq('voter_fingerprint', fp);
    if (error) console.log('Error deleting', fp, error.message);
    else console.log('Cleaned up', fp);
  }
}

cleanup().catch(console.error);
