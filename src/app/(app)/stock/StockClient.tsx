"use client"
import { useState, useEffect } from 'react';
import { BRANDS, MODELS, STORAGES, COLORS, MODEL_STORAGES } from '@/constants/data';
import { Edit2, Trash2, X, Search, Printer, PenLine, Package, Plus } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Barcode from 'react-barcode';
import { toast } from 'sonner';

export function StockClient() {
  const [stock, setStock] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [filter, setFilter] = useState({ brand: 'all', q: '', status: 'available', condition: 'all', deposit: 'all' });
  const [editItem, setEditItem] = useState<any>(null);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [printItem, setPrintItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    Promise.all([
      supabase.from('stock').select('*').order('created_at', { ascending: false }),
      supabase.from('deposits').select('*').order('name'),
    ]).then(([{ data: stockData }, { data: depositsData }]) => {
      setStock(stockData || []);
      setDeposits(depositsData || []);
      setDataLoaded(true);
    });
  }, []);

  const rows = stock.filter(s =>
    (filter.brand === 'all' || s.brand === filter.brand) &&
    (filter.status === 'all' || s.status === filter.status) &&
    (filter.condition === 'all' || s.condition === filter.condition) &&
    (filter.deposit === 'all' || String(s.deposit) === String(filter.deposit)) &&
    (!filter.q || `${s.brand} ${s.model} ${s.imei} ${s.color}`.toLowerCase().includes(filter.q.toLowerCase()))
  );

  const handlePrint = (item: any) => {
    setPrintItem(item);
    setTimeout(() => { window.print(); setPrintItem(null); }, 100);
  };

  const handleDelete = async (id: any) => {
    if (!confirm('¿Eliminar este equipo del stock?')) return;
    try {
      const { error } = await supabase.from('stock').delete().eq('id', id);
      if (error) throw error;
      setStock(p => p.filter(s => s.id !== id));
      setDetailItem(null);
      router.refresh();
    } catch (e: any) { alert(e.message); }
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    try {
      setLoading(true);
      const updatedFields = {
        brand: editItem.brand, model: editItem.model,
        storage: editItem.storage, color: editItem.color,
        price: parseFloat(editItem.price), currency: editItem.currency,
        condition: editItem.condition, deposit: editItem.deposit
      };
      const { error } = await supabase.from('stock').update(updatedFields).eq('id', editItem.id);
      if (error) throw error;
      const updatedItem = { ...editItem, ...updatedFields };
      setStock(p => p.map(s => s.id === editItem.id ? updatedItem : s));
      setEditItem(null);
      router.refresh();
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  const depositOf = (s: any) => deposits.find((d: any) => d.id === s.deposit);

  return (
    <div className="page">
      <div className="sh">
        <h1 className="st">Inventario Global</h1>
        <button className="btn btn-dark no-print" onClick={() => setShowManual(true)}>
          <PenLine size={15} /> Cargar equipo
        </button>
      </div>

      <div className="search-bar no-print">
        <Search size={16} color="var(--text-3)" style={{ flexShrink: 0 }} />
        <input
          className="inp"
          placeholder="Buscar modelo, IMEI, color…"
          value={filter.q}
          onChange={e => setFilter({ ...filter, q: e.target.value })}
        />
        {deposits.length > 0 && <>
          <div className="search-divider" />
          <select
            className="inp"
            style={{ border: 'none', background: 'transparent', width: 'auto', padding: '13px 0', flexShrink: 0 }}
            value={filter.deposit}
            onChange={e => setFilter({ ...filter, deposit: e.target.value })}
          >
            <option value="all">Todos los depósitos</option>
            {deposits.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
          </select>
        </>}
        {BRANDS.length > 0 && <>
          <div className="search-divider" />
          <select
            className="inp"
            style={{ border: 'none', background: 'transparent', width: 'auto', padding: '13px 0', flexShrink: 0 }}
            value={filter.brand}
            onChange={e => setFilter({ ...filter, brand: e.target.value })}
          >
            <option value="all">Todas las marcas</option>
            {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </>}
      </div>

      <div className="filters-wrap no-print">
        {[
          { v: 'available', l: 'En Stock' },
          { v: 'all',       l: 'Historial' },
          { v: 'sold',      l: 'Vendidos' },
        ].map(opt => (
          <button
            key={opt.v}
            className={`btn-pill ${filter.status === opt.v ? 'active' : ''}`}
            onClick={() => setFilter({ ...filter, status: opt.v })}
          >{opt.l}</button>
        ))}
        <div style={{ width: 1, height: 20, background: 'var(--border-md)', margin: '0 4px' }} />
        {[
          { v: 'all',  l: 'Todos' },
          { v: 'new',  l: 'Nuevos' },
          { v: 'used', l: 'Usados' },
        ].map(opt => (
          <button
            key={opt.v}
            className={`btn-pill ${filter.condition === opt.v ? 'active' : ''}`}
            onClick={() => setFilter({ ...filter, condition: opt.v })}
          >{opt.l}</button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-3)' }}>
          <Package size={36} style={{ marginBottom: 14, opacity: 0.3 }} />
          <div style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Sin resultados</div>
          <div style={{ fontSize: 13 }}>Probá ajustando los filtros</div>
        </div>
      ) : (
        <div className="stock-grid">
          {rows.map(s => {
            const dep = depositOf(s);
            return (
              <div key={s.id} className="stock-card" onClick={() => setDetailItem(s)}>
                <div className="stock-card-top">
                  <span className={`badge ${s.condition === 'new' ? 'b-green' : 'b-neu'}`}>
                    {s.condition === 'new' ? 'Sellado' : 'Usado'}
                  </span>
                  <div className="stock-card-actions">
                    <button
                      className="btn-icon"
                      onClick={e => { e.stopPropagation(); handlePrint(s); }}
                      title="Imprimir"
                    ><Printer size={13} /></button>
                    <button
                      className="btn-icon"
                      onClick={e => { e.stopPropagation(); setEditItem(s); }}
                      title="Editar"
                    ><Edit2 size={13} /></button>
                    <button
                      className="btn-icon"
                      style={{ color: 'var(--red)' }}
                      onClick={e => { e.stopPropagation(); handleDelete(s.id); }}
                      title="Eliminar"
                    ><Trash2 size={13} /></button>
                  </div>
                </div>

                <div>
                  <div className="stock-card-name">{s.brand} {s.model}</div>
                  <div className="stock-card-sub">{s.storage} · {s.color}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="stock-card-price">
                    {s.currency === 'USD' ? 'U$' : '$'} {s.price?.toLocaleString()}
                  </div>
                  {dep && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      fontSize: 11, color: 'var(--text-2)'
                    }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: dep.color || 'var(--text-3)', flexShrink: 0
                      }} />
                      {dep.name}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {detailItem && (
        <div className="mo" onClick={() => setDetailItem(null)}>
          <div className="mb" onClick={e => e.stopPropagation()}>
            <div className="mh">
              <div>
                <div className="mh-title">{detailItem.brand} {detailItem.model}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                  {detailItem.storage} · {detailItem.color}
                </div>
              </div>
              <button className="btn-icon" onClick={() => setDetailItem(null)}><X size={18} /></button>
            </div>
            <div className="mbd" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* ... detail modal contents ... */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div className="sc" style={{ flex: 1, minWidth: 120 }}>
                  <div className="sl">Precio</div>
                  <div className="sv" style={{ fontSize: 22 }}>
                    {detailItem.currency === 'USD' ? 'U$' : '$'} {detailItem.price?.toLocaleString()}
                  </div>
                </div>
                <div className="sc" style={{ flex: 1, minWidth: 120 }}>
                  <div className="sl">Estado</div>
                  <div style={{ marginTop: 10 }}>
                    <span className={`badge ${detailItem.status === 'available' ? 'b-green' : 'b-amber'}`}>
                      {detailItem.status === 'available' ? 'En Stock' : 'Vendido'}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => { setDetailItem(null); setEditItem(detailItem); }}
                ><Edit2 size={15} /> Editar</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Print area */}
      {printItem && (
        <div id="print-area">
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Stackr</h1>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
            <Barcode value={printItem.imei || "000000"} width={1.8} height={50} fontSize={14} displayValue={true} />
          </div>
        </div>
      )}

      {/* Modal: Cargar Equipo */}
      {showManual && (
        <div className="mo" onClick={() => setShowManual(false)}>
          <div className="mb" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="mh">
              <div className="mh-title">Cargar Equipo</div>
              <button className="btn-icon" onClick={() => setShowManual(false)}><X size={18} /></button>
            </div>
            <div className="mbd">
              <ManualEntryForm
                deposits={deposits}
                onSave={async (data: any) => {
                  const { data: inserted, error } = await supabase.from('stock').insert([data]).select();
                  if (error) { toast.error(error.message); return; }
                  if (inserted) setStock(p => [...inserted, ...p]);
                  toast.success('Equipo cargado');
                  setShowManual(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ManualEntryForm({ deposits, onSave }: { deposits: any[], onSave: (data: any) => void }) {
  const [f, setF] = useState({
    brand: 'Apple',
    model: MODELS['Apple']?.[0] || '',
    storage: '128GB',
    color: COLORS['Apple']?.[0] || 'Negro',
    imei: '',
    condition: 'new' as 'new' | 'used',
    price: '',
    currency: 'USD',
    deposit: deposits?.[0]?.id ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleBrandChange = (brand: string) => {
    setF(p => ({
      ...p, brand,
      model: MODELS[brand]?.[0] || '',
      color: COLORS[brand]?.[0] || 'Negro',
    }));
  };

  const handleSubmit = async () => {
    if (!f.model || !f.price) { toast.error('Completá modelo y precio'); return; }
    setSaving(true);
    await onSave({
      brand: f.brand,
      model: f.model,
      storage: f.storage,
      color: f.color,
      imei: f.imei || null,
      condition: f.condition,
      price: parseFloat(f.price),
      currency: f.currency,
      deposit: f.deposit,
      status: 'available',
    });
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="row">
        <div className="col field">
          <label className="lbl">Marca</label>
          <select className="inp" value={f.brand} onChange={e => handleBrandChange(e.target.value)}>
            {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="col field">
          <label className="lbl">Modelo</label>
          <select className="inp" value={f.model} onChange={e => setF(p => ({ ...p, model: e.target.value }))}>
            {(MODELS[f.brand] || []).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div className="row">
        <div className="col field">
          <label className="lbl">Almacenamiento</label>
          <select className="inp" value={f.storage} onChange={e => setF(p => ({ ...p, storage: e.target.value }))}>
            {(MODEL_STORAGES?.[f.model] || STORAGES).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="col field">
          <label className="lbl">Color</label>
          <select className="inp" value={f.color} onChange={e => setF(p => ({ ...p, color: e.target.value }))}>
            {(COLORS[f.brand] || ['Negro']).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label className="lbl">IMEI (opcional)</label>
        <input className="inp" value={f.imei} onChange={e => setF(p => ({ ...p, imei: e.target.value }))} placeholder="15 dígitos..." />
      </div>
      <div className="row">
        <div className="col field">
          <label className="lbl">Precio de Costo</label>
          <input className="inp" type="number" value={f.price} onChange={e => setF(p => ({ ...p, price: e.target.value }))} placeholder="0" />
        </div>
        <div className="col field">
          <label className="lbl">Moneda</label>
          <select className="inp" value={f.currency} onChange={e => setF(p => ({ ...p, currency: e.target.value }))}>
            <option value="USD">USD</option>
            <option value="ARS">ARS</option>
          </select>
        </div>
      </div>
      <div className="row">
        <div className="col field">
          <label className="lbl">Condición</label>
          <select className="inp" value={f.condition} onChange={e => setF(p => ({ ...p, condition: e.target.value as 'new' | 'used' }))}>
            <option value="new">Sellado / Nuevo</option>
            <option value="used">Usado</option>
          </select>
        </div>
        {deposits.length > 0 && (
          <div className="col field">
            <label className="lbl">Depósito</label>
            <select className="inp" value={String(f.deposit)} onChange={e => setF(p => ({ ...p, deposit: e.target.value }))}>
              {deposits.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
            </select>
          </div>
        )}
      </div>
      <button className="btn btn-dark btn-lg" style={{ width: '100%', marginTop: 8 }} onClick={handleSubmit} disabled={saving}>
        {saving ? 'Guardando...' : <><Plus size={16} /> Agregar al Stock</>}
      </button>
    </div>
  );
}
