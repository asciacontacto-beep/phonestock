"use client"
import { useState } from 'react';
import { Plus, Trash2, X, Wallet, Filter, TrendingDown } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  'Operativo', 'Sueldos', 'Alquiler', 'Viáticos', 'Servicio Técnico',
  'Logística', 'Impuestos', 'Publicidad', 'Varios'
];

export function ExpensesClient({ initialExpenses, initialDeposits, currentUser }: {
  initialExpenses: any[];
  initialDeposits: any[];
  currentUser: { id: string; email: string; name: string };
}) {
  const [expenses, setExpenses] = useState<any[]>(initialExpenses);
  const [deposits] = useState<any[]>(initialDeposits);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterDep, setFilterDep] = useState<string>('all');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [form, setForm] = useState({
    description: '',
    amount: '',
    currency: 'ARS',
    category: 'Operativo',
    deposit_id: deposits[0]?.id?.toString() || ''
  });
  const supabase = createClient();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!form.description.trim() || !form.amount || !form.deposit_id) {
      toast.error('Completá todos los campos');
      return;
    }
    setLoading(true);
    try {
      const row = {
        description: form.description.trim(),
        amount: parseFloat(form.amount),
        currency: form.currency,
        category: form.category,
        deposit_id: form.deposit_id,
        seller_id: currentUser.id,
        seller_name: currentUser.name
      };
      const { data, error } = await supabase.from('expenses').insert([row]).select();
      if (error) throw error;
      if (data) setExpenses(prev => [data[0], ...prev]);
      setForm({ description: '', amount: '', currency: 'ARS', category: 'Operativo', deposit_id: deposits[0]?.id?.toString() || '' });
      setShowForm(false);
      toast.success('Gasto registrado');
      router.refresh();
    } catch (e: any) {
      toast.error('Error: ' + (e.message || JSON.stringify(e)));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      setExpenses(prev => prev.filter(e => e.id !== id));
      toast.success('Gasto eliminado');
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    }
  };

  const filtered = expenses
    .filter(e => filterDep === 'all' || String(e.deposit_id) === filterDep)
    .filter(e => filterCat === 'all' || e.category === filterCat)
    .filter(e => {
      if (!startDate && !endDate) return true;
      const d = new Date(e.created_at);
      if (startDate && d < new Date(startDate)) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });

  const totalARS = filtered.filter(e => e.currency === 'ARS').reduce((a, e) => a + e.amount, 0);
  const totalUSD = filtered.filter(e => e.currency === 'USD').reduce((a, e) => a + e.amount, 0);

  // Group by category for summary
  const byCat: Record<string, { ars: number; usd: number }> = {};
  filtered.forEach(e => {
    if (!byCat[e.category]) byCat[e.category] = { ars: 0, usd: 0 };
    if (e.currency === 'ARS') byCat[e.category].ars += e.amount;
    else byCat[e.category].usd += e.amount;
  });
  const catSummary = Object.entries(byCat).sort((a, b) => (b[1].ars + b[1].usd * 1000) - (a[1].ars + a[1].usd * 1000));

  const depName = (id: string) => deposits.find(d => d.id === id)?.name || '—';

  return (
    <div className="page">
      <div className="sh" style={{ marginBottom: 20 }}>
        <h1 className="st">Gastos Operativos</h1>
        <button className="btn btn-dark" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Cargar Gasto
        </button>
      </div>

      {/* Summary cards */}
      <div className="sg" style={{ marginBottom: 24 }}>
        <div className="sc">
          <div className="sl">Total ARS</div>
          <div className="sv" style={{ color: 'var(--red)' }}>$ {Math.round(totalARS).toLocaleString()}</div>
        </div>
        <div className="sc">
          <div className="sl">Total USD</div>
          <div className="sv" style={{ color: 'var(--red)' }}>U$ {totalUSD.toLocaleString()}</div>
        </div>
        <div className="sc">
          <div className="sl">Registros</div>
          <div className="sv">{filtered.length}</div>
        </div>
      </div>

      {/* Category breakdown */}
      {catSummary.length > 0 && (
        <div className="card" style={{ marginBottom: 24, padding: 20 }}>
          <div className="sl" style={{ marginBottom: 16 }}>Desglose por Categoría</div>
          {catSummary.map(([cat, vals]) => (
            <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>{cat}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontFamily: 'JetBrains Mono', fontSize: 13 }}>
                {vals.ars > 0 && <span style={{ color: 'var(--text-2)' }}>$ {Math.round(vals.ars).toLocaleString()}</span>}
                {vals.usd > 0 && <span style={{ color: 'var(--text-2)' }}>U$ {vals.usd.toLocaleString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="filters-wrap no-print" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', padding: '4px 12px', borderRadius: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Desde:</span>
          <input type="date" className="inp" style={{ width: 'auto', background: 'transparent', border: 'none', padding: 0 }} value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', padding: '4px 12px', borderRadius: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Hasta:</span>
          <input type="date" className="inp" style={{ width: 'auto', background: 'transparent', border: 'none', padding: 0 }} value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        
        <select className="inp" style={{ width: 'auto', background: 'var(--surface-2)', border: 'none' }} value={filterDep} onChange={e => setFilterDep(e.target.value)}>
          <option value="all">Todos los depósitos</option>
          {deposits.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
        </select>
        <select className="inp" style={{ width: 'auto', background: 'var(--surface-2)', border: 'none' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="all">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        
        {(startDate || endDate || filterDep !== 'all' || filterCat !== 'all') && (
          <button className="btn-ghost" style={{ fontSize: 12, color: 'var(--text-3)' }} onClick={() => { setStartDate(''); setEndDate(''); setFilterDep('all'); setFilterCat('all'); }}>
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Expenses list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
          <TrendingDown size={36} style={{ marginBottom: 14, opacity: 0.3 }} />
          <div style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Sin gastos registrados</div>
          <div style={{ fontSize: 13 }}>Cargá tu primer gasto operativo para comenzar a llevar el control.</div>
        </div>
      ) : (
        <div className="tw">
          <table className="table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Depósito</th>
                <th>Monto</th>
                <th>Fecha</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{e.description}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Por: {e.seller_name || '—'}</div>
                  </td>
                  <td><span className="badge b-neu">{e.category}</span></td>
                  <td style={{ fontSize: 13 }}>{depName(e.deposit_id)}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--red)' }}>
                    {e.currency === 'USD' ? 'U$' : '$'} {e.amount?.toLocaleString()}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {e.created_at ? new Date(e.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : '—'}
                  </td>
                  <td>
                    <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => handleDelete(e.id)} title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New expense modal */}
      {showForm && (
        <div className="mo" style={{ zIndex: 1100 }} onClick={() => setShowForm(false)}>
          <div className="mb" onClick={e => e.stopPropagation()}>
            <div className="mh">
              <div>
                <div className="mh-title">Cargar Gasto</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>Registro de egreso operativo</div>
              </div>
              <button className="btn-icon" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div className="mbd" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="field">
                <label className="lbl">Descripción *</label>
                <input className="inp" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Ej: Sueldo cadete mayo, Alquiler local..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label className="lbl">Monto *</label>
                  <input className="inp" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="field">
                  <label className="lbl">Moneda</label>
                  <select className="inp" value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                    <option value="ARS">Pesos (ARS)</option>
                    <option value="USD">Dólar (USD)</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label className="lbl">Categoría</label>
                  <select className="inp" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="lbl">Depósito / Sucursal *</label>
                  <select className="inp" value={form.deposit_id} onChange={e => setForm(p => ({ ...p, deposit_id: e.target.value }))}>
                    {deposits.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowForm(false)}>Cancelar</button>
                <button className="btn btn-dark" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Guardando...' : 'Registrar Gasto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
