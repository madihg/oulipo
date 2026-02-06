import Link from 'next/link';

export default function SingularsPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Singulars</h1>
      <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '2rem' }}>
        Human vs Machine Poetry Performances
      </p>

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
