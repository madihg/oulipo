import Link from 'next/link';

export const metadata = {
  title: 'About Singulars — Human vs Machine Poetry',
  description: 'Learn about the Singulars project — a series of live human-vs-machine poetry duels.',
};

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
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Further Reading</h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
        }}>
          <a
            href="https://substack.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              padding: '1.5rem',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'border-color 0.2s',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>On Poetry and Machines</h3>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              Exploring what happens when algorithms write verse.
            </p>
          </a>

          <a
            href="https://substack.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              padding: '1.5rem',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'border-color 0.2s',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>The Training Loop</h3>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              How audience votes shape the next generation of machine poetry.
            </p>
          </a>

          <a
            href="https://substack.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              padding: '1.5rem',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'border-color 0.2s',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Behind the Performances</h3>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              What it&apos;s like to compete against an AI on stage.
            </p>
          </a>
        </div>
      </section>
    </main>
  );
}
