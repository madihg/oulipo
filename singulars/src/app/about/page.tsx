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

export default function AboutPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem' }}>
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

      <h1
        style={{
          fontFamily: '"Terminal Grotesque", sans-serif',
          fontSize: '4rem',
          lineHeight: 0.9,
          marginBottom: '2rem',
          fontWeight: 400,
        }}
      >
        About Singulars
      </h1>

      <section style={{ lineHeight: 1.4, fontSize: '1rem' }}>
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
          votes are collected and used to further train the machine for the next round—a form of
          artisanal RLHF (reinforcement learning from human feedback)—creating a feedback loop
          between human taste and machine output.
        </p>

        <p style={{ marginBottom: '2rem' }}>
          Singulars is created by{' '}
          <a
            href="https://www.halimmadi.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Halim Madi
          </a>
          .
        </p>
      </section>

      <hr />

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
          Further Reading
        </h2>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0',
          }}
        >
          {substackCards.map((card) => (
            <a
              key={card.url}
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                padding: '1.5rem 0',
                borderTop: '1px solid rgba(0,0,0,0.75)',
                color: 'inherit',
                transition: 'opacity 0.3s ease',
              }}
            >
              <h3
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 500,
                  marginBottom: '0.25rem',
                  lineHeight: 1.2,
                }}
              >
                {card.title}
              </h3>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'rgba(0,0,0,0.6)',
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {card.subtitle}
              </p>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
