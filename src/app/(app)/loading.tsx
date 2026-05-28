import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-3)' }}>
      <Loader2 size={32} className="spin" style={{ marginBottom: 16 }} />
      <div style={{ fontWeight: 500 }}>Cargando...</div>
    </div>
  );
}
