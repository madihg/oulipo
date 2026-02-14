import { cargoImg } from '@/lib/performance-descriptions';
import type { PerformanceDescription } from '@/lib/performance-descriptions';

interface PerformanceContentBlocksProps {
  content: PerformanceDescription['content'];
}

export default function PerformanceContentBlocks({ content }: PerformanceContentBlocksProps) {
  return (
    <>
      <style>{`
        @media (max-width: 600px) {
          .desc-gallery { grid-template-columns: 1fr !important; }
          .desc-gallery-dense { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 900px) {
          .desc-gallery { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
      {content.map((block, i) => {
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
    </>
  );
}
