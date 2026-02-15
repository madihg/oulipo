'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getFingerprint } from '@/lib/fingerprint';
import { accessibleTextColor, getStatusPillStyle } from '@/lib/color-utils';

interface Poem {
  id: string;
  performance_id: string;
  theme: string;
  theme_slug: string;
  text: string;
  author_name: string;
  author_type: 'human' | 'machine';
  vote_count: number;
}

interface Performance {
  id: string;
  name: string;
  slug: string;
  color: string;
  status: 'upcoming' | 'training' | 'trained';
}

interface ThemeData {
  performance: Performance;
  poems: Poem[];
}

export default function MiniVoting() {
  const router = useRouter();
  const [themeData, setThemeData] = useState<ThemeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoemId, setSelectedPoemId] = useState<string | null>(null);

  const a11yColor = useMemo(
    () => themeData ? accessibleTextColor(themeData.performance.color) : 'rgba(0,0,0,0.85)',
    [themeData]
  );

  // Fetch a random theme from hard.exe
  useEffect(() => {
    async function fetchRandomTheme() {
      try {
        const res = await fetch('/singulars/api/performances/hard-exe');
        if (!res.ok) {
          throw new Error('Failed to fetch performance data');
        }
        const data = await res.json();

        // Group poems by theme
        const themeMap = new Map<string, Poem[]>();
        for (const poem of data.poems) {
          const existing = themeMap.get(poem.theme_slug) || [];
          existing.push(poem);
          themeMap.set(poem.theme_slug, existing);
        }

        // Pick a random theme
        const themes = Array.from(themeMap.entries());
        const randomIdx = Math.floor(Math.random() * themes.length);
        const [, poems] = themes[randomIdx];

        setThemeData({
          performance: {
            id: data.id,
            name: data.name,
            slug: data.slug,
            color: data.color,
            status: data.status,
          },
          poems,
        });
      } catch (err) {
        console.error('MiniVoting fetch error:', err);
        setError('Could not load voting experience');
      } finally {
        setLoading(false);
      }
    }

    fetchRandomTheme();
  }, []);

  const handleSelect = useCallback((poemId: string) => {
    if (voting) return;
    setSelectedPoemId(prev => prev === poemId ? null : poemId);
  }, [voting]);

  const handleSubmit = useCallback(async () => {
    if (voting || !themeData || !selectedPoemId) return;
    setVoting(true);

    try {
      const fingerprint = await getFingerprint();

      const res = await fetch('/singulars/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poem_id: selectedPoemId, fingerprint }),
      });

      if (!res.ok && res.status !== 429) {
        throw new Error('Vote request failed');
      }

      // Navigate to the post-vote / theme page
      const themeSlug = themeData.poems[0]?.theme_slug;
      router.push(`/${themeData.performance.slug}/${themeSlug}`);
    } catch (err) {
      console.error('Vote error:', err);
      setError('Failed to register vote. Please try again.');
      setVoting(false);
    }
  }, [voting, themeData, selectedPoemId, router]);

  if (loading) {
    return (
      <div
        data-testid="mini-voting"
        style={{
          padding: '2rem 0',
          textAlign: 'center',
          color: 'rgba(0,0,0,0.5)',
          fontSize: '0.9rem',
        }}
      >
        Loading voting experience...
      </div>
    );
  }

  if (error || !themeData) {
    return (
      <div
        data-testid="mini-voting"
        style={{
          padding: '2rem 0',
          textAlign: 'center',
          color: 'rgba(0,0,0,0.5)',
          fontSize: '0.9rem',
        }}
      >
        {error || 'Could not load voting experience'}
      </div>
    );
  }

  const { performance, poems } = themeData;
  const themeName = poems[0]?.theme || '';

  return (
    <section
      data-testid="mini-voting"
      style={{
        marginBottom: '3rem',
        padding: '2rem 0',
        borderTop: `2px solid ${performance.color}`,
      }}
    >
      {/* Theme name */}
      <h2
        data-testid="mini-voting-theme"
        style={{
          fontFamily: '"Diatype Variable", sans-serif',
          fontSize: '2rem',
          textAlign: 'center',
          marginBottom: '0.5rem',
          fontWeight: 700,
          lineHeight: 1.2,
        }}
      >
        {themeName}
      </h2>

      {/* Performance name and status */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <span
          data-testid="mini-voting-performance"
          style={{
            color: a11yColor,
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          {performance.name}
        </span>
        <span
          data-testid="mini-voting-status"
          style={{
            display: 'inline-block',
            fontFamily: '"Diatype Mono Variable", monospace',
            fontSize: '0.65rem',
            letterSpacing: '0.03em',
            padding: '0.15rem 0.5rem',
            border: `1px solid ${getStatusPillStyle(performance.status, performance.color).border}`,
            color: getStatusPillStyle(performance.status, performance.color).color,
          }}
        >
          {performance.status}
        </span>
      </div>

      {/* Instruction text */}
      <p
        style={{
          textAlign: 'center',
          color: 'rgba(0,0,0,0.5)',
          fontSize: '0.85rem',
          marginBottom: '1.5rem',
        }}
      >
        Click on the poem you prefer to cast your vote
      </p>

      {/* Poems */}
      <div
        data-testid="mini-voting-poems"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
        }}
      >
        {poems.map((poem) => {
          const isSelected = selectedPoemId === poem.id;
          return (
            <div
              key={poem.id}
              data-testid={`mini-voting-poem-${poem.author_type}`}
              data-poem-id={poem.id}
              data-voteable="true"
              onClick={() => handleSelect(poem.id)}
              role="button"
              aria-label={`Vote for this poem`}
              aria-pressed={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(poem.id);
                }
              }}
              style={{
                padding: '1.5rem 0',
                borderTop: isSelected
                  ? `2px solid ${performance.color}`
                  : '2px solid rgba(0,0,0,0.12)',
                cursor: voting
                  ? 'wait'
                  : `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><circle cx='10' cy='10' r='8' fill='${encodeURIComponent(performance.color)}'/></svg>") 10 10, pointer`,
                transition: 'opacity 0.3s ease, border-color 0.3s ease',
                opacity: voting ? 0.7 : (selectedPoemId && !isSelected ? 0.5 : 1),
                userSelect: 'none',
              }}
            >
              {/* Poem text - no author labels to maintain blind voting */}
              <div
                style={{
                  fontSize: '0.95rem',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-line',
                  color: 'rgba(0,0,0,0.85)',
                  minHeight: '100px',
                  textAlign: 'left',
                }}
              >
                {poem.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit button — only shown when a poem is selected */}
      {selectedPoemId && !voting && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            onClick={handleSubmit}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              fontWeight: 700,
              fontFamily: '"Standard", sans-serif',
              color: '#fff',
              backgroundColor: performance.color,
              border: 'none',
              cursor: 'pointer',
              transition: 'opacity 0.3s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            Submit my vote
          </button>
        </div>
      )}

      {voting && (
        <p
          style={{
            textAlign: 'center',
            marginTop: '1rem',
            color: a11yColor,
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          Recording your vote...
        </p>
      )}
    </section>
  );
}
