import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import VotingPoemPair from './VotingPoemPair';
import { accessibleTextColor, getStatusPillStyle } from '@/lib/color-utils';

export const dynamic = 'force-dynamic';

interface Poem {
  id: string;
  performance_id: string;
  theme: string;
  theme_slug: string;
  text: string;
  author_name: string;
  author_type: 'human' | 'machine';
  vote_count: number;
  created_at: string;
}

interface Performance {
  id: string;
  name: string;
  slug: string;
  color: string;
  location: string;
  date: string;
  status: 'upcoming' | 'training' | 'trained';
}

async function getThemeData(
  performanceSlug: string,
  themeSlug: string
): Promise<{ performance: Performance; poems: Poem[] } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Theme page: Supabase not configured', { url: !!url, key: !!key });
    return null;
  }
  const supabase = createClient(url, key);

  const { data: performance, error: perfError } = await supabase
    .from('performances')
    .select('*')
    .eq('slug', performanceSlug)
    .single();

  if (perfError || !performance) {
    console.error('Theme page: performance not found', { performanceSlug, perfError });
    return null;
  }

  const { data: poems, error: poemsError } = await supabase
    .from('poems')
    .select('*')
    .eq('performance_id', performance.id)
    .eq('theme_slug', themeSlug);

  if (poemsError || !poems || poems.length === 0) {
    console.error('Theme page: poems not found', { themeSlug, poemsError, poemCount: poems?.length });
    return null;
  }

  return { performance, poems };
}

export default async function ThemeVotingPage({
  params,
}: {
  params: { slug: string; themeSlug: string };
}) {
  const data = await getThemeData(params.slug, params.themeSlug);

  if (!data) {
    notFound();
  }

  const { performance, poems } = data;
  const themeName = poems[0]?.theme || params.themeSlug;
  const a11yColor = accessibleTextColor(performance.color);

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', '--performance-color': performance.color, '--performance-color-a11y': a11yColor } as React.CSSProperties}>
      {/* Navigation */}
      <nav style={{ marginBottom: '2rem' }}>
        <Link
          href={`/${performance.slug}`}
          style={{
            color: 'rgba(0,0,0,0.6)',
            fontSize: '0.9rem',
          }}
        >
          &larr; Back to {performance.name}
        </Link>
      </nav>

      {/* Theme name */}
      <h1
        style={{
          fontFamily: '"Terminal Grotesque", sans-serif',
          fontSize: '4rem',
          lineHeight: 0.9,
          marginBottom: '0.75rem',
          fontWeight: 400,
          textAlign: 'center',
        }}
      >
        {themeName}
      </h1>

      {/* Performance name */}
      <p
        style={{
          textAlign: 'center',
          fontSize: '1rem',
          marginBottom: '0.5rem',
        }}
      >
        <span style={{ color: a11yColor, fontWeight: 600 }}>
          {performance.name}
        </span>
      </p>

      {/* Status pill */}
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <span
          style={{
            display: 'inline-block',
            fontFamily: '"Diatype Mono Variable", monospace',
            fontSize: '0.7rem',
            letterSpacing: '0.03em',
            padding: '0.2rem 0.6rem',
            border: `1px solid ${getStatusPillStyle(performance.status, performance.color).border}`,
            color: getStatusPillStyle(performance.status, performance.color).color,
          }}
        >
          {performance.status}
        </span>
      </div>

      {/* Status messages */}
      {performance.status === 'trained' && (
        <p
          style={{
            textAlign: 'center',
            color: 'rgba(0,0,0,0.5)',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
          }}
        >
          Training is closed. Vote counts are final.
        </p>
      )}

      {performance.status === 'upcoming' && (
        <p
          style={{
            textAlign: 'center',
            color: 'rgba(0,0,0,0.5)',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
          }}
        >
          Coming soon — voting has not yet begun.
        </p>
      )}

      {/* Interactive voting poem pair */}
      <VotingPoemPair
        poems={poems}
        performanceColor={performance.color}
        performanceStatus={performance.status}
      />
    </main>
  );
}
