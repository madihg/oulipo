import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPerformanceDescription } from '@/lib/performance-descriptions';
import PerformanceContentBlocks from '@/components/PerformanceContentBlocks';

export const dynamic = 'force-dynamic';

export default function PerformanceAboutPage({
  params,
}: {
  params: { slug: string };
}) {
  const desc = getPerformanceDescription(params.slug);

  if (!desc) {
    notFound();
  }

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem' }}>
      <style>{`
        @media (max-width: 600px) {
          .desc-gallery { grid-template-columns: 1fr !important; }
          .desc-gallery-dense { grid-template-columns: repeat(2, 1fr) !important; }
          .desc-title { font-size: 4.5rem !important; }
        }
        @media (max-width: 900px) {
          .desc-gallery { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <nav style={{ marginBottom: '2rem' }}>
        <Link
          href={`/${params.slug}`}
          style={{
            color: 'rgba(0,0,0,0.6)',
            fontSize: '0.9rem',
          }}
        >
          &larr; Back to {desc.title}
        </Link>
      </nav>

      {/* Header */}
      <header style={{ marginBottom: '3rem' }}>
        <h1
          className="desc-title"
          style={{
            fontFamily: '"Terminal Grotesque", sans-serif',
            fontSize: '7rem',
            lineHeight: 0.9,
            marginBottom: '1rem',
            fontWeight: 400,
            color: 'rgba(0,0,0,0.85)',
          }}
        >
          {desc.title}
        </h1>

        <p
          style={{
            fontFamily: '"Diatype Mono Variable", monospace',
            fontSize: '0.9rem',
            color: 'rgba(0,0,0,0.5)',
            marginBottom: '0.25rem',
          }}
        >
          {desc.date}
        </p>

        <p style={{ fontSize: '1rem', color: 'rgba(0,0,0,0.6)', marginBottom: '0.25rem' }}>
          {desc.location}
        </p>

        <p
          style={{
            fontFamily: '"Diatype Variable", sans-serif',
            fontSize: '0.85rem',
            color: 'rgba(0,0,0,0.5)',
            fontWeight: 500,
            marginBottom: '1.5rem',
          }}
        >
          {desc.series}
        </p>

        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <a
            href={desc.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'rgba(0,0,0,0.6)', fontSize: '0.9rem' }}
          >
            Live site
          </a>
          <a
            href={desc.datasetUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'rgba(0,0,0,0.6)', fontSize: '0.9rem' }}
          >
            Dataset
          </a>
        </div>
      </header>

      <hr />

      {/* Content blocks */}
      <section>
        <PerformanceContentBlocks content={desc.content} />
      </section>

      {/* Footer nav */}
      <hr />
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          href={`/${params.slug}`}
          style={{
            color: 'rgba(0,0,0,0.6)',
            fontSize: '0.9rem',
          }}
        >
          &larr; View poems &amp; voting
        </Link>
        <Link
          href="/"
          style={{
            color: 'rgba(0,0,0,0.6)',
            fontSize: '0.9rem',
          }}
        >
          All performances
        </Link>
      </nav>
    </main>
  );
}
