'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getFingerprint } from '@/lib/fingerprint';
import { accessibleTextColor } from '@/lib/color-utils';

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
  const [hoveredPoem, setHoveredPoem] = useState<string | null>(null);

  // Fetch a random theme from hard.exe
  useEffect(() => {
    async function fetchRandomTheme() {
      try {
        // Fetch hard.exe performance with all poems
        const res = await fetch('/api/performances/hard-exe');
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

  const handleVote = useCallback(async (poemId: string) => {
    if (voting || !themeData) return;
    setVoting(true);

    try {
      const fingerprint = await getFingerprint();

      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poem_id: poemId, fingerprint }),
      });

      if (!res.ok && res.status !== 429) {
        throw new Error('Vote request failed');
      }

      // Navigate to the post-vote / theme page
      const themeSlug = themeData.poems[0]?.theme_slug;
      router.push(`/singulars/${themeData.performance.slug}/${themeSlug}`);
    } catch (err) {
      console.error('Vote error:', err);
      setError('Failed to register vote. Please try again.');
      setVoting(false);
    }
  }, [voting, themeData, router]);

  if (loading) {
    return (
      <div
        data-testid="mini-voting"
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#737373',
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
          padding: '2rem',
          textAlign: 'center',
          color: '#737373',
          fontSize: '0.9rem',
        }}
      >
        {error || 'Could not load voting experience'}
      </div>
    );
  }

  const { performance, poems } = themeData;
  const themeName = poems[0]?.theme || '';
  // Accessible text color: darkened variant of performance color meeting 4.5:1 on white
  const a11yColor = useMemo(
    () => accessibleTextColor(performance.color),
    [performance.color]
  );

  return (
    <section
      data-testid="mini-voting"
      style={{
        marginBottom: '2.5rem',
        padding: '1.5rem',
        border: `2px solid ${performance.color}20`,
        borderRadius: '16px',
        backgroundColor: `${performance.color}05`,
      }}
    >
      {/* Theme name */}
      <h2
        data-testid="mini-voting-theme"
        style={{
          fontSize: '1.5rem',
          textAlign: 'center',
          marginBottom: '0.5rem',
          fontWeight: 600,
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
          gap: '0.5rem',
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
            padding: '0.15rem 0.5rem',
            borderRadius: '999px',
            fontSize: '0.7rem',
            fontWeight: 500,
            backgroundColor: performance.color + '20',
            color: a11yColor,
          }}
        >
          {performance.status}
        </span>
      </div>

      {/* Instruction text */}
      <p
        style={{
          textAlign: 'center',
          color: '#737373',
          fontSize: '0.85rem',
          marginBottom: '1.25rem',
          fontStyle: 'italic',
        }}
      >
        Click or press Enter on the poem you prefer to cast your vote
      </p>

      {/* Poems - side by side on desktop, stacked on mobile */}
      <div
        data-testid="mini-voting-poems"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        {poems.map((poem) => (
          <div
            key={poem.id}
            data-testid={`mini-voting-poem-${poem.author_type}`}
            data-poem-id={poem.id}
            data-voteable="true"
            onClick={() => handleVote(poem.id)}
            onMouseEnter={() => setHoveredPoem(poem.id)}
            onMouseLeave={() => setHoveredPoem(null)}
            role="button"
            aria-label={`Vote for this poem`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleVote(poem.id);
              }
            }}
            style={{
              padding: '1.25rem',
              border: `2px solid ${
                hoveredPoem === poem.id ? performance.color : '#e0e0e0'
              }`,
              borderRadius: '12px',
              backgroundColor:
                hoveredPoem === poem.id
                  ? `${performance.color}10`
                  : '#fafafa',
              cursor: voting
                ? 'wait'
                : `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><circle cx='10' cy='10' r='8' fill='${encodeURIComponent(performance.color)}'/></svg>") 10 10, pointer`,
              transition: 'border-color 0.2s ease, background-color 0.2s ease, transform 0.15s ease',
              transform: hoveredPoem === poem.id ? 'translateY(-2px)' : 'none',
              opacity: voting ? 0.7 : 1,
              userSelect: 'none',
            }}
          >
            {/* Poem text - no author labels to maintain blind voting */}
            <div
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '0.9rem',
                lineHeight: '1.7',
                whiteSpace: 'pre-line',
                color: '#333',
                minHeight: '100px',
              }}
            >
              {poem.text}
            </div>
          </div>
        ))}
      </div>

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
