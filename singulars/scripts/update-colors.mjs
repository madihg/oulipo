/**
 * Update performance colors in Supabase for WCAG AA contrast compliance.
 * - reinforcement.exe: #10B981 → #059669 (emerald-600, 3.77:1 ratio on white)
 * - versus.exe: #F59E0B → #B45309 (amber-700, 5.02:1 ratio on white)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env.local manually
const envContent = readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim();
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateColors() {
  const updates = [
    { slug: 'reinforcement-exe', color: '#059669' },
    { slug: 'versus-exe', color: '#B45309' },
  ];

  for (const { slug, color } of updates) {
    const { data, error } = await supabase
      .from('performances')
      .update({ color })
      .eq('slug', slug)
      .select('name, slug, color');

    if (error) {
      console.error(`Failed to update ${slug}:`, error);
    } else {
      console.log(`Updated ${slug} to ${color}:`, data);
    }
  }
}

updateColors().then(() => process.exit(0));
