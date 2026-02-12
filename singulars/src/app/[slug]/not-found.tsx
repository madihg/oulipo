import Link from 'next/link';

export default function PerformanceNotFound() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', textAlign: 'center' }}>
      <nav style={{ marginBottom: '2rem', textAlign: 'left' }}>
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

      <div style={{ marginTop: '4rem' }}>
        <h1
          style={{
            fontFamily: '"Terminal Grotesque", sans-serif',
            fontSize: '7rem',
            lineHeight: 0.9,
            marginBottom: '1rem',
            fontWeight: 400,
            color: 'rgba(0,0,0,0.85)',
          }}
        >
          404
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'rgba(0,0,0,0.6)', marginBottom: '2rem' }}>
          Performance not found
        </p>
        <p style={{ fontSize: '1rem', color: 'rgba(0,0,0,0.5)', marginBottom: '2rem', lineHeight: 1.4 }}>
          The performance you&apos;re looking for doesn&apos;t exist or may have been removed.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: 'rgba(0,0,0,0.85)',
            color: '#fff',
            fontSize: '1rem',
          }}
        >
          Browse All Performances
        </Link>
      </div>
    </main>
  );
}
