import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        color: 'var(--text)',
        textAlign: 'center',
        padding: 24,
      }}
    >
      <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1, color: 'var(--border-lg)', letterSpacing: '-0.03em' }}>
        404
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: '12px 0 8px', letterSpacing: '-0.02em' }}>
        Página no encontrada
      </h1>
      <p style={{ maxWidth: 360, color: 'var(--text-2)', margin: '0 0 24px' }}>
        La página que buscás no existe o fue movida.
      </p>
      <Link
        href="/dashboard"
        style={{
          padding: '10px 22px',
          borderRadius: 12,
          border: '1px solid var(--border-md)',
          background: 'var(--accent)',
          color: '#ffffff',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Volver al inicio
      </Link>
    </div>
  );
}
