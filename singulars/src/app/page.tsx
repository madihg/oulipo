import Link from 'next/link';
import { getServiceClient, getSupabase } from '@/lib/supabase';
import MiniVoting from '@/components/MiniVoting';
import { accessibleTextColor } from '@/lib/color-utils';

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
}

async function getPerformances(): Promise<Performance[]> {
  const supabase = getServiceClient() || getSupabase();
  if (!supabase) return [];

  const { data: performances, error } = await supabase
    .from('performances')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching performances:', error);
    return [];
  }

  return performances || [];
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

export default async function SingularsPage() {
  const performances = await getPerformances();

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem' }}>
      {/* Header */}
      <h1
        style={{
          fontFamily: '"Terminal Grotesque", sans-serif',
          fontSize: '7rem',
          lineHeight: 0.9,
          marginBottom: '1rem',
          fontWeight: 400,
        }}
      >
        Singulars
      </h1>
      <p
        style={{
          fontFamily: '"Diatype Mono Variable", monospace',
          fontSize: '1rem',
          color: 'rgba(0,0,0,0.6)',
          marginBottom: '3rem',
          lineHeight: 1.4,
        }}
      >
        Human vs Machine Poetry Performances
      </p>

      {/* Mini-voting experience */}
      <MiniVoting />

      <hr />

      {/* Performances */}
      <section style={{ marginBottom: '3rem' }}>
        <h2
          style={{
            fontFamily: '"Diatype Variable", sans-serif',
            fontSize: '2rem',
            fontWeight: 700,
            marginBottom: '2rem',
            lineHeight: 1.2,
          }}
        >
          Performances
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '2rem',
          }}
        >
          {performances.map((perf) => {
            const isUpcoming = perf.status === 'upcoming';
            const perfA11yColor = accessibleTextColor(perf.color);

            const cardContent = (
              <div
                key={perf.id}
                data-testid="performance-card"
                data-performance-name={perf.name}
                style={{
                  padding: '1.5rem 0',
                  borderTop: `2px solid ${perf.color}`,
                  cursor: isUpcoming ? 'default' : 'pointer',
                  transition: 'opacity 0.3s ease',
                }}
              >
                <h3
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 500,
                    color: perfA11yColor,
                    marginBottom: '0.5rem',
                    lineHeight: 1.2,
                  }}
                >
                  {perf.name}
                </h3>

                {/* Status pill */}
                <span
                  style={{
                    display: 'inline-block',
                    fontFamily: '"Diatype Mono Variable", monospace',
                    fontSize: '0.7rem',
                    letterSpacing: '0.03em',
                    padding: '0.2rem 0.6rem',
                    border: `1px solid ${perf.status === 'training' ? perf.color : 'rgba(0,0,0,0.25)'}`,
                    color: perf.status === 'training' ? perfA11yColor : 'rgba(0,0,0,0.5)',
                    marginBottom: '0.75rem',
                  }}
                >
                  {perf.status}
                </span>

                {perf.location && (
                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: 'rgba(0,0,0,0.6)',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {perf.location}
                  </p>
                )}

                {perf.date && (
                  <p
                    style={{
                      fontFamily: '"Diatype Mono Variable", monospace',
                      fontSize: '0.85rem',
                      color: 'rgba(0,0,0,0.5)',
                    }}
                  >
                    {formatDate(perf.date)}
                  </p>
                )}
              </div>
            );

            if (isUpcoming) {
              return (
                <div key={perf.id}>
                  {cardContent}
                </div>
              );
            }

            return (
              <Link
                key={perf.id}
                href={`/${perf.slug}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                {cardContent}
              </Link>
            );
          })}
        </div>

        {/* Responsive grid style */}
        <style>{`
          @media (max-width: 900px) {
            main > section > div[style*="grid-template-columns"] {
              grid-template-columns: repeat(2, 1fr) !important;
            }
          }
          @media (max-width: 600px) {
            main > section > div[style*="grid-template-columns"] {
              grid-template-columns: 1fr !important;
            }
            main > h1 {
              font-size: 4.5rem !important;
            }
          }
        `}</style>
      </section>

      <hr />

      {/* About section */}
      <section>
        <p style={{ fontSize: '1rem', color: 'rgba(0,0,0,0.85)', lineHeight: 1.4, marginBottom: '1rem' }}>
          Singulars is a series of live poetry duels between a human poet and a machine.
          The audience votes to decide the winner — and their votes train the machine for
          the next performance.{' '}
          <Link href="/about" style={{ color: 'rgba(0,0,0,0.85)', textDecoration: 'underline' }}>
            Learn more about it.
          </Link>
        </p>
        <p style={{ marginBottom: '1rem', fontSize: '1rem' }}>
          by{' '}
          <a
            href="https://www.halimmadi.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'rgba(0,0,0,0.85)', textDecoration: 'underline' }}
          >
            Halim Madi
          </a>
        </p>
      </section>
    </main>
  );
}
