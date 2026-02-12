import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPerformanceDescription, cargoImg } from '@/lib/performance-descriptions';

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
        {desc.content.map((block, i) => {
          switch (block.type) {
            case 'paragraph':
              return (
                <p
                  key={i}
                  style={{
                    fontSize: '1.1rem',
                    lineHeight: 1.7,
                    color: 'rgba(0,0,0,0.85)',
                    marginBottom: '1.5rem',
                  }}
                >
                  {block.text}
                </p>
              );

            case 'italic':
              return (
                <blockquote
                  key={i}
                  style={{
                    fontStyle: 'italic',
                    fontSize: '1.1rem',
                    lineHeight: 1.7,
                    color: 'rgba(0,0,0,0.6)',
                    borderLeft: '2px solid rgba(0,0,0,0.12)',
                    paddingLeft: '1.5rem',
                    margin: '2rem 0',
                  }}
                >
                  {block.text}
                </blockquote>
              );

            case 'image':
              return (
                <figure key={i} style={{ margin: '2rem 0' }}>
                  <img
                    src={cargoImg(block.hash, block.filename)}
                    alt={block.alt}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                    }}
                  />
                </figure>
              );

            case 'gallery':
              // Use dense grid for 8+ items (small thumbnails), regular for 3-5
              const isDense = block.items.length > 5;
              return (
                <div
                  key={i}
                  className={isDense ? 'desc-gallery-dense' : 'desc-gallery'}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isDense
                      ? `repeat(${Math.min(block.items.length, 4)}, 1fr)`
                      : `repeat(${Math.min(block.items.length, 3)}, 1fr)`,
                    gap: isDense ? '0.5rem' : '1rem',
                    margin: '2rem 0',
                  }}
                >
                  {block.items.map((item, j) => (
                    <img
                      key={j}
                      src={cargoImg(item.hash, item.filename, isDense ? 600 : 1000)}
                      alt={item.alt}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        aspectRatio: isDense ? '1' : 'auto',
                        objectFit: isDense ? 'cover' : 'contain',
                      }}
                    />
                  ))}
                </div>
              );

            default:
              return null;
          }
        })}
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
