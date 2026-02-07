import Link from 'next/link';

export default function ThemeNotFound() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
      <nav style={{ marginBottom: '2rem', textAlign: 'left' }}>
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

      <div style={{ marginTop: '4rem' }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '0.5rem', color: '#333' }}>404</h1>
        <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '2rem' }}>
          Theme not found
        </p>
        <p style={{ fontSize: '1rem', color: '#737373', marginBottom: '2rem' }}>
          The theme you&apos;re looking for doesn&apos;t exist under this performance.
        </p>
        <Link
          href="/singulars"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#333',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
          }}
        >
          Browse All Performances
        </Link>
      </div>
    </main>
  );
}
