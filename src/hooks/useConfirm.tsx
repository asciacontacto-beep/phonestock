"use client"
import { useEffect, useRef, useState } from 'react';

type Opciones = {
  /** Rojo y "destructivo". Sin indicarlo, se deduce del texto (eliminar, borrar, anular…). */
  peligro?: boolean;
  /** Texto del botón de confirmar. */
  ok?: string;
  titulo?: string;
};

/** Palabras que indican una acción que no se puede deshacer. */
const DESTRUCTIVO = /\b(elimin|borr|anul|quit|descart|irreversible|todos sus datos)/i;

export function useConfirm() {
  const [state, setState] = useState<{
    message: string;
    resolve: (v: boolean) => void;
    opciones: Opciones;
  } | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  const confirm = (message: string, opciones: Opciones = {}): Promise<boolean> =>
    new Promise(resolve => setState({ message, resolve, opciones }));

  const handleOk = () => { state?.resolve(true); setState(null); };
  const handleCancel = () => { state?.resolve(false); setState(null); };

  // Esc cancela, Enter confirma, y el foco arranca en Confirmar.
  useEffect(() => {
    if (!state) return;
    okRef.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); handleCancel(); }
      if (e.key === 'Enter') { e.preventDefault(); handleOk(); }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  });

  const peligro = state ? (state.opciones.peligro ?? DESTRUCTIVO.test(state.message)) : false;

  const ConfirmDialog = state ? (
    <div className="mo" style={{ zIndex: 1500 }} onClick={e => { if (e.target === e.currentTarget) handleCancel(); }}>
      <div className="mb" style={{ maxWidth: 400 }} role="alertdialog" aria-modal="true" aria-labelledby="confirm-titulo">
        <div className="mbd" style={{ padding: '24px 24px 16px' }}>
          <div id="confirm-titulo" style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>
            {state.opciones.titulo || (peligro ? '¿Seguro?' : 'Confirmar')}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.55 }}>{state.message}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '0 20px 20px', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={handleCancel}>Cancelar</button>
          <button ref={okRef} className={`btn ${peligro ? 'btn-danger' : 'btn-dark'}`} onClick={handleOk}>
            {state.opciones.ok || (peligro ? 'Sí, confirmar' : 'Confirmar')}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, ConfirmDialog };
}
