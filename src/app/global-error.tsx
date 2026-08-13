'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global-error]', error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f3',
          color: '#111111',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          textAlign: 'center',
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Algo salió mal</h1>
        <p style={{ maxWidth: 380, color: '#666666', margin: '12px 0 24px' }}>
          Ocurrió un error inesperado. Tus datos están a salvo. Probá recargar la
          aplicación.
        </p>
        <button
          onClick={reset}
          style={{
            padding: '10px 22px',
            borderRadius: 12,
            border: '1px solid rgba(0,0,0,0.12)',
            background: '#111111',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
        {error?.digest && (
          <div style={{ marginTop: 16, fontSize: 12, color: '#999999' }}>
            Código de error: {error.digest}
          </div>
        )}
      </body>
    </html>
  );
}
