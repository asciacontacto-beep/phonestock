"use client"
import { useState, useEffect, useRef } from 'react';
import { BRANDS, MODELS, STORAGES, COLORS, MODEL_STORAGES, almacenamientosDe } from '@/constants/data';
import { createClient } from '@/utils/supabase/client';
import { registrarCompra } from '@/utils/compras';
import { crearPedido, totalDelPedido } from '@/utils/proveedores';
import { ModelPicker } from './ModelPicker';
import { limpiarImei, repetidosEnLote, buscarImeisEnStock, avisoDuplicado, esErrorImeiRepetido } from '@/utils/imei';
import { buscarEquipoPorCodigo, codigoCanonico, variantesDeCodigo, esImei } from '@/utils/codigos';
import { imeiDeUnidad, imeisDeLaCarga, precioDeVariante, costoDeVariante, cantidad } from '@/utils/cargaEquipos';
import { Check, X, ChevronRight, ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const BATTERY_OPTIONS = ['100%', '95%', '90%', '85%', '80%', '75%', '70%', '65%', '60%', 'Sin dato'];

interface ManualEntryModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** El vendedor carga equipos sin ver ni escribir costos. */
  isOwner?: boolean;
  /** Código escaneado que no se reconoció: se precarga y queda aprendido al guardar. */
  upcInicial?: string;
}

const isOldPro = (m: string) => {
  if (!m || typeof m !== 'string') return false;
  return m.includes('Pro') && (m.includes('14') || m.includes('13') || m.includes('12') || m.includes('11') || m.includes('XS'));
};

function emptyVariant() {
  return {
    storage: '128GB', color: 'Negro', condition: 'new' as 'new' | 'used', battery: '100%',
    qty: 1 as number | string, imeis: [] as string[],
    // Precio/costo distinto a los del paso 1: sólo si se lo pide.
    precioPropio: false, price: '', costPrice: '', notes: '',
  };
}

