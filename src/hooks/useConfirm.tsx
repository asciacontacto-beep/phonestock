"use client"
import { useState } from 'react';

export function useConfirm() {
  const [state, setState] = useState<{
    message: string;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirm = (message: string): Promise<boolean> =>
    new Promise(resolve => setState({ message, resolve }));

  const handleOk = () => { state?.resolve(true); setState(null); }
  const handleCancel = () => { state?.resolve(false); setState(null); }

  const ConfirmDialog = state ? (
    <div className="mo" style={{ zIndex: 1001 }}>
      <div className="mb" style={{ maxWidth: 380 }}>
        <div className="mbd" style={{ padding: '24px 24px 16px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Confirmar</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{state.message}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '0 20px 20px', justifyContent: 'flex-end' }}>
          <button className="btn-outline" onClick={handleCancel}>Cancelar</button>
          <button
            onClick={handleOk}
            style={{
              padding: '8px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13,
              background: 'var(--red)', color: '#fff', cursor: 'pointer',
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, ConfirmDialog };
}
