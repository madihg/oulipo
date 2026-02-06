import Link from 'next/link';

export default function PerformanceNotFound() {
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
          Performance not found
        </p>
        <p style={{ fontSize: '1rem', color: '#999', marginBottom: '2rem' }}>
          The performance you&apos;re looking for doesn&apos;t exist or may have been removed.
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
