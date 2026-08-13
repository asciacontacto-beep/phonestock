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
          background: '#0a0a0a',
          color: '#ededed',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Algo salió mal</h1>
        <p style={{ maxWidth: 380, color: '#a1a1a1', margin: '12px 0 24px' }}>
          Ocurrió un error inesperado. Tus datos están a salvo. Probá recargar la
          aplicación.
        </p>
        <button
          onClick={reset}
          style={{
            padding: '10px 22px',
            borderRadius: 12,
            border: '1px solid #2a2a2a',
            background: '#1a1a1a',
            color: '#ededed',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
        {error?.digest && (
          <div style={{ marginTop: 16, fontSize: 12, color: '#6b6b6b' }}>
            Código de error: {error.digest}
          </div>
        )}
      </body>
    </html>
  );
}
