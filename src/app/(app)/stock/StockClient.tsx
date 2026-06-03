"use client"
import { useState, useEffect } from 'react';
import { BRANDS, MODELS, STORAGES, COLORS, MODEL_STORAGES } from '@/constants/data';
import { Edit2, Trash2, X, Search, PenLine, Package } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ManualEntryModal } from '@/components/ManualEntryModal';

export function StockClient({ isOwner }: { isOwner?: boolean }) {
  const [stock, setStock] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [filter, setFilter] = useState({ brand: 'all', model: 'all', storage: 'all', sortPrice: 'none', q: '', status: 'available', condition: 'all', deposit: 'all' });
  const [editItem, setEditItem] = useState<any>(null);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkDeposit, setBulkDeposit] = useState<string>('');
  const [bulkTransferring, setBulkTransferring] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const [{ data: stockData }, { data: depositsData }] = await Promise.all([
        supabase.from('stock').select('*').order('created_at', { ascending: false }),
        supabase.from('deposits').select('*').order('name'),
      ]);
      setStock(stockData || []);
      setDeposits(depositsData || []);
      if (depositsData && depositsData.length > 0) setSelectedDeposit(depositsData[0].id);
      // Assign default deposit to items missing it
      const missing = (stockData || []).filter((s: any) => s.deposit === null || s.deposit === undefined);
      if (missing.length && depositsData && depositsData.length > 0) {
        const defId = depositsData[0].id;
        const ids = missing.map((s: any) => s.id);
        await supabase.from('stock').update({ deposit: defId }).in('id', ids);
        // Refresh stock data after update
        const { data: refreshed } = await supabase.from('stock').select('*').order('created_at', { ascending: false });
        setStock(refreshed || []);
      }
      setDataLoaded(true);
    })();
  }, []);

  let rows = stock.filter(s =>
    (filter.brand === 'all' || s.brand === filter.brand) &&
    (filter.model === 'all' || s.model === filter.model) &&
    (filter.storage === 'all' || s.storage === filter.storage) &&
    (filter.status === 'all' || s.status === filter.status) &&
    (filter.condition === 'all' || s.condition === filter.condition) &&
    (filter.deposit === 'all' || String(s.deposit) === String(filter.deposit)) &&
    (!filter.q || `${s.brand} ${s.model} ${s.imei} ${s.color}`.toLowerCase().includes(filter.q.toLowerCase()))
  );

  if (filter.sortPrice === 'asc') {
    rows.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (filter.sortPrice === 'desc') {
    rows.sort((a, b) => (b.price || 0) - (a.price || 0));
  }

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
        price: parseFloat(editItem.price), 
        cost_price: editItem.cost_price ? parseFloat(editItem.cost_price) : null,
        currency: editItem.currency,
        condition: editItem.condition, deposit: editItem.deposit
      };
      const { error } = await supabase.from('stock').update(updatedFields).eq('id', editItem.id);
      if (error) throw error;
      const updatedItem = { ...editItem, ...updatedFields };
      setStock(p => p.map(s => s.id === editItem.id ? updatedItem : s));
      setEditItem(null);
      router.refresh();
      toast.success('Equipo actualizado');
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  const handleBulkTransfer = async () => {
    if (!bulkDeposit || selectedItems.length === 0) return;
    if (!confirm(`¿Transferir ${selectedItems.length} equipos al depósito seleccionado?`)) return;
    
    setBulkTransferring(true);
    try {
      const { error } = await supabase.from('stock').update({ deposit: bulkDeposit }).in('id', selectedItems);
      if (error) throw error;
      
      setStock(p => p.map(s => selectedItems.includes(s.id) ? { ...s, deposit: bulkDeposit } : s));
      setSelectedItems([]);
      setBulkDeposit('');
      toast.success(`${selectedItems.length} equipos transferidos`);
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    } finally {
      setBulkTransferring(false);
    }
  };

  const depositOf = (s: any) => deposits.find((d: any) => String(d.id) === String(s.deposit));

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
          placeholder="Buscar modelo, IMEI/Serie, color…"
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
          { v: 'sold',      l: 'Vendidos' },
        ].map(opt => (
          <button
            key={opt.v}
            className={`btn-pill ${filter.status === opt.v ? 'active' : ''}`}
            onClick={() => { setFilter({ ...filter, status: opt.v }); setVisibleCount(50); }}
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
            onClick={() => { setFilter({ ...filter, condition: opt.v }); setVisibleCount(50); }}
          >{opt.l}</button>
        ))}
        <div style={{ width: 1, height: 20, background: 'var(--border-md)', margin: '0 4px' }} />
        
        <select 
          className="inp" 
          style={{ width: 'auto', padding: '6px 12px', minHeight: 36, borderRadius: 20 }} 
          value={filter.model} 
          onChange={e => { setFilter({ ...filter, model: e.target.value }); setVisibleCount(50); }}
        >
          <option value="all">Todos los modelos</option>
          {(filter.brand !== 'all' 
             ? (MODELS[filter.brand] || [])
             : Object.values(MODELS).flat()
          ).map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <select 
          className="inp" 
          style={{ width: 'auto', padding: '6px 12px', minHeight: 36, borderRadius: 20 }} 
          value={filter.storage} 
          onChange={e => { setFilter({ ...filter, storage: e.target.value }); setVisibleCount(50); }}
        >
          <option value="all">Almacenamiento</option>
          {STORAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select 
          className="inp" 
          style={{ width: 'auto', padding: '6px 12px', minHeight: 36, borderRadius: 20 }} 
          value={filter.sortPrice} 
          onChange={e => { setFilter({ ...filter, sortPrice: e.target.value }); setVisibleCount(50); }}
        >
          <option value="none">Orden normal</option>
          <option value="desc">Mayor precio</option>
          <option value="asc">Menor precio</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-3)' }}>
          <Package size={36} style={{ marginBottom: 14, opacity: 0.3 }} />
          <div style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Sin resultados</div>
          <div style={{ fontSize: 13 }}>Probá ajustando los filtros</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.slice(0, visibleCount).map(s => {
              const dep = depositOf(s);
              const isSelected = selectedItems.includes(s.id);
              return (
                <div 
                  key={s.id} 
                  onClick={() => setDetailItem(s)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', 
                    background: isSelected ? 'var(--surface-2)' : 'var(--surface)', 
                    borderRadius: 12, border: isSelected ? '2px solid var(--text)' : '1px solid var(--border)',
                    cursor: 'pointer', boxShadow: 'var(--shadow-xs)',
                    flexWrap: 'wrap'
                  }}
                >
                  <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                    <input 
                      type="checkbox" 
                      style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--text)' }}
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedItems([...selectedItems, s.id]);
                        else setSelectedItems(selectedItems.filter(id => id !== s.id));
                      }}
                    />
                  </div>

                  <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.brand} {s.model}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <span className={`badge ${s.condition === 'new' ? 'b-green' : 'b-neu'}`} style={{ fontSize: 10, padding: '2px 6px' }}>
                        {s.condition === 'new' ? 'Sellado' : 'Usado'}
                      </span>
                      <span>{s.storage} · {s.color}</span>
                    </div>
                  </div>

                  <div style={{ flex: '1 1 120px', minWidth: 0 }}>
                    <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>
                      V: {s.currency === 'USD' ? 'U$' : '$'}{s.price?.toLocaleString()}
                    </div>
                    {isOwner && s.cost_price && (
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                        C: {s.currency === 'USD' ? 'U$' : '$'}{s.cost_price.toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: '0 1 120px', minWidth: 0 }}>
                    {dep ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dep.color || 'var(--text-3)', flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dep.name}</span>
                      </div>
                    ) : <span className="badge b-neu">—</span>}
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button className="btn-icon" style={{ width: 32, height: 32 }} onClick={() => setEditItem(s)} title="Editar"><Edit2 size={16} /></button>
                    <button className="btn-icon" style={{ width: 32, height: 32, color: 'var(--red)' }} onClick={() => handleDelete(s.id)} title="Eliminar"><Trash2 size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        {visibleCount < rows.length && (
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <button className="btn btn-outline" onClick={() => setVisibleCount(v => v + 50)}>
              Cargar más resultados ({rows.length - visibleCount} restantes)
            </button>
          </div>
        )}
        </>
      )}

      {selectedItems.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 100,
          padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)', zIndex: 900
        }}>
          <div style={{ fontWeight: 600 }}>{selectedItems.length} seleccionados</div>
          <div style={{ width: 1, height: 20, background: 'var(--border-md)' }} />
          <select className="inp" style={{ width: 'auto', border: 'none', background: 'transparent' }} value={bulkDeposit} onChange={e => setBulkDeposit(e.target.value)}>
            <option value="">Elegir depósito destino...</option>
            {deposits.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button className="btn btn-dark btn-sm" disabled={!bulkDeposit || bulkTransferring} onClick={handleBulkTransfer}>
            {bulkTransferring ? 'Moviendo...' : 'Transferir Masivamente'}
          </button>
          <button className="btn-icon" onClick={() => setSelectedItems([])}><X size={16} /></button>
        </div>
      )}

      {editItem && (
        <div className="mo" style={{ zIndex: 1100 }} onClick={() => setEditItem(null)}>
          <div className="mb" onClick={e => e.stopPropagation()}>
            <div className="mh">
              <div>
                <div className="mh-title">Editar Equipo</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                  {editItem.brand} {editItem.model}
                </div>
              </div>
              <button className="btn-icon" onClick={() => setEditItem(null)}><X size={18} /></button>
            </div>
            <div className="mbd" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="lbl">Almacenamiento</label>
                  <select className="inp" value={editItem.storage} onChange={e => setEditItem({...editItem, storage: e.target.value})}>
                    {(MODEL_STORAGES[editItem.model] || STORAGES).map((s: string) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="lbl">Color</label>
                  <input className="inp" list="edit-colors" placeholder="Ej: Azul" value={editItem.color} onChange={e => setEditItem({...editItem, color: e.target.value})} />
                  <datalist id="edit-colors">
                    {(COLORS[editItem.model] || COLORS[editItem.brand] || ['Negro']).map((c: string) => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="lbl">Precio Venta</label>
                  <input className="inp" type="text" inputMode="decimal" value={editItem.price || ''} onChange={e => setEditItem({...editItem, price: e.target.value.replace(/[^0-9.]/g, '')})} />
                </div>
                {isOwner && (
                  <div>
                    <label className="lbl">Precio Costo</label>
                    <input className="inp" type="text" inputMode="decimal" value={editItem.cost_price || ''} onChange={e => setEditItem({...editItem, cost_price: e.target.value.replace(/[^0-9.]/g, '')})} />
                  </div>
                )}
                <div>
                  <label className="lbl">Moneda</label>
                  <select className="inp" value={editItem.currency} onChange={e => setEditItem({...editItem, currency: e.target.value})}>
                    <option value="USD">USD</option>
                    <option value="ARS">ARS</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="lbl">Condición</label>
                  <select className="inp" value={editItem.condition} onChange={e => setEditItem({...editItem, condition: e.target.value})}>
                    <option value="new">Sellado</option>
                    <option value="used">Usado</option>
                  </select>
                </div>
                <div>
                  <label className="lbl">Depósito</label>
                  <select className="inp" value={String(editItem.deposit)} onChange={e => setEditItem({...editItem, deposit: e.target.value})}>
                    {deposits.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditItem(null)}>Cancelar</button>
                <button className="btn btn-dark" style={{ flex: 1 }} onClick={handleUpdate} disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
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
                  <div className="sl">Venta sugerida</div>
                  <div className="sv" style={{ fontSize: 22 }}>
                    {detailItem.currency === 'USD' ? 'U$' : '$'} {detailItem.price?.toLocaleString()}
                  </div>
                </div>
                {isOwner && (
                  <div className="sc" style={{ flex: 1, minWidth: 120 }}>
                    <div className="sl">Costo</div>
                    <div className="sv" style={{ fontSize: 22, color: 'var(--text-2)' }}>
                      {detailItem.currency === 'USD' ? 'U$' : '$'} {detailItem.cost_price?.toLocaleString() || '-'}
                    </div>
                  </div>
                )}
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
  
      <ManualEntryModal
        open={showManual}
        onClose={() => setShowManual(false)}
        onSuccess={() => {
          supabase.from('stock').select('*').order('created_at', { ascending: false })
            .then(({ data }) => { if (data) setStock(data); });
        }}
      />
    </div>
  );
}
