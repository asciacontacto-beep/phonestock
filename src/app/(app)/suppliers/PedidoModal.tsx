"use client"
import { useEffect, useState } from 'react';
import { Plus, Trash2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { BRANDS, MODELS, COLORS, almacenamientosDe, opcionesDeAlmacenamiento, nombreAlmacenamiento } from '@/constants/data';
import { ModelPicker } from '@/components/ModelPicker';
import { repetidosEnLote, buscarImeisEnStock, avisoDuplicado } from '@/utils/imei';
import { imeiDeUnidad, imeisDeLaCarga } from '@/utils/cargaEquipos';
import { crearPedidoConEquipos, registrarPagoProveedor, type Moneda } from '@/utils/proveedores';
import { aceptaCuenta, cuentasDelMetodo, type Cuenta } from '@/utils/cuentas';
import { cargarCuentas } from '@/utils/cuentasDb';

/**
 * Un pedido al proveedor, cargado como bulto: todos los equipos que llegaron
 * juntos, cada uno con su costo. El total del pedido es la suma de los
 * costos y queda como deuda con el proveedor. Los equipos entran al stock
 * como en una carga normal.
 */

type Linea = {
  brand: string; model: string; storage: string; color: string;
  condition: 'new' | 'used'; battery: string;
  qty: string; costo: string; precio: string; imeis: string[];
};

function lineaNueva(brand = 'Apple'): Linea {
  const model = MODELS[brand]?.find(m => m.startsWith('iPhone')) || MODELS[brand]?.[0] || '';
  return {
    brand, model,
    storage: almacenamientosDe(model)[0] || '',
    color: (COLORS[model] || COLORS[brand] || ['Negro'])[0],
    condition: 'new', battery: '100%',
    qty: '1', costo: '', precio: '', imeis: [],
  };
}

const METODOS: Record<Moneda, [string, string][]> = {
  USD: [['usd_cash', 'Efectivo USD'], ['usd_transf', 'Transferencia USD'], ['usdt', 'USDT']],
  ARS: [['ars_cash', 'Efectivo ARS'], ['ars_transf', 'Transferencia ARS']],
};

const num = (v: string) => parseFloat(v.replace(',', '.')) || 0;
const solo = (v: string) => v.replace(/[^0-9.,]/g, '');

export function PedidoModal({ proveedor, deposits, onClose, onSaved }: {
  proveedor: { id: string | number; name: string };
  deposits: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [fecha, setFecha] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [moneda, setMoneda] = useState<Moneda>('USD');
  const [dep, setDep] = useState<string>(deposits[0] ? String(deposits[0].id) : '');
  const [notas, setNotas] = useState('');
  const [lineas, setLineas] = useState<Linea[]>([lineaNueva()]);
  const [pagoAhora, setPagoAhora] = useState(false);
  const [montoPago, setMontoPago] = useState('');
  const [metodo, setMetodo] = useState('usd_cash');
  const [caja, setCaja] = useState('');
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cuenta, setCuenta] = useState('');
  const [guardando, setGuardando] = useState(false);
  useEffect(() => { cargarCuentas(supabase, { soloActivas: true }).then(r => setCuentas(r.cuentas)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  /* Una transferencia no sale del cajón: sale de una cuenta. */
  const esTransferencia = aceptaCuenta(metodo);
  const cuentasPosibles = esTransferencia ? cuentasDelMetodo(cuentas, metodo) : [];

  const upd = (i: number, cambios: Partial<Linea>) =>
    setLineas(ls => ls.map((l, idx) => idx === i ? { ...l, ...cambios } : l));

  const cambiarMarca = (i: number, brand: string) => {
    const base = lineaNueva(brand);
    upd(i, { brand, model: base.model, storage: base.storage, color: base.color });
  };
  const cambiarModelo = (i: number, model: string) => {
    const l = lineas[i];
    upd(i, { model, storage: almacenamientosDe(model)[0] || '', color: (COLORS[model] || COLORS[l.brand] || ['Negro'])[0] });
  };
  const cambiarMoneda = (m: Moneda) => { setMoneda(m); setMetodo(METODOS[m][0][0]); };

  const unidades = lineas.reduce((a, l) => a + (parseInt(l.qty, 10) || 0), 0);
  const total = Math.round(lineas.reduce((a, l) => a + (parseInt(l.qty, 10) || 0) * num(l.costo), 0) * 100) / 100;
  const simbolo = moneda === 'USD' ? 'U$' : '$';

  async function guardar() {
    if (!dep) { toast.error('Elegí a qué depósito entran los equipos'); return; }
    if (unidades === 0) { toast.error('El pedido no tiene equipos'); return; }
    const sinCosto = lineas.find(l => (parseInt(l.qty, 10) || 0) > 0 && !(num(l.costo) > 0));
    if (sinCosto) { toast.error(`Falta el costo del ${sinCosto.model}`); return; }
    const sinPrecio = lineas.find(l => (parseInt(l.qty, 10) || 0) > 0 && !(num(l.precio) > 0));
    if (sinPrecio) { toast.error(`Falta el precio de venta del ${sinPrecio.model}`); return; }
    const pago = pagoAhora ? num(montoPago) : 0;
    if (pagoAhora && !(pago > 0)) { toast.error('Poné cuánto pagaste, o destildá el pago'); return; }
    if (pago > total) { toast.error('El pago es mayor que el pedido'); return; }

    setGuardando(true);
    try {
      const imeis = imeisDeLaCarga(lineas);
      const repes = repetidosEnLote(imeis);
      if (repes.length > 0) { toast.error(`Repetiste el IMEI ${repes.join(', ')} en este pedido.`); return; }
      const yaEstan = await buscarImeisEnStock(supabase, imeis);
      if (yaEstan.length > 0) { toast.error(avisoDuplicado(yaEstan)); return; }

      const equipos: Record<string, unknown>[] = [];
      for (const l of lineas) {
        const qty = parseInt(l.qty, 10) || 0;
        for (let k = 0; k < qty; k++) {
          equipos.push({
            brand: l.brand, model: l.model, storage: l.storage, color: l.color,
            condition: l.condition,
            battery: l.condition === 'used' ? l.battery : null,
            // Cada unidad con su IMEI (antes sólo con cantidad 1).
            imei: imeiDeUnidad(l, k),
            price: num(l.precio), cost_price: num(l.costo), currency: moneda,
            deposit: dep, status: 'available',
          });
        }
      }

      const r = await crearPedidoConEquipos(supabase, {
        supplierId: proveedor.id, moneda, total, fecha, notas, equipos,
      });
      if (!r.ok) { toast.error(`No se pudo guardar el pedido: ${r.error}`); return; }
      toast.success(`Pedido guardado: ${unidades} equipo${unidades !== 1 ? 's' : ''}, ${simbolo}${total.toLocaleString('es-AR')}`);

      if (pago > 0) {
        const p = await registrarPagoProveedor(supabase, {
          supplierId: proveedor.id, proveedorNombre: proveedor.name, orderId: r.pedido.id,
          moneda, monto: pago, fecha, metodo,
          depositId: esTransferencia ? null : (caja || null),
          accountId: esTransferencia ? (cuenta || null) : null,
          accountName: esTransferencia ? (cuentasPosibles.find(c => c.id === cuenta)?.name || null) : null,
        });
        if (!p.ok) toast.warning(`El pedido se guardó, pero el pago no: ${p.error}`, { duration: 9000 });
      }
      onSaved();
      onClose();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mo" style={{ zIndex: 1000 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mb" style={{ maxWidth: 720, width: '95vw' }} onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div>
            <div className="mh-title">Nuevo pedido · {proveedor.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              Cargá los equipos que llegaron juntos. El total queda como deuda con el proveedor.
            </div>
          </div>
          <button className="btn-icon" aria-label="Cerrar" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="mbd" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 110px 1fr', gap: 10 }}>
            <div><label className="lbl">Fecha</label><input className="inp" type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></div>
            <div>
              <label className="lbl">Moneda</label>
              <select className="inp" value={moneda} onChange={e => cambiarMoneda(e.target.value as Moneda)}>
                <option value="USD">USD</option><option value="ARS">ARS</option>
              </select>
            </div>
            <div>
              <label className="lbl">Entran al depósito</label>
              <select className="inp" value={dep} onChange={e => setDep(e.target.value)}>
                {deposits.length === 0 && <option value="">Sin depósitos — creá uno primero</option>}
                {deposits.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
              </select>
            </div>
          </div>

          {lineas.map((l, i) => {
            const qty = parseInt(l.qty, 10) || 0;
            const colores = COLORS[l.model] || COLORS[l.brand] || ['Negro'];
            return (
              <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Línea {i + 1}{qty > 0 && num(l.costo) > 0 ? ` · ${simbolo}${(qty * num(l.costo)).toLocaleString('es-AR')}` : ''}
                  </span>
                  {lineas.length > 1 && (
                    <button aria-label="Eliminar" className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => setLineas(ls => ls.filter((_, idx) => idx !== i))}><Trash2 size={14} /></button>
                  )}
                </div>
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, marginBottom: 10 }}>
                  <div><label className="lbl">Marca</label>
                    <select className="inp" value={l.brand} onChange={e => cambiarMarca(i, e.target.value)}>{BRANDS.map(b => <option key={b} value={b}>{b}</option>)}</select>
                  </div>
                  <div><label className="lbl">Modelo</label>
                    <ModelPicker value={l.model} onChange={m => cambiarModelo(i, m)} options={MODELS[l.brand] || []} />
                  </div>
                </div>
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div><label className="lbl">Almacenamiento</label>
                    <select className="inp" value={l.storage} onChange={e => upd(i, { storage: e.target.value })}>{opcionesDeAlmacenamiento(l.model, l.storage).map(s => <option key={s} value={s}>{nombreAlmacenamiento(s)}</option>)}</select>
                  </div>
                  <div><label className="lbl">Color</label>
                    <input className="inp" list={`ped-colores-${i}`} value={l.color} onChange={e => upd(i, { color: e.target.value })} />
                    <datalist id={`ped-colores-${i}`}>{colores.map(c => <option key={c} value={c} />)}</datalist>
                  </div>
                  <div><label className="lbl">Condición</label>
                    <select className="inp" value={l.condition} onChange={e => upd(i, { condition: e.target.value as Linea['condition'] })}>
                      <option value="new">Sellado</option><option value="used">Usado</option>
                    </select>
                  </div>
                </div>
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 10 }}>
                  <div><label className="lbl">Cantidad</label>
                    <input className="inp" inputMode="numeric" value={l.qty} onChange={e => upd(i, { qty: e.target.value.replace(/\D/g, '') })} />
                  </div>
                  <div><label className="lbl">Costo c/u ({moneda})</label>
                    <input className="inp" inputMode="decimal" placeholder="0" value={l.costo} onChange={e => upd(i, { costo: solo(e.target.value) })} />
                  </div>
                  <div><label className="lbl">Precio de venta c/u</label>
                    <input className="inp" inputMode="decimal" placeholder="0" value={l.precio} onChange={e => upd(i, { precio: solo(e.target.value) })} />
                  </div>
                </div>
                {l.condition === 'used' && (
                  <div style={{ marginTop: 10, maxWidth: 140 }}>
                    <label className="lbl">Batería</label>
                    <input className="inp" value={l.battery} onChange={e => upd(i, { battery: e.target.value })} />
                  </div>
                )}
                {/* Un IMEI por unidad. Con la pistola: escaneás, Enter, y pasa al siguiente. */}
                {qty > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <label className="lbl">{qty === 1 ? 'IMEI (opcional)' : `IMEI de cada unidad (opcional · ${imeisDeLaCarga([l]).length} de ${qty})`}</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 180px), 1fr))', gap: 8 }}>
                      {Array.from({ length: Math.min(qty, 200) }, (_, k) => (
                        <input key={k} className="inp" inputMode="numeric" autoComplete="off" data-imei-ped={`${i}-${k}`}
                          placeholder={qty === 1 ? '15 dígitos' : `Unidad ${k + 1}`}
                          value={l.imeis[k] || ''}
                          onChange={e => { const imeis = [...l.imeis]; imeis[k] = e.target.value; upd(i, { imeis }); }}
                          onKeyDown={e => {
                            if (e.key !== 'Enter') return;
                            e.preventDefault();
                            document.querySelector<HTMLInputElement>(`[data-imei-ped="${i}-${k + 1}"]`)?.focus();
                          }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <button className="btn btn-outline" onClick={() => setLineas(ls => [...ls, lineaNueva(ls[ls.length - 1]?.brand)])}>
            <Plus size={15} /> Agregar otro modelo
          </button>

          <div><label className="lbl">Notas (opcional)</label>
            <input className="inp" placeholder="Ej: factura 0001-2345, llegó por Andreani" value={notas} onChange={e => setNotas(e.target.value)} />
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={pagoAhora} onChange={e => setPagoAhora(e.target.checked)} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Ya le pagué una parte</span>
            </label>
            {pagoAhora && (
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 12 }}>
                <div><label className="lbl">Monto ({moneda})</label>
                  <input className="inp" inputMode="decimal" placeholder={String(total || 0)} value={montoPago} onChange={e => setMontoPago(solo(e.target.value))} />
                </div>
                <div><label className="lbl">Medio</label>
                  <select className="inp" value={metodo} onChange={e => setMetodo(e.target.value)}>
                    {METODOS[moneda].map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                  </select>
                </div>
                {esTransferencia ? (
                  <div><label className="lbl">Sale de la cuenta</label>
                    <select className="inp" value={cuenta} onChange={e => setCuenta(e.target.value)} disabled={cuentasPosibles.length === 0}>
                      <option value="">{cuentasPosibles.length === 0 ? 'Sin cuentas cargadas' : 'No indicar'}</option>
                      {cuentasPosibles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div><label className="lbl">Sale de la caja</label>
                    <select className="inp" value={caja} onChange={e => setCaja(e.target.value)}>
                      <option value="">No sale de una caja</option>
                      {deposits.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
              {unidades} equipo{unidades !== 1 ? 's' : ''} · Total <strong style={{ color: 'var(--text)', fontSize: 16 }}>{simbolo}{total.toLocaleString('es-AR')}</strong>
              {pagoAhora && num(montoPago) > 0 && (
                <> · Queda debiendo <strong style={{ color: 'var(--red)' }}>{simbolo}{Math.max(0, total - num(montoPago)).toLocaleString('es-AR')}</strong></>
              )}
            </div>
            <button className="btn btn-dark btn-lg" onClick={guardar} disabled={guardando || unidades === 0}>
              {guardando ? <Loader2 size={18} className="spin" /> : 'Guardar pedido'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
