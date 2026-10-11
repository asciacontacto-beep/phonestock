"use client"
import { useState } from 'react';
import { X, ChevronDown, ChevronRight, Plus, Wallet } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { saldoConProveedor, pendienteDelPedido, type Pedido, type PagoProveedor } from '@/utils/proveedores';

const plata = (moneda: string, n: number) => `${moneda === 'USD' ? 'U$' : '$'}${n.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
const dia = (f: string) => new Date(f.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-AR');

/** La cuenta corriente con un proveedor: pedidos, pagos y lo que se debe. */
export function CuentaModal({ proveedor, pedidos, pagos, onClose, onNuevoPedido, onPagar }: {
  proveedor: { id: string | number; name: string };
  pedidos: Pedido[];
  pagos: PagoProveedor[];
  onClose: () => void;
  onNuevoPedido: () => void;
  onPagar: (pedido?: Pedido) => void;
}) {
  const supabase = createClient();
  const [abierto, setAbierto] = useState<string | null>(null);
  const [equipos, setEquipos] = useState<Record<string, any[]>>({});
  const saldo = saldoConProveedor(pedidos, pagos);

  async function verEquipos(id: string) {
    setAbierto(a => a === id ? null : id);
    if (equipos[id]) return;
    const { data } = await supabase.from('stock')
      .select('id,brand,model,storage,color,imei,cost_price,currency,status')
      .eq('supplier_order_id', id).order('model');
    setEquipos(e => ({ ...e, [id]: data || [] }));
  }

  return (
    <div className="mo" style={{ zIndex: 1000 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mb" style={{ maxWidth: 640, width: '95vw' }} onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div className="mh-title">Cuenta corriente · {proveedor.name}</div>
          <button className="btn-icon" aria-label="Cerrar" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="mbd" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(['USD', 'ARS'] as const).map(m => (
              <div key={m} className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Le debés en {m}</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: saldo[m] > 0 ? 'var(--red)' : 'var(--text)' }}>
                  {plata(m, Math.max(0, saldo[m]))}
                </div>
                {saldo[m] < 0 && <div style={{ fontSize: 11, color: 'var(--green)' }}>A favor tuyo: {plata(m, -saldo[m])}</div>}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-dark" style={{ flex: 1 }} onClick={onNuevoPedido}><Plus size={15} /> Nuevo pedido</button>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => onPagar()}><Wallet size={15} /> Registrar pago</button>
          </div>

          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Pedidos</div>
            {pedidos.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Todavía no hay pedidos.</div>}
            {pedidos.map(p => {
              const falta = pendienteDelPedido(p, pagos);
              const lista = equipos[p.id];
              return (
                <div key={p.id} style={{ borderBottom: '1px solid var(--border)', padding: '8px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="btn-icon" onClick={() => verEquipos(p.id)}>
                      {abierto === p.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>
                    <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => verEquipos(p.id)}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{dia(p.fecha)} · {plata(p.moneda, Number(p.total))}</div>
                      {p.notas && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.notas}</div>}
                    </div>
                    {falta > 0
                      ? <button className="btn btn-sm btn-outline" onClick={() => onPagar(p)}>Falta {plata(p.moneda, falta)}</button>
                      : <span className="badge" style={{ background: 'var(--green)', color: '#fff', fontSize: 11 }}>Pagado</span>}
                  </div>
                  {abierto === p.id && (
                    <div style={{ padding: '6px 0 4px 36px', fontSize: 12 }}>
                      {!lista && <div style={{ color: 'var(--text-3)' }}>Cargando…</div>}
                      {lista?.length === 0 && <div style={{ color: 'var(--text-3)' }}>Sin equipos vinculados.</div>}
                      {lista?.map(e => (
                        <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '2px 0' }}>
                          <span>
                            {e.brand} {e.model} {e.storage} {e.color}
                            {e.imei && <span style={{ color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginLeft: 6 }}>{e.imei}</span>}
                            {e.status === 'sold' && <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>· vendido</span>}
                          </span>
                          <span style={{ fontFamily: 'JetBrains Mono' }}>{plata(e.currency, Number(e.cost_price) || 0)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {pagos.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Pagos</div>
              {pagos.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>{dia(p.fecha)}{p.notas ? ` · ${p.notas}` : ''}</span>
                  <span style={{ fontWeight: 600, color: 'var(--green)' }}>− {plata(p.moneda, Number(p.monto))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
