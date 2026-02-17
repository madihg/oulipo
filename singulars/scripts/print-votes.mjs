#!/usr/bin/env node
/**
 * Print vote counts for reinforcement.exe poems.
 * Usage: node scripts/print-votes.mjs
 */
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const { data: perf } = await supabase
    .from('performances')
    .select('id, name, slug')
    .eq('slug', 'reinforcement-exe')
    .single();

  if (!perf) {
    console.log('reinforcement-exe performance not found');
    return;
  }

  const { data: poems, error } = await supabase
    .from('poems')
    .select('id, theme, theme_slug, author_type, vote_count, text')
    .eq('performance_id', perf.id)
    .order('theme_slug', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n=== reinforcement.exe poems — vote_count ===\n');
  console.log('Performance:', perf.name, '| id:', perf.id);
  console.log('Total poems:', poems?.length ?? 0);
  console.log('');

  if (!poems?.length) {
    console.log('No poems found.');
    return;
  }

  let totalVotes = 0;
  for (const p of poems) {
    const vc = p.vote_count ?? 0;
    totalVotes += vc;
    const preview = (p.text || '').slice(0, 40).replace(/\n/g, ' ');
    console.log(`${p.theme_slug} | ${p.author_type.padEnd(6)} | vote_count: ${String(vc).padStart(3)} | ${p.id} | "${preview}..."`);
  }

  console.log('\n---');
  console.log('Total votes across all poems:', totalVotes);
  console.log('');
}

main();
