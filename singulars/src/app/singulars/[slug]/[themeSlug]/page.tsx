import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';

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

  // Get performance
  const { data: performance, error: perfError } = await supabase
    .from('performances')
    .select('*')
    .eq('slug', performanceSlug)
    .single();

  if (perfError || !performance) {
    console.error('Theme page: performance not found', { performanceSlug, perfError });
    return null;
  }

  // Get poems for this theme
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

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      {/* Navigation */}
      <nav style={{ marginBottom: '2rem' }}>
        <Link
          href={`/singulars/${performance.slug}`}
          style={{
            color: '#666',
            textDecoration: 'none',
            fontSize: '0.9rem',
          }}
        >
          &larr; Back to {performance.name}
        </Link>
      </nav>

      {/* Theme name */}
      <h1
        style={{
          fontSize: '2.5rem',
          marginBottom: '0.5rem',
          textAlign: 'center',
        }}
      >
        {themeName}
      </h1>

      {/* Performance info */}
      <p
        style={{
          textAlign: 'center',
          fontSize: '1rem',
          color: '#666',
          marginBottom: '0.5rem',
        }}
      >
        <span style={{ color: performance.color, fontWeight: 600 }}>
          {performance.name}
        </span>
      </p>

      {/* Status indicator */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            borderRadius: '999px',
            fontSize: '0.85rem',
            fontWeight: 500,
            backgroundColor:
              performance.status === 'training'
                ? performance.color + '20'
                : performance.status === 'trained'
                ? '#e0e0e0'
                : '#fef3c7',
            color:
              performance.status === 'training'
                ? performance.color
                : performance.status === 'trained'
                ? '#666'
                : '#92400e',
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
            color: '#999',
            fontSize: '0.9rem',
            marginBottom: '2rem',
            fontStyle: 'italic',
          }}
        >
          Training is closed. Vote counts are final.
        </p>
      )}

      {performance.status === 'upcoming' && (
        <p
          style={{
            textAlign: 'center',
            color: '#92400e',
            fontSize: '0.9rem',
            marginBottom: '2rem',
            fontStyle: 'italic',
          }}
        >
          Coming soon &mdash; voting has not yet begun.
        </p>
      )}

      {/* Poems - side by side on desktop, stacked on mobile */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
        }}
      >
        {poems.map((poem) => (
          <div
            key={poem.id}
            data-poem-id={poem.id}
            data-author-type={poem.author_type}
            style={{
              padding: '2rem',
              border: `2px solid ${
                poem.author_type === 'machine' ? performance.color : '#e0e0e0'
              }`,
              borderRadius: '12px',
              backgroundColor:
                poem.author_type === 'machine'
                  ? performance.color + '05'
                  : '#fafafa',
            }}
          >
            {/* Author info */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color:
                    poem.author_type === 'human' ? '#333' : performance.color,
                }}
              >
                {poem.author_name}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  backgroundColor:
                    poem.author_type === 'human'
                      ? '#e8e8e8'
                      : performance.color + '20',
                  color:
                    poem.author_type === 'human' ? '#555' : performance.color,
                }}
              >
                {poem.author_type}
              </span>
            </div>

            {/* Poem text */}
            <div
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '1.05rem',
                lineHeight: '1.8',
                whiteSpace: 'pre-line',
                color: '#333',
              }}
            >
              {poem.text}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
