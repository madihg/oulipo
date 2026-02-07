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
  // Parse date parts manually to avoid timezone shifting.
  // Date-only strings like "2024-11-15" are parsed as UTC midnight by JS,
  // which can shift the displayed day in negative-offset timezones.
  const [year, month, day] = dateStr.split('-').map(Number);
  if (year && month && day) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[month - 1]} ${day}, ${year}`;
  }
  // Fallback for unexpected formats
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
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Singulars</h1>
      <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '2rem' }}>
        Human vs Machine Poetry Performances
      </p>

      {/* Mini-voting experience */}
      <MiniVoting />

      {/* Performance Cards - Horizontally Scrollable */}
      <section
        style={{
          marginBottom: '3rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            overflowX: 'auto',
            paddingBottom: '1rem',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {performances.map((perf) => {
            const isUpcoming = perf.status === 'upcoming';

            const cardContent = (
              <div
                key={perf.id}
                data-testid="performance-card"
                data-performance-name={perf.name}
                style={{
                  flex: '0 0 220px',
                  minWidth: '220px',
                  padding: '1.5rem',
                  border: `2px solid ${perf.color}`,
                  borderRadius: '12px',
                  scrollSnapAlign: 'start',
                  backgroundColor: isUpcoming ? perf.color + '08' : '#fff',
                  cursor: isUpcoming ? 'default' : 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                <h3
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    color: perf.color,
                    marginBottom: '0.5rem',
                  }}
                >
                  {perf.name}
                </h3>

                {/* Status badge */}
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    marginBottom: '0.75rem',
                    backgroundColor:
                      perf.status === 'training'
                        ? perf.color + '20'
                        : perf.status === 'trained'
                        ? '#e0e0e0'
                        : '#fef3c7',
                    color:
                      perf.status === 'training'
                        ? perf.color
                        : perf.status === 'trained'
                        ? '#555'
                        : '#92400e',
                  }}
                >
                  {perf.status}
                </span>

                {perf.location && (
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: '#666',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {perf.location}
                  </p>
                )}

                {perf.date && (
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: '#737373',
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
                href={`/singulars/${perf.slug}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                {cardContent}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Duel the Machine CTA */}
      <section style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <a
          href="https://halimmadi.com/contact-form"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '0.85rem 2rem',
            fontSize: '1.1rem',
            fontWeight: 600,
            color: '#fff',
            backgroundColor: '#000',
            border: '2px solid #000',
            borderRadius: '8px',
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease, color 0.2s ease',
          }}
        >
          Duel the Machine
        </a>
      </section>

      {/* About section */}
      <section style={{ marginTop: '3rem', borderTop: '1px solid #e0e0e0', paddingTop: '2rem' }}>
        <p style={{ fontSize: '1rem', color: '#333', lineHeight: '1.6', marginBottom: '1rem' }}>
          Singulars is a series of live poetry duels between a human poet and a machine.
          The audience votes to decide the winner — and their votes train the machine for
          the next performance.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Created by{' '}
          <a
            href="https://www.halimmadi.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#000', textDecoration: 'underline' }}
          >
            Halim Madi
          </a>
        </p>
        <Link
          href="/singulars/about"
          style={{
            display: 'inline-block',
            color: '#000',
            textDecoration: 'underline',
            fontSize: '1rem',
          }}
        >
          About Singulars &rarr;
        </Link>
      </section>
    </main>
  );
}
