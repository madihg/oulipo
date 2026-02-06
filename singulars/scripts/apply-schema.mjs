/**
 * Apply database schema to Supabase
 *
 * Usage: node scripts/apply-schema.mjs
 *
 * Uses the Supabase SQL API endpoint to execute DDL statements.
 */

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
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
} catch {
  // .env.local not found
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Extract project ref from URL
const projectRef = new URL(supabaseUrl).hostname.split('.')[0];

// Read the SQL schema
const schemaPath = resolve(__dirname, 'schema.sql');
const schemaSql = readFileSync(schemaPath, 'utf-8');

async function tryExecuteSql(sql, endpoint, headers) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: sql }),
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text };
  } catch (err) {
    return { ok: false, status: 0, text: err.message };
  }
}

async function applySchema() {
  console.log('🔧 Applying database schema...\n');
  console.log(`Project ref: ${projectRef}`);
  console.log(`Supabase URL: ${supabaseUrl}\n`);

  // Try multiple SQL endpoints
  const endpoints = [
    {
      name: 'Supabase SQL API (v1)',
      url: `https://api.supabase.com/v1/projects/${projectRef}/sql`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
    },
    {
      name: 'Direct SQL endpoint',
      url: `${supabaseUrl}/sql`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
      },
    },
    {
      name: 'Supabase pg endpoint',
      url: `${supabaseUrl}/pg`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
      },
    },
  ];

  for (const ep of endpoints) {
    console.log(`Trying ${ep.name}: ${ep.url}`);
    const result = await tryExecuteSql(schemaSql, ep.url, ep.headers);
    console.log(`  Status: ${result.status}`);
    if (result.ok) {
      console.log(`  ✅ Schema applied successfully via ${ep.name}!`);
      console.log(`  Response: ${result.text.substring(0, 500)}`);
      return true;
    }
    console.log(`  Response: ${result.text.substring(0, 200)}`);
    console.log();
  }

  console.log('\n❌ All automated SQL endpoints failed.');
  console.log('\nThe schema must be applied manually via the Supabase Dashboard SQL Editor.');
  console.log(`\nAlternatively, try using the Supabase CLI with an access token:`);
  console.log(`  npx supabase db push --linked`);
  return false;
}

applySchema().then(success => {
  if (!success) {
    console.log('\n📋 Manual setup instructions:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log(`2. Open project: ${projectRef}`);
    console.log('3. Go to SQL Editor');
    console.log('4. Paste the contents of scripts/schema.sql');
    console.log('5. Click "Run"');
    process.exit(1);
  }
}).catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
