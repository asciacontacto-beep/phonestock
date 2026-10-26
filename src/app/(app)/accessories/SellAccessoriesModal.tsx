"use client";
/**
 * Vender accesorios desde la pantalla Accesorios: buscar, tocar para sumar,
 * ajustar cantidades y cobrar. Pensado para el mostrador: lo que se busca
 * arriba, lo que se lleva y el total abajo, siempre a la vista.
 *
 * La venta se guarda igual que la de Vender: una fila "ACCESORIOS" en pesos
 * y el detalle con cada accesorio en SU moneda (como lo leen los reportes y
 * como la base le completa el costo). Antes los de dólares se guardaban
 * pasados a pesos pero con el costo en dólares: la ganancia salía inflada.
 */
import { nombreAccesorio, monedaAccesorio, enPesos } from '@/utils/accesoriosVenta';
import { CLIENTE_ANONIMO } from '@/utils/customers';
import { useMemo, useState } from 'react';
import { Minus, Plus, Search, ShoppingBag, Trash2, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

const PAGOS = [
  { id: 'ars_cash', label: '$ Efectivo', cur: 'ARS' },
  { id: 'ars_transf', label: 'Transf. ARS', cur: 'ARS' },
  { id: 'usd_cash', label: 'U$ Billete', cur: 'USD' },
  { id: 'usd_transf', label: 'Transf. USD', cur: 'USD' },
];

type Accesorio = { id: string; category?: string | null; compatible_model?: string | null; color?: string | null; stock: number; sale_price?: number | null; cost_price?: number | null; currency?: string | null };

const pesos = (n: number) => `$ ${Math.round(n).toLocaleString('es-AR')}`;
const precioDe = (a: Accesorio) => `${monedaAccesorio(a.currency) === 'USD' ? 'U$' : '$'} ${(Number(a.sale_price) || 0).toLocaleString('es-AR')}`;

export function SellAccessoriesModal({ accessories, cotizacion = 0, vendedor, onClose, onSold }: {
  accessories: Accesorio[];
  /** La cotización del local (Ajustes), para los accesorios en dólares. */
  cotizacion?: number;
  vendedor?: { id?: string; name?: string | null; full_name?: string | null; email?: string | null };
  onClose: () => void;
  onSold: (updates: { id: string; newStock: number }[]) => void;
}) {
  const supabase = createClient();
  const [carrito, setCarrito] = useState<Record<string, number>>({});
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [cliente, setCliente] = useState('');
  const [pago, setPago] = useState('ars_cash');
  const [rate, setRate] = useState(cotizacion > 0 ? String(cotizacion) : '');
  const [loading, setLoading] = useState(false);

  const disponibles = useMemo(() => accessories.filter(a => a.stock > 0), [accessories]);
  const categorias = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const a of disponibles) { const c = (a.category || 'Otro').trim(); cuenta.set(c, (cuenta.get(c) || 0) + 1); }
    return [...cuenta].sort((x, y) => y[1] - x[1]);
  }, [disponibles]);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return disponibles.filter(a =>
      (categoria === 'todas' || (a.category || 'Otro').trim() === categoria) &&
      (!t || nombreAccesorio(a).toLowerCase().includes(t)));
  }, [disponibles, q, categoria]);

  const enCarrito = disponibles.filter(a => carrito[a.id]);
  const unidades = enCarrito.reduce((s, a) => s + carrito[a.id], 0);
  const hayDolares = enCarrito.some(a => monedaAccesorio(a.currency) === 'USD');
  const cot = parseFloat(rate) || 0;
  const faltaCotizacion = hayDolares && !(cot > 0);
  const total = enCarrito.reduce((s, a) => s + enPesos((Number(a.sale_price) || 0) * carrito[a.id], a.currency, cot), 0);
  const pagosPosibles = hayDolares ? PAGOS : PAGOS.filter(p => p.cur === 'ARS');

  const cambiar = (a: Accesorio, delta: number) => setCarrito(c => {
    const n = (c[a.id] || 0) + delta;
    if (n > a.stock) { toast.error(`De ${nombreAccesorio(a)} hay ${a.stock}.`); return c; }
    const nuevo = { ...c };
    if (n <= 0) delete nuevo[a.id]; else nuevo[a.id] = n;
    return nuevo;
  });
  const quitar = (id: string) => setCarrito(c => { const n = { ...c }; delete n[id]; return n; });

  const confirmar = async () => {
    if (enCarrito.length === 0) { toast.error('Agregá al menos un accesorio'); return; }
    if (faltaCotizacion) { toast.error('Poné la cotización del dólar para cobrar los accesorios en dólares'); return; }
    setLoading(true);
    try {
      const metodo = PAGOS.find(p => p.id === pago) || PAGOS[0];
      const costos = enCarrito.map(a => a.cost_price ? enPesos(Number(a.cost_price) * carrito[a.id], a.currency, cot) : null);
      const costo = costos.some(c => c === null) ? null : costos.reduce((s: number, c) => s + (c || 0), 0);
      const { error: sErr } = await supabase.from('sales').insert([{
        seller_id: vendedor?.id || null,
        seller_name: vendedor?.full_name || vendedor?.name || vendedor?.email || '',
        brand: 'ACCESORIOS',
        model: enCarrito.map(a => `${carrito[a.id]}x ${nombreAccesorio(a)}`).join(' · ').slice(0, 120),
        storage: '-', color: '-',
        imei: `ACC-${Date.now()}`,
        cost_price: costo,
        price: total,
        currency: 'ARS',
        payments: [{
          id: metodo.id, label: metodo.label, amount: total, currency: metodo.cur,
          original_amount: metodo.cur === 'USD' ? total / cot : total,
          ...(metodo.cur === 'USD' ? { exchange_rate: cot } : {}),
          ...(cot > 0 ? { sale_rate: cot } : {}),
        }],
        customer: { name: cliente.trim() || CLIENTE_ANONIMO },
        accessories: enCarrito.map(a => ({
          id: a.id, name: nombreAccesorio(a), qty: carrito[a.id],
          price: Number(a.sale_price) || 0, cost_price: a.cost_price ?? null,
          currency: monedaAccesorio(a.currency), is_gift: false,
        })),
      }]);
      if (sErr) throw sErr;

      const updates: { id: string; newStock: number }[] = [];
      const sinDescontar: string[] = [];
      for (const a of enCarrito) {
        const { data: ok, error: rErr } = await supabase.rpc('decrement_accessory_stock', { acc_id: a.id, qty: carrito[a.id] });
        if (rErr) throw rErr;
        if (ok === false) sinDescontar.push(nombreAccesorio(a));
        updates.push({ id: a.id, newStock: a.stock - carrito[a.id] });
      }
      toast.success(`Venta registrada · ${pesos(total)}`);
      if (sinDescontar.length > 0) toast.warning(`No se pudo descontar el stock de: ${sinDescontar.join(', ')}. Revisalo en la lista.`, { duration: 10000 });
      onSold(updates);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al procesar la venta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mo" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mb sav" style={{ maxWidth: 600 }}>
        <div className="mh">
          <div>
            <div className="mh-title">Vender accesorios</div>
            <div className="sav-sub">{unidades > 0 ? `${unidades} ${unidades === 1 ? 'unidad' : 'unidades'} · ${pesos(total)}` : 'Tocá un accesorio para sumarlo'}</div>
          </div>
          <button className="btn-icon" aria-label="Cerrar" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="mbd sav-cuerpo">
          <div className="m-buscar sav-buscar">
            <Search size={18} />
            <input autoFocus type="search" inputMode="search" placeholder="Buscar funda, vidrio, cargador, modelo…" value={q}
              onChange={e => setQ(e.target.value)} aria-label="Buscar accesorio" />
            {q && <button className="m-buscar-btn" onClick={() => setQ('')} aria-label="Borrar búsqueda"><X size={16} /></button>}
          </div>

          {categorias.length > 1 && (
            <div className="m-chips sav-chips" role="tablist" aria-label="Tipo">
              <button role="tab" aria-selected={categoria === 'todas'} className={`m-chip ${categoria === 'todas' ? 'on' : ''}`} onClick={() => setCategoria('todas')}>Todos <em>{disponibles.length}</em></button>
              {categorias.map(([c, n]) => (
                <button key={c} role="tab" aria-selected={categoria === c} className={`m-chip ${categoria === c ? 'on' : ''}`} onClick={() => setCategoria(c)}>{c} <em>{n}</em></button>
              ))}
            </div>
          )}

          <div className="m-list sav-lista">
            {disponibles.length === 0 ? (
              <div className="sav-vacio"><ShoppingBag size={22} /><strong>No hay accesorios con stock</strong>Cargalos desde “Nuevo accesorio”.</div>
            ) : visibles.length === 0 ? (
              <div className="sav-vacio"><Search size={22} /><strong>Nada coincide</strong>Probá con otra palabra o sacá el filtro.</div>
            ) : visibles.map(a => {
              const n = carrito[a.id] || 0;
              return (
                <div key={a.id} className={`m-row sav-fila ${n ? 'on' : ''}`}>
                  <button className="sav-tocar" onClick={() => cambiar(a, 1)} aria-label={`Sumar ${nombreAccesorio(a)}`}>
                    <div className="m-row-main">
                      <div className="m-row-t">{[a.category, a.compatible_model].filter(Boolean).join(' ')}</div>
                      <div className="m-row-s">{[a.color, `quedan ${a.stock - n}`].filter(Boolean).join(' · ')}</div>
                    </div>
                    <span className="m-row-num">{precioDe(a)}</span>
                  </button>
                  {n > 0 ? (
                    <div className="sav-paso">
                      <button aria-label="Uno menos" onClick={() => cambiar(a, -1)}><Minus size={15} /></button>
                      <span>{n}</span>
                      <button aria-label="Uno más" onClick={() => cambiar(a, 1)} disabled={n >= a.stock}><Plus size={15} /></button>
                    </div>
                  ) : (
                    <button className="sav-mas" aria-label="Agregar" onClick={() => cambiar(a, 1)}><Plus size={17} /></button>
                  )}
                </div>
              );
            })}
          </div>

          {enCarrito.length > 0 && (
            <section className="sav-cobro">
              <div className="sav-titulo">Se lleva</div>
              <div className="m-list">
                {enCarrito.map(a => (
                  <div key={a.id} className="m-row sav-item">
                    <span className="sav-cant">{carrito[a.id]}×</span>
                    <div className="m-row-main"><div className="m-row-t">{nombreAccesorio(a)}</div>
                      {monedaAccesorio(a.currency) === 'USD' && <div className="m-row-s">{precioDe(a)} c/u{cot > 0 ? ` · a $ ${cot.toLocaleString('es-AR')}` : ''}</div>}
                    </div>
                    <span className="m-row-num">{faltaCotizacion && monedaAccesorio(a.currency) === 'USD' ? '—' : pesos(enPesos((Number(a.sale_price) || 0) * carrito[a.id], a.currency, cot))}</span>
                    <button className="btn-icon" aria-label="Quitar" onClick={() => quitar(a.id)}><Trash2 size={15} color="var(--red)" /></button>
                  </div>
                ))}
                <div className="m-row sav-total"><div className="m-row-main"><div className="m-row-t">Total</div></div><span className="m-row-num">{faltaCotizacion ? '—' : pesos(total)}</span></div>
              </div>

              <div className="sav-campos">
                {hayDolares && (
                  <label className="field"><span className="lbl">Cotización del dólar</span>
                    <input className="inp" type="text" inputMode="decimal" placeholder="Ej: 1500" value={rate} onChange={e => setRate(e.target.value.replace(/[^0-9.]/g, ''))} />
                  </label>
                )}
                <label className="field"><span className="lbl">Cliente (opcional)</span>
                  <input className="inp" placeholder={CLIENTE_ANONIMO} value={cliente} onChange={e => setCliente(e.target.value)} />
                </label>
              </div>

              <div className="sav-titulo">Cómo paga</div>
              <div className="sav-pagos">
                {pagosPosibles.map(m => (
                  <button key={m.id} className={`m-chip ${pago === m.id ? 'on' : ''}`} onClick={() => setPago(m.id)}>{m.label}</button>
                ))}
              </div>
              {PAGOS.find(p => p.id === pago)?.cur === 'USD' && cot > 0 && (
                <div className="sav-nota">Son U$ {(total / cot).toLocaleString('es-AR', { maximumFractionDigits: 2 })} a $ {cot.toLocaleString('es-AR')}.</div>
              )}
            </section>
          )}
        </div>

        <div className="sav-pie">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-dark btn-lg" style={{ flex: 1 }} onClick={confirmar} disabled={loading || enCarrito.length === 0 || faltaCotizacion}>
            {loading ? 'Procesando…' : enCarrito.length === 0 ? 'Elegí accesorios' : `Cobrar ${pesos(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
