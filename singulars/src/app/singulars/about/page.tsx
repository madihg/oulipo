import Link from 'next/link';

export const metadata = {
  title: 'About Singulars — Human vs Machine Poetry',
  description: 'Learn about the Singulars project — a series of live human-vs-machine poetry duels.',
};

const substackCards = [
  {
    title: 'Eat.exe',
    subtitle: 'Drawing a Latent Future with Electric Lines of Desire',
    url: 'https://secondvoice.substack.com/p/eatexe',
  },
  {
    title: 'On Poetry and Machines',
    subtitle: 'Exploring what happens when algorithms write verse.',
    url: 'https://secondvoice.substack.com/p/the-lost-art-of-memory',
  },
  {
    title: 'The Training Loop',
    subtitle: 'How audience votes shape the next generation of machine poetry.',
    url: 'https://secondvoice.substack.com/p/the-150hr-poet',
  },
  {
    title: 'Behind the Performances',
    subtitle: 'What it\u2019s like to compete against an AI on stage.',
    url: 'https://secondvoice.substack.com/p/the-prestige-of-the-sentence',
  },
];

/* Stagger offsets for the spread layout.
   On mobile the cards collapse into a single column with no offsets. */
const staggerOffsets = [
  { rotate: '-1.2deg', translateY: '0px', translateX: '-8px' },
  { rotate: '0.8deg', translateY: '12px', translateX: '14px' },
  { rotate: '-0.6deg', translateY: '-6px', translateX: '-4px' },
  { rotate: '1deg', translateY: '8px', translateX: '10px' },
];

export default function AboutPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
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

      <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>About Singulars</h1>

      <section style={{ lineHeight: '1.8', fontSize: '1.1rem', color: '#333' }}>
        <p style={{ marginBottom: '1.5rem' }}>
          Singulars is a series of live poetry performances where a human poet duels a machine.
          Each performance pits original human poems against AI-generated counterparts on shared
          themes, and the audience votes to decide the winner.
        </p>

        <p style={{ marginBottom: '1.5rem' }}>
          The project explores the boundary between human creativity and machine generation.
          Can a language model capture the nuance, emotion, and craft of a human poet? Can an
          audience tell the difference? Singulars puts these questions to the test in a live,
          participatory format.
        </p>

        <p style={{ marginBottom: '1.5rem' }}>
          Each performance uses a different AI model, trained or fine-tuned on poetry. The audience
          votes are collected and used to further train the machine for the next round, creating a
          feedback loop between human taste and machine output.
        </p>

        <p style={{ marginBottom: '2rem' }}>
          Singulars is created by{' '}
          <a
            href="https://www.halimmadi.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#000', textDecoration: 'underline' }}
          >
            Halim Madi
          </a>
          .
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Further Reading</h2>

        {/* Staggered card layout */}
        <div
          className="substack-cards"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.2rem',
            padding: '0.5rem 0',
          }}
        >
          {substackCards.map((card, i) => {
            const offset = staggerOffsets[i] || staggerOffsets[0];
            return (
              <a
                key={card.url}
                href={card.url}
                target="_blank"
                rel="noopener noreferrer"
                className="substack-card"
                data-index={i}
                style={{
                  display: 'block',
                  padding: '1.5rem 1.8rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'transform 0.25s ease, border-color 0.2s, box-shadow 0.25s ease',
                  backgroundColor: '#fff',
                  /* Stagger transforms – overridden on mobile via media query */
                  transform: `rotate(${offset.rotate}) translateY(${offset.translateY}) translateX(${offset.translateX})`,
                }}
              >
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>{card.title}</h3>
                <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>
                  {card.subtitle}
                </p>
              </a>
            );
          })}
        </div>

        {/* CSS for hover effects and responsive stagger removal */}
        <style>{`
          .substack-card:hover {
            transform: rotate(0deg) translateY(-4px) translateX(0px) !important;
            border-color: #999 !important;
            box-shadow: 0 4px 16px rgba(0,0,0,0.08);
          }

          @media (max-width: 600px) {
            .substack-card {
              transform: none !important;
            }
            .substack-card:hover {
              transform: translateY(-2px) !important;
            }
          }
        `}</style>
      </section>
    </main>
  );
}
