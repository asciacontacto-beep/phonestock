"use client";

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Headphones, Plus, Search, Edit2, Trash2, ArrowRightLeft, DollarSign, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { MODELS } from '@/constants/data';
import { SellAccessoriesModal } from './SellAccessoriesModal';
import { useConfirm } from '@/hooks/useConfirm';

const ALL_MODELS = [
  ...Object.values(MODELS).flat().filter(m => m.toLowerCase().startsWith('iphone')).sort(),
  ...Object.values(MODELS).flat().filter(m => !m.toLowerCase().startsWith('iphone')).sort(),
];

export default function AccessoriesClient({ initialAccessories, deposits, user }: any) {
  const { confirm, ConfirmDialog } = useConfirm();
  const supabase = createClient();
  const [accessories, setAccessories] = useState<any[]>(initialAccessories);
  const [q, setQ] = useState('');
  const [isSellOpen, setIsSellOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<any>({ id: null, category: 'Funda', compatible_model: '', color: '', stock: '1', cost_price: '', sale_price: '', deposit_id: deposits[0]?.id || '', currency: 'USD' });
  const [loading, setLoading] = useState(false);

  const CATEGORIES = ['Funda', 'Vidrio Templado', 'Cargador', 'Auricular Genérico', 'Cable', 'Otro'];

  const handleSave = async (e: any) => {
    e.preventDefault();
    if (!form.category || !form.deposit_id) return toast.error('Faltan datos obligatorios');
    setLoading(true);

    try {
      const payload = {
        category: form.category,
        compatible_model: form.compatible_model.trim() || null,
        color: form.color.trim() || null,
        stock: Number(form.stock),
        cost_price: Number(form.cost_price) || 0,
        sale_price: Number(form.sale_price) || 0,
        deposit_id: form.deposit_id,
        currency: form.currency
      };

      if (form.id) {
        const { error } = await supabase.from('accessories').update(payload).eq('id', form.id);
        if (error) throw error;
        setAccessories(p => p.map(a => a.id === form.id ? { ...a, ...payload } : a));
        toast.success('Accesorio actualizado');
      } else {
        const { data, error } = await supabase.from('accessories').insert([payload]).select().single();
        if (error) throw error;
        setAccessories(p => [data, ...p]);
        toast.success('Accesorio agregado');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm('¿Seguro que querés eliminar este accesorio?')) return;
    try {
      const { error } = await supabase.from('accessories').delete().eq('id', id);
      if (error) throw error;
      setAccessories(p => p.filter(a => a.id !== id));
      toast.success('Accesorio eliminado');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openNew = () => {
    setForm({ id: null, category: 'Funda', compatible_model: '', color: '', stock: '1', cost_price: '', sale_price: '', deposit_id: deposits[0]?.id || '', currency: 'USD' });
    setIsModalOpen(true);
  };

  const openEdit = (a: any) => {
    setForm({ ...a, compatible_model: a.compatible_model || '', color: a.color || '', currency: a.currency || 'USD' });
    setIsModalOpen(true);
  };

  const filtered = accessories.filter(a => 
    (a.category + ' ' + (a.compatible_model||'') + ' ' + (a.color||'')).toLowerCase().includes(q.toLowerCase())
  );

  const totalValueUSD = filtered.filter(a => a.currency === 'USD').reduce((acc, a) => acc + (a.sale_price * a.stock), 0);
  const totalValueARS = filtered.filter(a => a.currency === 'ARS').reduce((acc, a) => acc + (a.sale_price * a.stock), 0);
  const totalCostUSD = filtered.filter(a => a.currency === 'USD').reduce((acc, a) => acc + (a.cost_price * a.stock), 0);
  const totalCostARS = filtered.filter(a => a.currency === 'ARS').reduce((acc, a) => acc + (a.cost_price * a.stock), 0);

  return (
    <div className="page">
      <div className="sh">
        <div>
          <h1 className="st">Accesorios</h1>
          <p className="helper-text">Gestioná el stock de fundas, vidrios y otros productos por cantidad.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => setIsSellOpen(true)}><ShoppingCart size={16} /> Vender</button>
          {(user.role === 'owner' || user.role === 'admin') && (
            <button className="btn btn-dark" onClick={openNew}><Plus size={16} /> Nuevo Accesorio</button>
          )}
        </div>
      </div>

      <div className="sg">
        <div className="sc">
          <div className="sl">Valor Total Venta</div>
          <div className="sv" style={{ color: 'var(--green)' }}>
            {totalValueUSD > 0 && <span style={{ marginRight: 8 }}>U$ {totalValueUSD.toLocaleString()}</span>}
            {totalValueARS > 0 && <span>$ {totalValueARS.toLocaleString()}</span>}
            {totalValueUSD === 0 && totalValueARS === 0 && <span>U$ 0</span>}
          </div>
        </div>
        <div className="sc">
          <div className="sl">Costo Total</div>
          <div className="sv">
            {totalCostUSD > 0 && <span style={{ marginRight: 8 }}>U$ {totalCostUSD.toLocaleString()}</span>}
            {totalCostARS > 0 && <span>$ {totalCostARS.toLocaleString()}</span>}
            {totalCostUSD === 0 && totalCostARS === 0 && <span>U$ 0</span>}
          </div>
        </div>
        <div className="sc">
          <div className="sl">Tipos Únicos</div>
          <div className="sv">{filtered.length}</div>
        </div>
      </div>

      <div className="search-bar">
        <Search size={16} color="var(--text-3)" />
        <input className="inp" placeholder="Buscar por categoría, modelo o color..." value={q} onChange={e => setQ(e.target.value)} />
      </div>

      <div className="tw">
        <table className="table">
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Modelo Compatible</th>
              <th>Color</th>
              <th>Stock</th>
              <th>Depósito</th>
              <th>Costo</th>
              <th>Precio Venta</th>
              {(user.role === 'owner' || user.role === 'admin') && <th style={{ width: 80 }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id}>
                <td style={{ fontWeight: 600 }}>{a.category}</td>
                <td>{a.compatible_model || '-'}</td>
                <td>{a.color || '-'}</td>
                <td>
                  <span className={`badge ${a.stock > 0 ? 'b-green' : 'b-red'}`}>{a.stock} un.</span>
                </td>
                <td>{deposits.find((d:any) => d.id === a.deposit_id)?.name}</td>
                <td>{a.currency === 'USD' ? 'U$' : '$'} {a.cost_price?.toLocaleString() || 0}</td>
                <td style={{ fontWeight: 600 }}>{a.currency === 'USD' ? 'U$' : '$'} {a.sale_price?.toLocaleString() || 0}</td>
                {(user.role === 'owner' || user.role === 'admin') && (
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-icon" onClick={() => openEdit(a)}><Edit2 size={14} /></button>
                      <button className="btn-icon" onClick={() => handleDelete(a.id)}><Trash2 size={14} color="var(--red)" /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>No hay accesorios cargados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="mo">
          <div className="mb">
            <div className="mh">
              <div className="mh-title">{form.id ? 'Editar Accesorio' : 'Nuevo Accesorio'}</div>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSave} className="mbd">
              <div className="row">
                <div className="col field">
                  <label className="lbl">Categoría</label>
                  <select className="inp" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col field">
                  <label className="lbl">Depósito</label>
                  <select className="inp" value={form.deposit_id} onChange={e => setForm({...form, deposit_id: e.target.value})}>
                    {deposits.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="row">
                <div className="col field">
                  <label className="lbl">Modelo Compatible (Opcional)</label>
                  <input className="inp" list="acc-models" placeholder="Ej: iPhone 15 Pro Max" value={form.compatible_model} onChange={e => setForm({...form, compatible_model: e.target.value})} />
                  <datalist id="acc-models">
                    {ALL_MODELS.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>
                <div className="col field">
                  <label className="lbl">Color (Opcional)</label>
                  <input className="inp" placeholder="Ej: Transparente" value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
                </div>
              </div>
              <div className="row">
                <div className="col field">
                  <label className="lbl">Moneda</label>
                  <select className="inp" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}>
                    <option value="USD">Dólar (U$)</option>
                    <option value="ARS">Pesos ($)</option>
                  </select>
                </div>
                <div className="col field">
                  <label className="lbl">Stock Inicial</label>
                  <input className="inp" type="number" min={0} value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} required />
                </div>
                <div className="col field">
                  <label className="lbl">Costo Unitario</label>
                  <input className="inp" type="number" step="0.01" value={form.cost_price} onChange={e => setForm({...form, cost_price: e.target.value})} />
                </div>
                <div className="col field">
                  <label className="lbl">Precio Venta</label>
                  <input className="inp" type="number" step="0.01" value={form.sale_price} onChange={e => setForm({...form, sale_price: e.target.value})} />
                </div>
              </div>
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-dark" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ConfirmDialog}
      {isSellOpen && (
        <SellAccessoriesModal
          accessories={accessories}
          onClose={() => setIsSellOpen(false)}
          onSold={(updates) => {
            setAccessories(p => p.map(a => {
              const upd = updates.find(u => u.id === a.id);
              return upd ? { ...a, stock: upd.newStock } : a;
            }));
            setIsSellOpen(false);
          }}
        />
      )}
    </div>
  );
}