export function ManualEntryModal({ open, onClose, onSuccess, isOwner = false, upcInicial = '' }: ManualEntryModalProps) {
  const [step, setStep] = useState(1);
  const [upc, setUpc] = useState('');
  const [brand, setBrand] = useState('Apple');
  const [appleCategory, setAppleCategory] = useState('iPhone');
  const [model, setModel] = useState('iPhone 15 Pro Max');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [cur, setCur] = useState('USD');
  const [dep, setDep] = useState<any>(null);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [depositsLoaded, setDepositsLoaded] = useState(false);
  const [sup, setSup] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  /* Registrar la compra es opcional: se puede seguir cargando un equipo con
     sólo el costo, como siempre. Pero si no se registra, la plata que se
     pagó no sale de ninguna caja y la ganancia queda inflada.
     'cuenta': no se pagó todavía; queda como pedido en la cuenta corriente
     del proveedor. */
  const [pagoCompra, setPagoCompra] = useState<'no' | 'caja' | 'cuenta'>('no');
  const registrarPago = pagoCompra === 'caja';
  const [metodoPago, setMetodoPago] = useState('usd_cash');
  const [cajaPago, setCajaPago] = useState('');
  const [fechaCompra, setFechaCompra] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [cotizacionCompra, setCotizacionCompra] = useState('');
  const [variants, setVariants] = useState([emptyVariant()]);
  const [loading, setLoading] = useState(false);
  const priceRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  /* El vendedor escribe el costo sólo si el local lo habilitó (Configuración
     → Vendedores). Lo escribe, nunca lo lee: el campo arranca vacío. */
  const [vendedorCargaCosto, setVendedorCargaCosto] = useState(false);
  const verCampoCosto = isOwner || vendedorCargaCosto;

  useEffect(() => {
    if (open) {
      setStep(1);
      if (upcInicial) setUpc(upcInicial);
      setDepositsLoaded(false);
      supabase.from('deposits').select('*').order('name').then(({ data }) => {
        setDeposits(data || []);
        if (data && data.length > 0) setDep(data[0].id);
        setDepositsLoaded(true);
      });
      if (!isOwner) {
        supabase.from('settings').select('vendedor_carga_costo').limit(1).maybeSingle()
          .then(({ data, error }) => setVendedorCargaCosto(!error && Boolean((data as { vendedor_carga_costo?: boolean } | null)?.vendedor_carga_costo)));
      }
      supabase.from('suppliers').select('*').order('name').then(({ data }) => {
        if (data && data.length > 0) {
          setSuppliers(data);
          setSup(data[0].id);
        }
      });
    }
  }, [open]);

  /* Se busca cuando el código está completo (UPC 12, EAN 13, GTIN 14) o al
     tocar Enter: la pistola tipea dígito por dígito y antes se consultaba la
     base con cada uno. Ver utils/codigos.ts. */
  const handleUPCSearch = async (code: string, forzar = false) => {
    setUpc(code);
    const d = code.replace(/\D/g, '');
    if (!forzar && !(d.length >= 12 && d.length <= 14)) return;

    // Se pistoleó el IMEI en el campo del código: va al IMEI del equipo.
    if (esImei(code)) {
      setUpc('');
      setVariants(vs => vs.map((v, i) => {
        if (i !== 0) return v;
        const imeis = [...(v.imeis || [])];
        const libre = Array.from({ length: Math.max(1, cantidad(v)) }, (_, k) => k).find(k => !imeis[k]?.trim());
        imeis[libre ?? cantidad(v)] = limpiarImei(code);
        return { ...v, imeis, qty: Math.max(cantidad(v), (libre ?? cantidad(v)) + 1) };
      }));
      toast.success('Era el IMEI: lo cargué en el equipo. El código del modelo es otro (UPC/EAN).');
      return;
    }

    const found = await buscarEquipoPorCodigo(supabase, code).catch(() => null);
    if (!found) {
      if (forzar) toast.message('Código nuevo: completá el equipo y queda guardado para la próxima.');
      return;
    }
    setBrand(found.brand);
    if (found.brand === 'Apple') {
      const linea = ['iPhone', 'iPad', 'MacBook', 'AirPods', 'Apple Watch'].find(l => found.model.startsWith(l));
      if (linea) setAppleCategory(linea);
    }
    setModel(found.model);
    setVariants(vs => vs.map((v: any) => ({ ...v, color: found.color, storage: found.storage, condition: isOldPro(found.model) ? 'used' : 'new' })));
    toast.success(`✓ ${found.brand} ${found.model} ${found.storage} ${found.color}`.trim());
  };

  const handleBrand = (b: string) => {
    setBrand(b);
    let m = MODELS[b]?.[0] || '';
    if (b === 'Apple') {
      m = MODELS['Apple']?.find(x => x.startsWith(appleCategory)) || MODELS['Apple']?.[0] || '';
    }
    setModel(m);
    setVariants(vs => vs.map((v: any) => ({
      ...v,
      color: (COLORS[m] || COLORS[b] || ['Negro'])[0],
      storage: almacenamientosDe(m)[0],
      condition: isOldPro(m) ? 'used' : 'new'
    })));
  };

  const handleAppleCategory = (cat: string) => {
    setAppleCategory(cat);
    const m = MODELS['Apple']?.find(x => x.startsWith(cat)) || '';
    handleModel(m);
  };

  const handleModel = (m: string) => {
    setModel(m);
    setVariants(vs => vs.map((v: any) => ({
      ...v,
      color: (COLORS[m] || COLORS[brand] || ['Negro'])[0],
      storage: almacenamientosDe(m)[0],
      condition: isOldPro(m) ? 'used' : 'new'
    })));
  };

  const updV = (i: number, key: string, val: any) =>
    setVariants(vs => vs.map((v, idx) => idx === i ? { ...v, [key]: val } : v));

  const addVariant = () =>
    setVariants(vs => [...vs, { ...emptyVariant(), color: COLORS[brand]?.[0] || 'Negro', condition: isOldPro(model) ? 'used' : 'new' }]);

  const removeVariant = (i: number) =>
    setVariants(vs => vs.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!model || !price || (isOwner && !costPrice) || !dep) { toast.error('Completá todos los campos'); return; }
    if (pagoCompra === 'cuenta' && !sup) { toast.error('Elegí el proveedor al que le debés el pedido'); return; }
    setLoading(true);
    try {
      /* El código queda aprendido (en su forma de 12 dígitos) con modelo,
         memoria y color: la próxima vez el lector lo reconoce. Con varias
         variantes en una carga, el código no dice cuál es: sólo el modelo. */
      if (upc.trim().length > 5 && !esImei(upc)) {
        const canonico = codigoCanonico(upc);
        const { data: exists } = await supabase.from('product_catalog').select('id').in('upc', variantesDeCodigo(upc)).limit(1);
        if (!exists || exists.length === 0) {
          const unica = variants.length === 1 ? variants[0] : null;
          await supabase.from('product_catalog').insert({
            upc: canonico, brand, model,
            ...(unica ? { storage: unica.storage, color: unica.color } : {}),
          });
        }
      }
      // El IMEI identifica al aparato: dos disponibles con el mismo número
      // son el mismo teléfono contado dos veces. Se avisa antes de guardar,
      // nombrando el equipo; el índice de la base es la garantía final.
      const imeisCargados = imeisDeLaCarga(variants);

      const repes = repetidosEnLote(imeisCargados);
      if (repes.length > 0) {
        toast.error(`Repetiste el IMEI ${repes.join(', ')} en esta misma carga.`);
        setLoading(false);
        return;
      }

      const yaEstan = await buscarImeisEnStock(supabase, imeisCargados);
      if (yaEstan.length > 0) {
        toast.error(avisoDuplicado(yaEstan));
        setLoading(false);
        return;
      }

      const units: any[] = [];
      variants.forEach(v => {
        const qty = Number(v.qty) || 0;
        Array.from({ length: qty }).forEach((_, k) => {
          units.push({
            brand, model, storage: v.storage, color: v.color,
            condition: v.condition,
            battery: v.condition === 'used' ? v.battery : null,
            // Cada unidad con su IMEI (antes sólo se podía con cantidad 1).
            imei: imeiDeUnidad(v, k),
            price: precioDeVariante(v, price),
            // Dueño: obligatorio. Vendedor habilitado: opcional. Si no, sin costo.
            cost_price: !verCampoCosto ? null : costoDeVariante(v, costPrice),
            currency: cur,
            deposit: dep, supplier_id: sup, status: 'available', upc: upc || null,
            notes: v.notes?.trim() || null
          });
        });
      });
      // Sólo el id: lo que vuelve lo ve el navegador, y el costo no hace falta.
      const { data: inserted, error } = await supabase.from('stock').insert(units).select('id');
      if (error) throw error;
      if (inserted) {
        const total = variants.reduce((a, v) => a + (Number(v.qty) || 0), 0);
        toast.success(`${total} equipo${total !== 1 ? 's' : ''} ingresado${total !== 1 ? 's' : ''}`);

        /* El stock ya entró. Si la salida de caja falla, se avisa en vez de
           tragarlo: el equipo está cargado pero la plata no salió. */
        if (registrarPago) {
          const r = await registrarCompra(supabase, {
            equipos: units,
            proveedorNombre: suppliers.find(x => String(x.id) === String(sup))?.name || null,
            metodo: metodoPago,
            depositId: cajaPago || null,
            fecha: fechaCompra,
            cotizacion: parseFloat(cotizacionCompra) || 0,
          });
          if (r.ok) {
            toast.success(`Salieron ${r.moneda === 'USD' ? 'U$' : '$'}${r.total.toLocaleString('es-AR')} de la caja`);
          } else {
            toast.warning(`Los equipos se cargaron, pero no se registró la salida de caja: ${r.error}`, { duration: 9000 });
          }
        }
        if (pagoCompra === 'cuenta') {
          const moneda = cur === 'ARS' ? 'ARS' : 'USD';
          const t = totalDelPedido(units, moneda);
          const r = t.ok
            ? await crearPedido(supabase, {
                supplierId: sup, moneda, total: t.total,
                fecha: fechaCompra, stockIds: inserted.map((x: any) => x.id),
              })
            : t;
          if (r.ok && t.ok) {
            const quien = suppliers.find(x => String(x.id) === String(sup))?.name || 'el proveedor';
            toast.success(`Pedido anotado: le debés ${moneda === 'ARS' ? '$' : 'U$'}${t.total.toLocaleString('es-AR')} a ${quien}`);
          } else if (!r.ok) {
            toast.warning(`Los equipos se cargaron, pero no se anotó la deuda con el proveedor: ${r.error}`, { duration: 9000 });
          }
        }
        setVariants([emptyVariant()]); setPrice(''); setCostPrice(''); setUpc(''); setPagoCompra('no');
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (e: any) {
      if (esErrorImeiRepetido(e)) {
        toast.error('Uno o más IMEI ingresados ya están en el inventario disponible.');
      } else {
        toast.error(e.message || 'Error al guardar');
      }
    } finally { setLoading(false); }
  };

  if (!open) return null;

  const totalUnits = variants.reduce((a, v) => a + (Number(v.qty) || 0), 0);
  const colors = COLORS[model] || COLORS[brand] || ['Negro'];
  const storages = almacenamientosDe(model);
  const isStep1Valid = !!model && !!price && (!isOwner || !!costPrice) && !!dep && (suppliers.length === 0 || !!sup);

  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6, display: 'block' };

  return (
    <div className="mo" style={{ zIndex: 1000 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mb" style={{ maxWidth: 640, width: '95vw' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 0 0', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 4, background: 'var(--border-md)' }} />
        </div>

        <div style={{
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)', flexShrink: 0
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>Ingresar equipo</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              {step === 1 ? 'Producto y precio' : `${totalUnits} unidad${totalUnits !== 1 ? 'es' : ''}`}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', gap: 4, padding: '10px 20px 0', flexShrink: 0 }}>
          {[1, 2].map(n => (
            <div key={n} style={{ flex: 1, height: 3, borderRadius: 3, background: n <= step ? 'var(--text)' : 'var(--border-md)', transition: 'background 0.2s' }} />
          ))}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '18px 20px', WebkitOverflowScrolling: 'touch' as any }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 14px' }}>
                <label style={labelStyle}>Escanear código UPC (opcional)</label>
                <input className="inp" style={{ textAlign: 'center', letterSpacing: 2, fontFamily: 'monospace', background: 'transparent', border: 'none', boxShadow: 'none', padding: '8px 0' }} placeholder="Hacé clic y escaneá…" value={upc} onChange={e => handleUPCSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleUPCSearch(upc, true); } }} />
              </div>
              <div><label className="lbl">Marca</label><select className="inp" value={brand} onChange={e => handleBrand(e.target.value)}>{BRANDS.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
              {brand === 'Apple' && (
                <div>
                  <label className="lbl">Línea de Producto</label>
                  <select className="inp" value={appleCategory} onChange={e => handleAppleCategory(e.target.value)}>
                    <option value="iPhone">iPhone</option>
                    <option value="iPad">iPad</option>
                    <option value="MacBook">MacBook</option>
                    <option value="AirPods">AirPods</option>
                    <option value="Apple Watch">Apple Watch</option>
                  </select>
                </div>
              )}
              <div>
                <label className="lbl">Modelo</label>
                <ModelPicker
                  value={model}
                  onChange={handleModel}
                  options={brand === 'Apple'
                    ? (MODELS['Apple'] || []).filter(m => m.startsWith(appleCategory))
                    : (MODELS[brand] || [])}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: verCampoCosto ? '1fr 1fr 100px' : '1fr 100px', gap: 12 }}>
                <div><label className="lbl">Precio Venta</label><input ref={priceRef} className="inp" type="text" inputMode="decimal" pattern="[0-9.]*" placeholder="0" value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} autoComplete="off" /></div>
                {verCampoCosto && <div><label className="lbl">Precio Costo{!isOwner && ' (opcional)'}</label><input className="inp" type="text" inputMode="decimal" pattern="[0-9.]*" placeholder="0" value={costPrice} onChange={e => setCostPrice(e.target.value.replace(/[^0-9.]/g, ''))} autoComplete="off" /></div>}
                <div><label className="lbl">Moneda</label><select className="inp" value={cur} onChange={e => setCur(e.target.value)}><option value="USD">USD $</option><option value="ARS">ARS $</option></select></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="lbl">Depósito</label><select className="inp" value={dep !== null ? String(dep) : ''} onChange={e => setDep(e.target.value)}>{!depositsLoaded && <option value="">Cargando…</option>}{depositsLoaded && deposits.length === 0 && <option value="">Sin depósitos — creá uno primero</option>}{deposits.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}</select></div>
                {suppliers.length > 0 && (
                  <div><label className="lbl">Proveedor</label><select className="inp" value={sup !== null ? String(sup) : ''} onChange={e => setSup(e.target.value)}>{suppliers.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}</select></div>
                )}
              </div>

              {/* Comprar mercadería no descontaba plata de ninguna caja: el
                  stock aparecía pero la salida no se registraba en ningún
                  lado. Se ofrece, no se obliga. Sólo el dueño: son costos. */}
              {isOwner && (
              <div style={{
                border: '1px solid var(--border)', borderRadius: 12, padding: 14,
                background: pagoCompra !== 'no' ? 'var(--surface-2)' : 'var(--blue-dim)',
              }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>¿Cómo pagaste esta compra?</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  {([
                    ['no', 'No registrar'],
                    ['caja', 'Pagué de una caja'],
                    ['cuenta', 'Se lo debo al proveedor'],
                  ] as const).map(([k, l]) => (
                    <button key={k} type="button"
                      className={`btn btn-sm ${pagoCompra === k ? 'btn-dark' : 'btn-outline'}`}
                      disabled={k === 'cuenta' && suppliers.length === 0}
                      title={k === 'cuenta' && suppliers.length === 0 ? 'Cargá un proveedor primero, en Proveedores' : undefined}
                      onClick={() => setPagoCompra(k)}>{l}</button>
                  ))}
                </div>
                <span style={{ display: 'block', fontSize: 12, color: pagoCompra !== 'no' ? 'var(--text-3)' : '#1e40af', lineHeight: 1.5, marginTop: 8 }}>
                  {pagoCompra === 'cuenta'
                    ? 'Queda como un pedido en la cuenta corriente del proveedor, por el costo total de estos equipos. Los pagos se anotan después, en Proveedores.'
                    : 'Podés cargar los equipos con el costo nomás, como siempre. Pero si registrás la compra, la plata sale de la caja y el sistema puede decirte la ganancia real y cuánto tenés invertido. Sin esto, la caja y la ganancia quedan más altas de lo que son.'}
                </span>

                {registrarPago && (
                  <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="lbl">Medio de pago</label>
                      <select className="inp" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                        <option value="usd_cash">Efectivo USD</option>
                        <option value="ars_cash">Efectivo ARS</option>
                        <option value="usd_transf">Transferencia USD</option>
                        <option value="ars_transf">Transferencia ARS</option>
                        <option value="usdt">USDT</option>
                      </select>
                    </div>
                    <div>
                      <label className="lbl">Caja de donde sale</label>
                      <select className="inp" value={cajaPago} onChange={e => setCajaPago(e.target.value)}>
                        <option value="">Elegí una caja</option>
                        {deposits.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="lbl">Fecha de la compra</label>
                      <input className="inp" type="date" value={fechaCompra} onChange={e => setFechaCompra(e.target.value)} />
                    </div>
                    <div>
                      <label className="lbl">Cotización (si mezclás monedas)</label>
                      <input className="inp" type="number" value={cotizacionCompra} placeholder="Opcional"
                        onChange={e => setCotizacionCompra(e.target.value)} />
                    </div>
                  </div>
                )}
                {pagoCompra === 'cuenta' && (
                  <div style={{ marginTop: 12 }}>
                    <label className="lbl">Fecha del pedido</label>
                    <input className="inp" type="date" value={fechaCompra} onChange={e => setFechaCompra(e.target.value)} />
                  </div>
                )}
              </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {variants.map((v, i) => (
                <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Variante {i + 1}</span>
                    {variants.length > 1 && (<button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => removeVariant(i)}><Trash2 size={14} /></button>)}
                  </div>
                  {model.startsWith('Apple Watch') ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-md)', borderRadius: 'var(--r-sm)', padding: '12px 14px' }}>
                        <label className="lbl" style={{ marginBottom: 8 }}>Medida</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {storages.map(s => (
                            <button key={s} className={`btn btn-sm ${v.storage === s ? 'btn-dark' : 'btn-outline'}`} onClick={() => updV(i, 'storage', s)} style={{ minWidth: 72 }}>{s}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="lbl">Color</label>
                        <input className="inp" list={`colors-list-${i}`} placeholder="Ej: Aluminio Medianoche" value={v.color} onChange={e => updV(i, 'color', e.target.value)} />
                        <datalist id={`colors-list-${i}`}>
                          {colors.map(c => <option key={c} value={c} />)}
                        </datalist>
                      </div>
                    </div>
                  ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div><label className="lbl">Almacenamiento</label><select className="inp" value={v.storage} onChange={e => updV(i, 'storage', e.target.value)}>{storages.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    <div>
                      <label className="lbl">Color</label>
                      <input className="inp" list={`colors-list-${i}`} placeholder="Ej: Azul" value={v.color} onChange={e => updV(i, 'color', e.target.value)} />
                      <datalist id={`colors-list-${i}`}>
                        {colors.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                  </div>
                  )}
                  <div style={{ marginBottom: 12 }}><label className="lbl">Condición</label><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><button className={`btn btn-sm ${v.condition === 'new' ? 'btn-dark' : 'btn-outline'}`} onClick={() => updV(i, 'condition', 'new')}>Sellado</button><button className={`btn btn-sm ${v.condition === 'used' ? 'btn-dark' : 'btn-outline'}`} onClick={() => updV(i, 'condition', 'used')}>Usado</button></div></div>
                  {v.condition === 'used' && (
                    <div style={{ marginBottom: 12 }}>
                      <label className="lbl">Batería</label>
                      <datalist id="battery-options">
                        {BATTERY_OPTIONS.map(b => <option key={b} value={b} />)}
                      </datalist>
                      <input className="inp" list="battery-options" placeholder="Ej: 87%" value={v.battery} onChange={e => updV(i, 'battery', e.target.value)} />
                    </div>
                  )}
                  {/* Precio y costo se cargan una vez, en el paso 1. Una variante
                      distinta (otra memoria, usado) los cambia sólo si se pide. */}
                  {!v.precioPropio ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
                      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '10px 12px', marginBottom: 12 }}>
                      <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                        Precio {cur === 'USD' ? 'U$' : '$'} {price || '—'}
                        {verCampoCosto && <> · Costo {cur === 'USD' ? 'U$' : '$'} {costPrice || '—'}</>}
                        <span style={{ color: 'var(--text-3)' }}> (los del paso 1)</span>
                      </span>
                      <button type="button" className="btn btn-sm btn-outline"
                        onClick={() => setVariants(vs => vs.map((x, idx) => idx === i ? { ...x, precioPropio: true, price, costPrice } : x))}>
                        Otro precio para esta variante
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: verCampoCosto ? '1fr 1fr' : '1fr', gap: 10 }}>
                        <div>
                          <label className="lbl">Precio de venta de esta variante</label>
                          <input className="inp" type="text" inputMode="decimal" value={v.price || ''} onChange={e => updV(i, 'price', e.target.value.replace(/[^0-9.]/g, ''))} />
                        </div>
                        {verCampoCosto && (
                          <div>
                            <label className="lbl">Costo de esta variante</label>
                            <input className="inp" type="text" inputMode="decimal" value={v.costPrice || ''} onChange={e => updV(i, 'costPrice', e.target.value.replace(/[^0-9.]/g, ''))} />
                          </div>
                        )}
                      </div>
                      <button type="button" className="btn btn-sm btn-ghost" style={{ marginTop: 6 }}
                        onClick={() => setVariants(vs => vs.map((x, idx) => idx === i ? { ...x, precioPropio: false, price: '', costPrice: '' } : x))}>
                        Usar los del paso 1
                      </button>
                    </div>
                  )}
                  <div style={{ marginBottom: 12, maxWidth: 140 }}>
                    <label className="lbl">Cantidad</label>
                    <input className="inp" type="text" inputMode="numeric" value={v.qty} onChange={e => { const val = e.target.value.replace(/\D/g, ''); updV(i, 'qty', val === '' ? '' : Math.min(parseInt(val, 10), 200)); }} />
                  </div>
                  {/* Un IMEI por unidad. Con la pistola: escaneás, Enter, y pasa al siguiente. */}
                  {cantidad(v) > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <label className="lbl">{cantidad(v) === 1 ? 'IMEI (opcional)' : `IMEI de cada unidad (opcional · ${imeisDeLaCarga([v]).length} de ${cantidad(v)})`}</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 190px), 1fr))', gap: 8 }}>
                        {Array.from({ length: cantidad(v) }, (_, k) => (
                          <input key={k} className="inp" type="text" inputMode="numeric" autoComplete="off"
                            data-imei={`${i}-${k}`}
                            placeholder={cantidad(v) === 1 ? '15 dígitos' : `Unidad ${k + 1}`}
                            value={v.imeis?.[k] || ''}
                            onChange={e => setVariants(vs => vs.map((x, idx) => {
                              if (idx !== i) return x;
                              const imeis = [...(x.imeis || [])];
                              imeis[k] = e.target.value;
                              return { ...x, imeis };
                            }))}
                            onKeyDown={e => {
                              if (e.key !== 'Enter') return;
                              e.preventDefault();
                              const sig = document.querySelector<HTMLInputElement>(`[data-imei="${i}-${k + 1}"]`);
                              sig?.focus();
                            }} />
                        ))}
                      </div>
                    </div>
                  )}
                  <div><label className="lbl">Observaciones (opcional)</label><input className="inp" placeholder="Ej: golpe en marco, sin caja..." value={v.notes} onChange={e => updV(i, 'notes', e.target.value)} /></div>
                </div>
              ))}
              <button className="btn btn-outline" style={{ width: '100%' }} onClick={addVariant}><Plus size={15} /> Agregar variante</button>
            </div>
          )}
          <div style={{ height: 8 }} />
        </div>

        <div style={{ padding: '12px 20px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, background: 'var(--surface)', flexShrink: 0 }}>
          {step > 1 ? (<button className="btn btn-outline btn-sm" style={{ gap: 5 }} onClick={() => setStep(1)}><ChevronLeft size={15} /> Atrás</button>) : (<button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-2)' }} onClick={onClose}>Cancelar</button>)}
          {step < 2 ? (<button className="btn btn-dark" style={{ flex: 1 }} onClick={() => { if (isStep1Valid) setStep(2); }} disabled={!isStep1Valid}>Continuar <ChevronRight size={15} /></button>) : (<button className="btn btn-dark" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading}>{loading ? 'Guardando…' : <><Check size={15} /> Ingresar {totalUnits} ud.</>}</button>)}
        </div>
      </div>
    </div>
  );
}
