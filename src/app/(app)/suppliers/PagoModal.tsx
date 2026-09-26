"use client"
import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { registrarPagoProveedor, pendienteDelPedido, type Moneda, type Pedido, type PagoProveedor } from '@/utils/proveedores';

const METODOS: Record<Moneda, [string, string][]> = {
  USD: [['usd_cash', 'Efectivo USD'], ['usd_transf', 'Transferencia USD'], ['usdt', 'USDT']],
  ARS: [['ars_cash', 'Efectivo ARS'], ['ars_transf', 'Transferencia ARS']],
};

/** Pago al proveedor: baja la deuda y, si se elige una caja, sale de ella. */
export function PagoModal({ proveedor, pedidos, pagos, deposits, deuda, pedidoInicial, onClose, onSaved }: {
  proveedor: { id: string | number; name: string };
  pedidos: Pedido[];
  pagos: PagoProveedor[];
  deposits: any[];
  deuda: { USD: number; ARS: number };
  pedidoInicial?: Pedido | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const monedaInicial: Moneda = pedidoInicial?.moneda || (deuda.USD <= 0 && deuda.ARS > 0 ? 'ARS' : 'USD');
  const [moneda, setMoneda] = useState<Moneda>(monedaInicial);
  const [pedidoId, setPedidoId] = useState<string>(pedidoInicial?.id || '');
  const [monto, setMonto] = useState(() => {
    const p = pedidoInicial ? pendienteDelPedido(pedidoInicial, pagos) : 0;
    return p > 0 ? String(p) : '';
  });
  const [fecha, setFecha] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [metodo, setMetodo] = useState(METODOS[monedaInicial][0][0]);
  const [caja, setCaja] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  const abiertos = pedidos.filter(p => p.moneda === moneda && pendienteDelPedido(p, pagos) > 0);
  const simbolo = moneda === 'USD' ? 'U$' : '$';

  const cambiarMoneda = (m: Moneda) => { setMoneda(m); setMetodo(METODOS[m][0][0]); setPedidoId(''); };

  async function guardar() {
    const valor = parseFloat(monto.replace(',', '.')) || 0;
    if (!(valor > 0)) { toast.error('Poné el monto del pago'); return; }
    setGuardando(true);
    const r = await registrarPagoProveedor(supabase, {
      supplierId: proveedor.id, proveedorNombre: proveedor.name, orderId: pedidoId || null,
      moneda, monto: valor, fecha, metodo, depositId: caja || null, notas,
    });
    setGuardando(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(`Pago de ${simbolo}${valor.toLocaleString('es-AR')} a ${proveedor.name} registrado`);
    onSaved();
    onClose();
  }

  return (
    <div className="mo" style={{ zIndex: 1100 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mb" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div className="mt">Pago a {proveedor.name}</div>
          <button className="btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="mbd" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
            Le debés {deuda.USD > 0 && <strong>U${deuda.USD.toLocaleString('es-AR')}</strong>}
            {deuda.USD > 0 && deuda.ARS > 0 && ' y '}
            {deuda.ARS > 0 && <strong>${deuda.ARS.toLocaleString('es-AR')}</strong>}
            {deuda.USD <= 0 && deuda.ARS <= 0 && <strong>nada</strong>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10 }}>
            <div><label className="lbl">Moneda</label>
              <select className="inp" value={moneda} onChange={e => cambiarMoneda(e.target.value as Moneda)}>
                <option value="USD">USD</option><option value="ARS">ARS</option>
              </select>
            </div>
            <div><label className="lbl">Monto</label>
              <input className="inp" inputMode="decimal" autoFocus value={monto} onChange={e => setMonto(e.target.value.replace(/[^0-9.,]/g, ''))} />
            </div>
          </div>
          <div><label className="lbl">¿De qué pedido? (opcional)</label>
            <select className="inp" value={pedidoId} onChange={e => {
              setPedidoId(e.target.value);
              const p = pedidos.find(x => x.id === e.target.value);
              if (p) setMonto(String(pendienteDelPedido(p, pagos)));
            }}>
              <option value="">A cuenta, sin pedido puntual</option>
              {abiertos.map(p => (
                <option key={p.id} value={p.id}>
                  {new Date(p.fecha + 'T12:00:00').toLocaleDateString('es-AR')} · falta {simbolo}{pendienteDelPedido(p, pagos).toLocaleString('es-AR')}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="lbl">Medio</label>
              <select className="inp" value={metodo} onChange={e => setMetodo(e.target.value)}>
                {METODOS[moneda].map(([k, n]) => <option key={k} value={k}>{n}</option>)}
              </select>
            </div>
            <div><label className="lbl">Fecha</label>
              <input className="inp" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
          </div>
          <div><label className="lbl">Sale de la caja</label>
            <select className="inp" value={caja} onChange={e => setCaja(e.target.value)}>
              <option value="">No sale de una caja</option>
              {deposits.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
            </select>
          </div>
          <div><label className="lbl">Notas (opcional)</label>
            <input className="inp" value={notas} onChange={e => setNotas(e.target.value)} />
          </div>
          <button className="btn btn-dark btn-lg" onClick={guardar} disabled={guardando}>
            {guardando ? <Loader2 size={18} className="spin" /> : 'Registrar pago'}
          </button>
        </div>
      </div>
    </div>
  );
}
