import Link from 'next/link';
import { getServiceClient, getSupabase } from '@/lib/supabase';
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
  num_poems: number;
  num_poets: number;
  model_link: string | null;
  huggingface_link: string | null;
  status: 'upcoming' | 'training' | 'trained';
  poets: string[];
  created_at: string;
  poems: Poem[];
}

interface ThemeGroup {
  theme: string;
  theme_slug: string;
  poems: Poem[];
}

async function getPerformance(slug: string): Promise<Performance | null> {
  const supabase = getServiceClient() || getSupabase();
  if (!supabase) return null;

  const { data: performance, error: perfError } = await supabase
    .from('performances')
    .select('*')
    .eq('slug', slug)
    .single();

  if (perfError || !performance) return null;

  const { data: poems, error: poemsError } = await supabase
    .from('poems')
    .select('*')
    .eq('performance_id', performance.id)
    .order('theme_slug', { ascending: true });

  if (poemsError) return null;

  return { ...performance, poems: poems || [] };
}

function groupByTheme(poems: Poem[]): ThemeGroup[] {
  const themeMap = new Map<string, ThemeGroup>();
  for (const poem of poems) {
    if (!themeMap.has(poem.theme_slug)) {
      themeMap.set(poem.theme_slug, {
        theme: poem.theme,
        theme_slug: poem.theme_slug,
        poems: [],
      });
    }
    themeMap.get(poem.theme_slug)!.poems.push(poem);
  }
  return Array.from(themeMap.values());
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function PerformancePage({
  params,
}: {
  params: { slug: string };
}) {
  const performance = await getPerformance(params.slug);

  if (!performance) {
    notFound();
  }

  const themes = groupByTheme(performance.poems);

  // Set the performance color as a CSS custom property for use throughout the page
  const cssVars = {
    '--performance-color': performance.color,
    '--performance-color-light': performance.color + '20',
  } as React.CSSProperties;

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', ...cssVars }} data-performance-color={performance.color}>
      <nav style={{ marginBottom: '2rem' }}>
        <Link
          href="/singulars"
          style={{
            color: '#666',
            textDecoration: 'none',
            fontSize: '0.9rem',
          }}
        >
          &larr; Back to Singulars
        </Link>
      </nav>

      {/* Performance header */}
      <header style={{ marginBottom: '2.5rem' }}>
        <h1
          style={{
            fontSize: '2.5rem',
            marginBottom: '0.5rem',
            color: 'var(--performance-color)',
          }}
        >
          {performance.name}
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '0.25rem' }}>
          {performance.location}
        </p>
        <p style={{ fontSize: '1rem', color: '#999', marginBottom: '1rem' }}>
          {formatDate(performance.date)}
        </p>

        {/* Status badge */}
        <span
          style={{
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            borderRadius: '999px',
            fontSize: '0.85rem',
            fontWeight: 500,
            backgroundColor:
              performance.status === 'training'
                ? 'var(--performance-color-light)'
                : performance.status === 'trained'
                ? '#e0e0e0'
                : '#fef3c7',
            color:
              performance.status === 'training'
                ? 'var(--performance-color)'
                : performance.status === 'trained'
                ? '#666'
                : '#92400e',
          }}
        >
          {performance.status}
        </span>

        {/* Links */}
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
          {performance.model_link && (
            <a
              href={performance.model_link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#666', fontSize: '0.9rem', textDecoration: 'underline' }}
            >
              Duelling Model
            </a>
          )}
          {performance.huggingface_link && (
            <a
              href={performance.huggingface_link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#666', fontSize: '0.9rem', textDecoration: 'underline' }}
            >
              Training Data (HuggingFace)
            </a>
          )}
        </div>
      </header>

      {/* Theme cards with poems */}
      <section>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Themes</h2>
        {themes.map((themeGroup) => (
          <div
            key={themeGroup.theme_slug}
            style={{
              marginBottom: '2.5rem',
              borderLeft: '3px solid var(--performance-color)',
              paddingLeft: '1.5rem',
            }}
          >
            <Link
              href={`/singulars/${performance.slug}/${themeGroup.theme_slug}`}
              style={{
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <h3
                style={{
                  fontSize: '1.3rem',
                  marginBottom: '1rem',
                  cursor: 'pointer',
                }}
              >
                {themeGroup.theme}
                <span style={{ fontSize: '0.8rem', color: '#999', marginLeft: '0.5rem' }}>
                  &rarr;
                </span>
              </h3>
            </Link>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {themeGroup.poems.map((poem) => (
                <div
                  key={poem.id}
                  style={{
                    padding: '1.25rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: poem.author_type === 'human' ? '#333' : 'var(--performance-color)',
                      }}
                    >
                      {poem.author_name}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        backgroundColor: poem.author_type === 'human' ? '#e8e8e8' : 'var(--performance-color-light)',
                        color: poem.author_type === 'human' ? '#555' : 'var(--performance-color)',
                      }}
                    >
                      {poem.author_type}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontSize: '0.95rem',
                      lineHeight: '1.7',
                      whiteSpace: 'pre-line',
                      color: '#333',
                    }}
                  >
                    {poem.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
