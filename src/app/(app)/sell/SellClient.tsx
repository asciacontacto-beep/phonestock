"use client"
import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Plus, Printer, Search, AlertTriangle, FileText, X } from 'lucide-react';
import { PAY, BRANDS, MODELS, STORAGES, COLORS } from '@/constants/data';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function SellClient() {
  const [stock, setStock] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [unit, setUnit] = useState<any>(null);
  const [cust, setCust] = useState({ name: '', dni: '', phone: '', email: '' });
  const [notes, setNotes] = useState('');
  const [payments, setPayments] = useState<any[]>([]);
  const [sc, setSc] = useState('USD');
  const [sp, setSp] = useState('');
  const [q, setQ] = useState('');
  const [selectedDeposit, setSelectedDeposit] = useState<string | null>(null);
  const [sm, setSm] = useState<string | null>(null);
  const [ma, setMa] = useState('');
  const [exchangeRate, setExchangeRate] = useState('1000');
  const [showTI, setShowTI] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const [custSearch, setCustSearch] = useState('');
  const [custSuggestions, setCustSuggestions] = useState<any[]>([]);
  const [searchingCust, setSearchingCust] = useState(false);
  const custTimer = useRef<any>(null);
  const supabase = createClient();

  useEffect(() => {
    // Fetch user session + all data in parallel — all client-side, no server wait
    Promise.all([
      supabase.auth.getSession(),
      supabase.from('stock').select('*').eq('status', 'available').order('created_at', { ascending: false }),
      supabase.from('deposits').select('*').order('name'),
      supabase.from('settings').select('*').maybeSingle()
    ]).then(([{ data: { session } }, { data: stockData }, { data: depositsData }, { data: settingsData }]) => {
      const u = session?.user
      if (u) {
        const isSuperAdmin = u.email === 'asciacontacto@gmail.com'
        setUser({ id: u.id, email: u.email, name: isSuperAdmin ? 'Administrador' : u.email })
      }
      setStock(stockData || []);
      setDeposits(depositsData || []);
      if (depositsData && depositsData.length > 0) setSelectedDeposit(String(depositsData[0].id));
      setSettings(settingsData);
    });


  }, []);

  const shop = settings || { shop_name: 'Stackr', address: '', phone: '', instagram: '', warranty_text: '' };

  const av = stock.filter((s: any) => s.status === 'available')
    .filter((s: any) => selectedDeposit === null || String(s.deposit) === selectedDeposit)
    .filter((s: any) => !q || `${s.brand} ${s.model} ${s.color} ${s.storage}`.toLowerCase().includes(q.toLowerCase()));
  const price = parseFloat(sp) || 0;
  const paid = payments.reduce((a, p) => a + p.amount, 0);
  const rem = price - paid;

  const addP = () => {
    if (!sm || !ma) return;
    const amt = parseFloat(ma);
    if (amt <= 0) return;
    const m = PAY.find(p => p.id === sm);
    
    let amountInSaleCur = amt;
    const rate = parseFloat(exchangeRate) || 1;
    if (m?.cur === 'ARS' && sc === 'USD') {
      amountInSaleCur = amt / rate;
    } else if (m?.cur === 'USD' && sc === 'ARS') {
      amountInSaleCur = amt * rate;
    }
    
    setPayments(p => [...p, { 
      id: sm, 
      label: m?.label, 
      amount: amountInSaleCur, 
      original_amount: amt,
      currency: m?.cur,
      exchange_rate: (m?.cur !== sc && m?.cur !== 'ANY') ? rate : null
    }]);
    setMa('');
    setSm(null);
  };

  const handleTI = (data: any) => {
    const amt = parseFloat(data.value);
    setPayments(p => [...p, { 
      id: 'tradein', 
      label: `TI: ${data.brand} ${data.model}`, 
      amount: amt, 
      original_amount: amt,
      currency: data.valueCurrency || sc,
      exchange_rate: null,
      device: data 
    }]);
    setShowTI(false);
  };

  const searchCustomer = (val: string) => {
    setCustSearch(val);
    clearTimeout(custTimer.current);
    if (val.length < 2) { setCustSuggestions([]); return; }
    custTimer.current = setTimeout(async () => {
      setSearchingCust(true);
      const { data } = await supabase.from('sales')
        .select('customer')
        .or(`customer->>name.ilike.%${val}%,customer->>dni.ilike.%${val}%`)
        .limit(5);
      if (data) {
        const unique = new Map<string, any>();
        data.forEach((row: any) => {
          if (row.customer?.dni) unique.set(row.customer.dni, row.customer);
          else if (row.customer?.name) unique.set(row.customer.name, row.customer);
        });
        setCustSuggestions(Array.from(unique.values()));
      }
      setSearchingCust(false);
    }, 350);
  };

  const applyCustSuggestion = (c: any) => {
    setCust({ name: c.name || '', dni: c.dni || '', phone: c.phone || '', email: c.email || '' });
    setCustSearch('');
    setCustSuggestions([]);
  };

  const confirm = async () => {
    if (!unit || !price || !payments.length || !cust.name) { toast.error('Datos incompletos'); return; }
    
    try {
      setLoading(true);
      const saleData = {
        seller_id: user.id,
        seller_name: user.name,
        brand: unit.brand,
        model: unit.model,
        storage: unit.storage,
        color: unit.color,
        imei: unit.imei,
        cost_price: unit.price,
        cost_currency: unit.currency,
        price,
        currency: sc,
        payments,
        customer: cust,
        notes: notes.trim() || null
      };

      const { data: saleRow, error: sErr } = await supabase.from('sales').insert([saleData]).select();
      if (sErr) throw sErr;

      const { error: uErr } = await supabase.from('stock').update({ status: 'sold' }).eq('id', unit.id);
      if (uErr) throw uErr;

      const tiItems = payments.filter(pay => pay.id === 'tradein').map(pay => ({
        brand: pay.device.brand,
        model: pay.device.model,
        storage: pay.device.storage,
        color: pay.device.color,
        imei: pay.device.imei || `TI-${Date.now()}`,
        condition: 'used',
        deposit: pay.device.deposit ?? (deposits[0]?.id ?? 1),
        status: 'available',
        price: pay.amount,
        currency: pay.device.valueCurrency || sc
      }));

      if (tiItems.length > 0) {
        const { data: insertedTI, error: tErr } = await supabase.from('stock').insert(tiItems).select();
        if (tErr) throw tErr;
        if (insertedTI) setStock((p: any[]) => [...insertedTI, ...p]);
      }

      setStock((p: any[]) => p.map((s: any) => s.id === unit.id ? { ...s, status: 'sold' } : s));

      if (cust.name) {
        const custData: any = {
          name: cust.name,
          phone: cust.phone || null,
          email: cust.email || null,
          updated_at: new Date().toISOString()
        };
        if (cust.dni) custData.dni = cust.dni;
        if (cust.dni) {
          await supabase.from('customers').upsert([custData], { onConflict: 'dni' });
        } else {
          const { data: existing } = await supabase.from('customers').select('id').eq('name', cust.name).maybeSingle();
          if (existing) {
            await supabase.from('customers').update({ phone: custData.phone, email: custData.email, updated_at: custData.updated_at }).eq('id', existing.id);
          } else {
            await supabase.from('customers').insert([custData]);
          }
        }
      }
      
      setLastSale(saleRow[0]);
      toast.success('Venta confirmada');
      setStep(1); setUnit(null); setPayments([]); setSp(''); setQ(''); setNotes('');
      setCust({ name: '', dni: '', phone: '', email: '' });
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || JSON.stringify(e) || 'Error al procesar venta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="sh" style={{ marginBottom: 20 }}>
        <h1 className="st">Nueva Venta</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[1,2,3].map(n => (
            <div key={n} style={{
              width: n === step ? 20 : 8, height: 6,
              borderRadius: 4,
              background: n === step ? 'var(--text)' : 'var(--border-md)',
              transition: 'all 0.2s'
            }} />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="card">
          <div className="lbl">1. Seleccionar Equipo en Stock</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4, whiteSpace: 'nowrap' }}>
            {deposits.map(d => (
              <button 
                key={d.id}
                className={`btn ${selectedDeposit === d.id ? 'btn-dark' : 'btn-outline'} btn-sm`}
                onClick={() => setSelectedDeposit(d.id)}
              >
                {d.name}
              </button>
            ))}
          </div>
          <input className="inp" placeholder="Filtrar por modelo, IMEI, color..." value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 16 }} />
          {av.length > 0 && av.length <= 5 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 14px', background: 'rgba(245,158,11,0.1)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)' }}>
              <AlertTriangle size={16} color="var(--amber)" />
              <span style={{ fontSize: 13, color: 'var(--amber)' }}>Stock bajo: solo quedan <strong>{av.length}</strong> equipos disponibles con este filtro.</span>
            </div>
          )}
          <div className="tw">
            <table className="table">
              <thead><tr><th>Equipo</th><th>Precio</th><th>Ubicación</th><th style={{ width: 30 }}></th></tr></thead>
              <tbody>
                {av.slice(0, 15).map((s: any) => (
                  <tr 
                    key={s.id} 
                    onClick={() => { setUnit(s); setSp(s.price); setSc(s.currency); setStep(2); }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.brand} {s.model}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{s.storage} · {s.color}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{s.imei || 'Sin IMEI'}</div>
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{s.currency === 'USD' ? 'U$' : '$'} {s.price?.toLocaleString()}</td>
                    <td><span className="badge b-neu">{deposits.find(d => d.id === s.deposit)?.name ?? '—'}</span></td>
                    <td style={{ textAlign: 'right', color: 'var(--text-3)' }}><ArrowRight size={16} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="lbl">2. Datos del Cliente</div>
          <div className="field" style={{ position: 'relative' }}>
            <label className="lbl">Buscar cliente anterior (DNI o nombre)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Search size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              <input
                className="inp"
                value={custSearch}
                onChange={e => searchCustomer(e.target.value)}
                placeholder="Ej: 30123456 o Juan Perez..."
                style={{ flex: 1 }}
              />
              {searchingCust && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Buscando...</span>}
            </div>
            {custSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                {custSuggestions.map((c, i) => (
                  <button key={i} onClick={() => applyCustSuggestion(c)}
                    style={{ width: '100%', padding: '10px 14px', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>DNI: {c.dni || '—'} · Tel: {c.phone || '—'}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="divider" style={{ margin: '12px 0' }} />
          <div className="field"><label className="lbl">Nombre y Apellido *</label><input className="inp" value={cust.name} onChange={e => setCust(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Juan Perez" /></div>
          <div className="row">
            <div className="col field"><label className="lbl">DNI / CUIT</label><input className="inp" value={cust.dni} onChange={e => setCust(p => ({ ...p, dni: e.target.value }))} /></div>
            <div className="col field"><label className="lbl">Teléfono</label><input className="inp" value={cust.phone} onChange={e => setCust(p => ({ ...p, phone: e.target.value }))} /></div>
          </div>
          <div className="field"><label className="lbl">Email</label><input className="inp" value={cust.email} onChange={e => setCust(p => ({ ...p, email: e.target.value }))} /></div>
          <div className="divider" />
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>Volver</button>
            <button className="btn btn-dark btn-lg" style={{ flex: 1 }} disabled={!cust.name} onClick={() => setStep(3)}>Continuar al Pago</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="lbl">3. Pago y Cierre</div>
          <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 8, marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{unit.brand} {unit.model}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{unit.storage} · {unit.color}</div>
            <div style={{ fontSize: 11, marginTop: 6, color: 'var(--text-3)' }}>
              Precio de costo: <span style={{ fontFamily: 'JetBrains Mono' }}>{unit.currency === 'USD' ? 'U$' : '$'} {unit.price?.toLocaleString()}</span>
            </div>
          </div>
          <div className="row">
            <div className="col field"><label className="lbl">Precio de Venta</label><input className="inp" type="number" value={sp} onChange={e => setSp(e.target.value)} /></div>
            <div className="col field"><label className="lbl">Moneda Venta</label><select className="inp" value={sc} onChange={e => { setSc(e.target.value); setPayments([]); }}>
              <option value="USD">Dólar (USD)</option>
              <option value="ARS">Pesos (ARS)</option>
            </select></div>
          </div>
          <div className="lbl">Método de Cobro</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {PAY.map(m => {
              const disabled = false; // Allow mixing currencies (ARS and USD)
              return <button key={m.id} disabled={disabled} className={`btn ${sm === m.id ? 'btn-dark' : 'btn-outline'} btn-sm`} onClick={() => { if (m.id === 'tradein') { setShowTI(true); setSm(null); } else { setSm(m.id); } }}>{m.label}</button>;
            })}
          </div>
          {sm && (
            <div className="card" style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', padding: 16, marginBottom: 16 }}>
              {(() => {
                const selectedPay = PAY.find(p => p.id === sm);
                const needsExchange = selectedPay && selectedPay.cur !== 'ANY' && selectedPay.cur !== sc;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {needsExchange && (
                      <div className="field" style={{ margin: 0 }}>
                        <label className="lbl">Cotización Dólar</label>
                        <input className="inp" type="number" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} />
                      </div>
                    )}
                    <div className="row">
                      <div className="col field" style={{ margin: 0 }}>
                        <label className="lbl">Monto a cobrar en {selectedPay?.cur}</label>
                        <input className="inp" type="number" value={ma} onChange={e => setMa(e.target.value)} placeholder="0.00" autoFocus onKeyDown={e => e.key === 'Enter' && addP()} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button className="btn btn-dark" style={{ height: 42 }} onClick={addP}><Plus size={16} /> Agregar</button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          {payments.length > 0 && (
            <div className="card" style={{ background: 'var(--surface-2)', padding: 16, marginBottom: 16 }}>
              {payments.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>{p.label}</span>
                    {p.exchange_rate && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.currency === 'USD' ? 'U$' : '$'} {p.original_amount.toLocaleString()} (Cot. {p.exchange_rate})</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'JetBrains Mono' }}>{sc === 'USD' ? 'U$' : '$'} {p.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    <button className="btn-ghost" onClick={() => setPayments(ps => ps.filter((_, j) => j !== i))} style={{ padding: 0, color: 'var(--red)' }}>×</button>
                  </div>
                </div>
              ))}
              <div className="divider" style={{ margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span style={{ flex: 1 }}>Saldo</span>
                <span style={{ color: rem <= 0.01 ? 'var(--green)' : 'var(--amber)' }}>{rem <= 0.01 ? 'Cubierto' : `${sc === 'USD' ? 'U$' : '$'} ${rem.toLocaleString(undefined, { maximumFractionDigits: 2 })} pendiente`}</span>
              </div>
            </div>
          )}
          <div className="field" style={{ marginTop: 16 }}>
            <label className="lbl" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={14} /> Notas / Garantía (opcional)
            </label>
            <textarea className="inp" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Garantía 30 días..." rows={2} style={{ resize: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>Atrás</button>
            <button className="btn btn-dark btn-lg" style={{ flex: 1 }} disabled={!price || !payments.length || loading || rem > 0.01 || rem < -0.01} onClick={confirm}>
              {loading ? 'Procesando...' : 'Finalizar Operación'}
            </button>
          </div>
        </div>
      )}

      {showTI && (
        <div className="mo" style={{ zIndex: 1000 }}>
          <div className="mb">
            <div className="mh"><div className="mh-title">Tomar equipo usado</div><button className="btn-icon" onClick={() => setShowTI(false)}><X size={18}/></button></div>
            <div className="mbd">
              <TradeInForm currency={sc} deposits={deposits} onConfirm={handleTI} />
            </div>
          </div>
        </div>
      )}

      {lastSale && (
        <div className="mo" style={{ zIndex: 1000 }}>
          <div className="mb" style={{ maxWidth: 450 }}>
            <div className="mh"><div className="mh-title">Comprobante</div><button className="btn btn-outline btn-sm no-print" onClick={() => window.print()}><Printer size={14} /> Imprimir</button></div>
            <div className="mbd" style={{ background: '#fff' }}>
              <Receipt sale={lastSale} shop={shop} />
            </div>
            <div className="mh no-print"><button className="btn btn-dark" style={{ width: '100%' }} onClick={() => setLastSale(null)}>Listo / Nueva Venta</button></div>
          </div>
        </div>
      )}
      <div style={{ height: 80 }} />
    </div>
  );
}

function TradeInForm({ currency, deposits, onConfirm }: any) {
  const [f, setF] = useState({
    brand: 'Apple', model: 'iPhone 12', storage: '128GB', color: 'Negro',
    imei: '', condition: 'used', value: '', valueCurrency: currency,
    deposit: deposits?.[0]?.id ?? 1
  });

  return (
    <>
      <div className="row"><div className="col field"><label className="lbl">Marca</label><select className="inp" value={f.brand} onChange={e => setF(p => ({ ...p, brand: e.target.value, model: MODELS[e.target.value]?.[0] || '' }))}>{BRANDS.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
        <div className="col field"><label className="lbl">Modelo</label><select className="inp" value={f.model} onChange={e => setF(p => ({ ...p, model: e.target.value }))}>{(MODELS[f.brand] || []).map(m => <option key={m} value={m}>{m}</option>)}</select></div></div>
      <div className="row"><div className="col field"><label className="lbl">GB</label><select className="inp" value={f.storage} onChange={e => setF(p => ({ ...p, storage: e.target.value }))}>{STORAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
        <div className="col field"><label className="lbl">Color</label><select className="inp" value={f.color} onChange={e => setF(p => ({ ...p, color: e.target.value }))}>{(COLORS[f.brand] || ['Negro']).map(c => <option key={c} value={c}>{c}</option>)}</select></div></div>
      <div className="field"><label className="lbl">IMEI</label><input className="inp" value={f.imei} onChange={e => setF(p => ({ ...p, imei: e.target.value }))} placeholder="15 dígitos..." /></div>
      <div className="row">
        <div className="col field"><label className="lbl">Valor de toma</label><input className="inp" type="number" value={f.value} onChange={e => setF(p => ({ ...p, value: e.target.value }))} /></div>
        <div className="col field"><label className="lbl">Moneda</label><input className="inp" value={f.valueCurrency} disabled /></div>
      </div>
      {deposits?.length > 0 && (
        <div className="field">
          <label className="lbl">Ingresar al depósito</label>
          <select className="inp" value={String(f.deposit)} onChange={e => setF(p => ({ ...p, deposit: e.target.value }))}>
            {deposits.map((d: any) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
          </select>
        </div>
      )}
      <button className="btn btn-dark btn-lg" style={{ width: '100%' }} onClick={() => onConfirm(f)}>Agregar a la venta</button>
    </>
  );
}

function Receipt({ sale, shop }: any) {
  const paid = (sale.payments || []).reduce((a: any, p: any) => a + p.amount, 0);
  const isDeposit = paid < sale.price;
  return (
    <div className="receipt-view" style={{ color: '#000' }}>
      <div className="receipt-header" style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: -1 }}>{shop.shop_name.toUpperCase()}</div>
        {shop.address && <div style={{ fontSize: 10, marginTop: 4 }}>{shop.address}</div>}
        <div style={{ fontSize: 10, display: 'flex', justifyContent: 'center', gap: 10, marginTop: 4 }}>
          {shop.phone && <span>WA: {shop.phone}</span>}
          {shop.instagram && <span>IG: {shop.instagram}</span>}
        </div>
      </div>
      <div className="receipt-row"><span>ORDEN:</span><span>#REC-{sale.id?.toString().slice(-6) || 'N/A'}</span></div>
      <div className="receipt-row"><span>ASESOR:</span><span>{sale.seller_name}</span></div>
      <div style={{ margin: '15px 0', borderBottom: '1px dashed #ccc' }} />
      <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 11 }}>CLIENTE</div>
      <div className="receipt-row"><span>Nombre:</span><span>{sale.customer?.name}</span></div>
      {sale.customer?.dni && <div className="receipt-row"><span>DNI:</span><span>{sale.customer?.dni}</span></div>}
      <div style={{ margin: '15px 0', borderBottom: '1px dashed #ccc' }} />
      <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 11 }}>PRODUCTO</div>
      <div style={{ fontSize: 12, marginBottom: 10, lineHeight: 1.4 }}>
        <strong>{sale.brand} {sale.model}</strong><br />
        <span style={{ fontSize: 11 }}>{sale.storage} · {sale.color}</span><br />
        <span style={{ fontSize: 10, opacity: 0.8 }}>IMEI: {sale.imei}</span>
      </div>
      <div style={{ margin: '15px 0', borderBottom: '1px dashed #ccc' }} />
      <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 11 }}>PAGOS</div>
      {sale.payments?.map((p: any, i: number) => (
        <div key={i} className="receipt-row" style={{ alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>{p.label}:</span>
            {p.exchange_rate && <span style={{ fontSize: 10, color: '#666' }}>({p.currency === 'USD' ? 'U$' : '$'} {p.original_amount.toLocaleString()} a cot. {p.exchange_rate})</span>}
          </div>
          <span>{sale.currency === 'USD' ? 'U$' : '$'} {p.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
      ))}
      <div style={{ marginTop: 20, padding: 12, background: '#f9f9f9', borderRadius: 4 }}>
        <div className="receipt-row" style={{ fontWeight: 'bold', fontSize: 14 }}>
          <span>TOTAL:</span>
          <span>{sale.currency === 'USD' ? 'U$' : '$'} {sale.price.toLocaleString()}</span>
        </div>
        <div className="receipt-row" style={{ fontSize: 12, marginTop: 4 }}>
          <span>ABONADO:</span>
          <span>{sale.currency === 'USD' ? 'U$' : '$'} {paid.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
