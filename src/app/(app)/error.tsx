'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log para poder rastrear el error en producción (Vercel logs).
    console.error('[app-error]', error);
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: 24,
        color: 'var(--text-2)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 56,
          height: 56,
          borderRadius: 16,
          background: 'var(--red-dim)',
          color: 'var(--red)',
          marginBottom: 20,
        }}
      >
        <AlertTriangle size={28} />
      </div>
      <h2 style={{ color: 'var(--text)', fontSize: 20, fontWeight: 700, margin: 0 }}>
        Algo salió mal
      </h2>
      <p style={{ maxWidth: 380, margin: '10px 0 24px', color: 'var(--text-3)' }}>
        No pudimos cargar esta sección. Tus datos están a salvo. Probá de nuevo;
        si el problema sigue, recargá la página.
      </p>
      <button
        onClick={reset}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          borderRadius: 12,
          border: '1px solid var(--border-md)',
          background: 'var(--surface-2)',
          color: 'var(--text)',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <RotateCw size={16} />
        Reintentar
      </button>
      {error?.digest && (
        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-dim)' }}>
          Código de error: {error.digest}
        </div>
      )}
    </div>
  );
}
