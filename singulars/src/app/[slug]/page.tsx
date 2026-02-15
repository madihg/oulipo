import Link from 'next/link';
import { getServiceClient, getSupabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { accessibleTextColor, getStatusPillStyle } from '@/lib/color-utils';
import { hasDescription, getPerformanceDescription, cargoImg, HERO_IMAGES, getPerformanceHeroImage } from '@/lib/performance-descriptions';
import PerformanceContentBlocks from '@/components/PerformanceContentBlocks';

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
  const [year, month, day] = dateStr.split('-').map(Number);
  if (year && month && day) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[month - 1]} ${day}, ${year}`;
  }
  const d = new Date(dateStr + 'T00:00:00');
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
  const a11yColor = accessibleTextColor(performance.color);

  const cssVars = {
    '--performance-color': performance.color,
    '--performance-color-light': performance.color + '20',
    '--performance-color-a11y': a11yColor,
  } as React.CSSProperties;

  // Upcoming performances
  if (performance.status === 'upcoming') {
    return (
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', ...cssVars }} data-performance-color={performance.color} data-status="upcoming">
        <nav style={{ marginBottom: '2rem' }}>
          <Link
            href="/"
            style={{
              color: 'rgba(0,0,0,0.6)',
              fontSize: '0.9rem',
            }}
          >
            &larr; Back to Singulars
          </Link>
        </nav>

        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <h1
            style={{
              fontFamily: '"Terminal Grotesque", sans-serif',
              fontSize: '4rem',
              lineHeight: 0.9,
              marginBottom: '1.5rem',
              fontWeight: 400,
              color: a11yColor,
            }}
          >
            {performance.name}
          </h1>

          <span
            style={{
              display: 'inline-block',
              fontFamily: '"Diatype Mono Variable", monospace',
              fontSize: '0.7rem',
              letterSpacing: '0.03em',
              padding: '0.2rem 0.6rem',
              border: '1px solid rgba(0,0,0,0.25)',
              color: 'rgba(0,0,0,0.5)',
              marginBottom: '2rem',
            }}
          >
            upcoming
          </span>

          {performance.location && (
            <p style={{ fontSize: '1rem', color: 'rgba(0,0,0,0.6)', marginBottom: '0.5rem' }}>
              {performance.location}
            </p>
          )}

          <p
            style={{
              fontFamily: '"Diatype Mono Variable", monospace',
              fontSize: '0.9rem',
              color: 'rgba(0,0,0,0.5)',
              marginBottom: '2rem',
            }}
          >
            {formatDate(performance.date)}
          </p>

          <p style={{ fontSize: '1rem', color: 'rgba(0,0,0,0.5)', lineHeight: 1.4, maxWidth: '500px', margin: '0 auto' }}>
            This performance has not taken place yet. Check back after the event for poems and voting.
          </p>
        </div>
      </main>
    );
  }

  const heroImg = getPerformanceHeroImage(performance.slug) ?? HERO_IMAGES.landing;

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', ...cssVars }} data-performance-color={performance.color}>
      <nav style={{ marginBottom: '2rem' }}>
        <Link
          href="/"
          style={{
            color: 'rgba(0,0,0,0.6)',
            fontSize: '0.9rem',
          }}
        >
          &larr; Back to Singulars
        </Link>
      </nav>

      {/* Hero image — same aspect ratio as landing for alignment */}
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          marginBottom: '2rem',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <img
          src={cargoImg(heroImg.hash, heroImg.filename, 1600)}
          alt={heroImg.alt}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>

      {/* Performance header */}
      <header style={{ marginBottom: '3rem' }}>
        <h1
          style={{
            fontFamily: '"Terminal Grotesque", sans-serif',
            fontSize: '4rem',
            lineHeight: 0.9,
            marginBottom: '1rem',
            fontWeight: 400,
            color: a11yColor,
          }}
        >
          {performance.name}
        </h1>
        <p style={{ fontSize: '1rem', color: 'rgba(0,0,0,0.6)', marginBottom: '0.25rem' }}>
          {performance.location}
        </p>
        <p
          style={{
            fontFamily: '"Diatype Mono Variable", monospace',
            fontSize: '0.9rem',
            color: 'rgba(0,0,0,0.5)',
            marginBottom: '1rem',
          }}
        >
          {formatDate(performance.date)}
        </p>

        {/* Status pill */}
        {(() => {
          const pill = getStatusPillStyle(performance.status, performance.color);
          return (
            <span
              style={{
                display: 'inline-block',
                fontFamily: '"Diatype Mono Variable", monospace',
                fontSize: '0.7rem',
                letterSpacing: '0.03em',
                padding: '0.2rem 0.6rem',
                border: `1px solid ${pill.border}`,
                color: pill.color,
                marginBottom: '1rem',
              }}
            >
              {performance.status}
            </span>
          );
        })()}

        {/* Stats */}
        {themes.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '1.5rem',
              fontFamily: '"Diatype Mono Variable", monospace',
              fontSize: '0.85rem',
              color: 'rgba(0,0,0,0.5)',
              marginBottom: '1rem',
            }}
          >
            <span>{performance.poems.length} poems (training data)</span>
            <span>
              {themes.reduce((sum, t) => sum + t.poems.reduce((s, p) => s + (p.vote_count ?? 0), 0), 0)} total votes
            </span>
          </div>
        )}

        {/* Links */}
        {(performance.model_link || performance.huggingface_link) && (
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {performance.model_link && (
              <a
                href={performance.model_link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'rgba(0,0,0,0.6)', fontSize: '0.9rem' }}
              >
                Duelling Model
              </a>
            )}
            {performance.huggingface_link && (
              <a
                href={performance.huggingface_link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'rgba(0,0,0,0.6)', fontSize: '0.9rem' }}
              >
                Training Data (HuggingFace)
              </a>
            )}
          </div>
        )}

        {hasDescription(performance.slug) && (
          <div style={{ marginTop: '1rem' }}>
            <Link
              href={`/${performance.slug}/about`}
              style={{ color: 'rgba(0,0,0,0.6)', fontSize: '0.9rem' }}
            >
              About this performance &rarr;
            </Link>
          </div>
        )}
      </header>

      <hr />

      {/* Scraped content (images, paragraphs, galleries) */}
      {hasDescription(performance.slug) && (() => {
        const desc = getPerformanceDescription(performance.slug);
        return desc ? (
          <section style={{ marginBottom: '3rem' }}>
            <PerformanceContentBlocks content={desc.content} />
          </section>
        ) : null;
      })()}

      {hasDescription(performance.slug) && <hr />}

      {/* Theme cards with poems */}
      <section>
        <h2
          style={{
            fontFamily: '"Diatype Variable", sans-serif',
            fontSize: '2rem',
            fontWeight: 700,
            marginBottom: '2rem',
            lineHeight: 1.2,
          }}
        >
          Themes
        </h2>
        {themes.map((themeGroup) => (
          <div
            key={themeGroup.theme_slug}
            style={{
              marginBottom: '3rem',
              borderLeft: `2px solid ${performance.color}`,
              paddingLeft: '1.5rem',
            }}
          >
            <Link
              href={`/${performance.slug}/${themeGroup.theme_slug}`}
              style={{
                color: 'inherit',
              }}
            >
              <h3
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 500,
                  marginBottom: '1.5rem',
                  cursor: 'pointer',
                  lineHeight: 1.2,
                }}
              >
                {themeGroup.theme}
                <span style={{ fontSize: '0.85rem', color: 'rgba(0,0,0,0.4)', marginLeft: '0.5rem' }}>
                  &rarr;
                </span>
              </h3>
            </Link>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '2rem',
              }}
            >
              {themeGroup.poems.map((poem) => (
                <div
                  key={poem.id}
                  style={{
                    padding: '1.5rem 0',
                    borderTop: '1px solid rgba(0,0,0,0.12)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.95rem',
                      lineHeight: 1.7,
                      whiteSpace: 'pre-line',
                      color: 'rgba(0,0,0,0.85)',
                    }}
                  >
                    {poem.text}
                  </div>
                  <div
                    style={{
                      fontFamily: '"Diatype Mono Variable", monospace',
                      fontSize: '0.8rem',
                      color: 'rgba(0,0,0,0.5)',
                      marginTop: '0.5rem',
                    }}
                  >
                    {(poem.vote_count ?? 0)} {(poem.vote_count ?? 0) === 1 ? 'vote' : 'votes'}
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
