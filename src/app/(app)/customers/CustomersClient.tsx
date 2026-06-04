"use client"
import { useState } from 'react';
import { Search, User, Phone, Mail, CreditCard, ShoppingBag, ChevronRight, X, TrendingUp, Instagram, Edit2, Trash2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function CustomersClient({ initialCustomers, initialSales }: { initialCustomers: any[], initialSales: any[] }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [sales, setSales] = useState(initialSales);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();

  const filtered = customers.filter(c =>
    !q || `${c.name} ${c.dni} ${c.phone} ${c.email}`.toLowerCase().includes(q.toLowerCase())
  );

  const custSales = (c: any) =>
    sales.filter(s =>
      (c.dni && s.customer?.dni === c.dni) ||
      (!c.dni && s.customer?.name === c.name)
    );

  const totalSpent = (c: any) =>
    custSales(c).reduce((a: number, s: any) => {
      if (s.currency === 'USD') return a + s.price;
      return a;
    }, 0);

  const lastSale = (c: any) => {
    const sl = custSales(c);
    return sl.length > 0 ? sl[0] : null;
  };

  const handleUpdate = async () => {
    if (!editData.name) { toast.error('El nombre es obligatorio'); return; }
    try {
      setLoading(true);
      const { error } = await supabase.from('customers').update({
        name: editData.name,
        dni: editData.dni || null,
        phone: editData.phone || null,
        email: editData.email || null,
        instagram: editData.instagram || null,
      }).eq('id', selected.id);
      
      if (error) throw error;
      
      const updated = { ...selected, ...editData };
      setCustomers(c => c.map(x => x.id === selected.id ? updated : x));
      setSelected(updated);
      setIsEditing(false);
      toast.success('Cliente actualizado');
      router.refresh();
    } catch(e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este cliente permanentemente? Sus ventas seguirán existiendo pero no estarán asociadas a él.')) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('customers').delete().eq('id', selected.id);
      if (error) throw error;
      
      setCustomers(c => c.filter(x => x.id !== selected.id));
      setSelected(null);
      toast.success('Cliente eliminado');
      router.refresh();
    } catch(e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="page">
      <div className="sh" style={{ marginBottom: 24 }}>
        <h1 className="st">Clientes</h1>
        <p className="helper-text">Historial de clientes registrados automáticamente con cada venta.</p>
      </div>

      <div className="sg" style={{ marginBottom: 28 }}>
        <div className="sc">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="sl">Total Clientes</div>
              <div className="sv">{customers.length}</div>
            </div>
            <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 12 }}>
              <User size={20} color="var(--text-dim)" />
            </div>
          </div>
        </div>
        <div className="sc">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="sl">Con 2+ compras</div>
              <div className="sv">{customers.filter(c => custSales(c).length >= 2).length}</div>
            </div>
            <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 12 }}>
              <TrendingUp size={20} color="var(--green)" />
            </div>
          </div>
        </div>
        <div className="sc">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="sl">Con contacto</div>
              <div className="sv">{customers.filter(c => c.phone || c.email).length}</div>
            </div>
            <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 12 }}>
              <Phone size={20} color="var(--text-dim)" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-3)' }} />
        <input
          className="inp"
          style={{ paddingLeft: 40 }}
          placeholder="Buscar por nombre, DNI, teléfono..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
            <User size={48} style={{ opacity: 0.2, margin: '0 auto 16px', display: 'block' }} />
            <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>
              {q ? 'Sin resultados' : 'Aún no hay clientes registrados'}
            </div>
            <div style={{ fontSize: 13, marginTop: 8, maxWidth: 300, margin: '8px auto 0' }}>
              {q ? 'Probá con otro término de búsqueda' : 'Los clientes se guardan automáticamente al completar una venta.'}
            </div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contacto</th>
                <th>DNI / CUIT</th>
                <th>Compras</th>
                <th>Última compra</th>
                <th>Total USD</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const sl = custSales(c);
                const ls = lastSale(c);
                const ts = totalSpent(c);
                return (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(c)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: `hsl(${(c.name.charCodeAt(0) * 37) % 360}, 60%, 35%)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 13, flexShrink: 0, color: '#fff'
                        }}>
                          {c.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                        {c.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={10} style={{ opacity: 0.5 }} /> {c.phone}</div>}
                        {c.email && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={10} style={{ opacity: 0.5 }} /> {c.email}</div>}
                        {!c.phone && !c.email && <span style={{ color: 'var(--text-3)' }}>—</span>}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: 13 }}>
                      {c.dni || <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td>
                      <span className={`badge ${sl.length >= 2 ? 'b-green' : 'b-neu'}`}>
                        {sl.length} {sl.length === 1 ? 'compra' : 'compras'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>
                      {ls ? new Date(ls.created_at).toLocaleDateString('es-AR') : '—'}
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                      {ts > 0 ? `U$ ${ts.toLocaleString()}` : <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td><ChevronRight size={16} color="var(--text-3)" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="mo" style={{ zIndex: 200 }} onClick={() => setSelected(null)}>
          <div className="mb" style={{ maxWidth: 520, marginLeft: 'auto', marginRight: 0, height: '100vh', borderRadius: '16px 0 0 16px', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div className="mh" style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="mt" style={{ fontWeight: 600 }}>Perfil de Cliente</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {!isEditing && (
                  <>
                    <button className="btn-icon" onClick={() => { setEditData(selected); setIsEditing(true); }}><Edit2 size={16} /></button>
                    <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={handleDelete}><Trash2 size={16} /></button>
                  </>
                )}
                <button className="btn-ghost" onClick={() => { setSelected(null); setIsEditing(false); }} style={{ padding: '6px' }}><X size={18} /></button>
              </div>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: `hsl(${(selected.name.charCodeAt(0) * 37) % 360}, 60%, 35%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 22, color: '#fff', flexShrink: 0
                }}>
                  {selected.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 20 }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                    Cliente desde {new Date(selected.created_at).toLocaleDateString('es-AR')}
                  </div>
                </div>
              </div>

              {isEditing ? (
                <div className="card" style={{ marginBottom: 20, padding: 16, background: 'var(--surface-3)' }}>
                  <div className="sl" style={{ marginBottom: 16, fontSize: 12 }}>EDITAR DATOS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label className="lbl">Nombre</label>
                      <input className="inp" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="lbl">DNI / CUIT</label>
                      <input className="inp" value={editData.dni || ''} onChange={e => setEditData({...editData, dni: e.target.value})} />
                    </div>
                    <div>
                      <label className="lbl">Teléfono</label>
                      <input className="inp" value={editData.phone || ''} onChange={e => setEditData({...editData, phone: e.target.value})} />
                    </div>
                    <div>
                      <label className="lbl">Email</label>
                      <input className="inp" value={editData.email || ''} onChange={e => setEditData({...editData, email: e.target.value})} />
                    </div>
                    <div>
                      <label className="lbl">Instagram (sin @)</label>
                      <input className="inp" placeholder="ej: juanperez" value={editData.instagram || ''} onChange={e => setEditData({...editData, instagram: e.target.value.replace('@', '')})} />
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                      <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setIsEditing(false)}>Cancelar</button>
                      <button className="btn btn-dark" style={{ flex: 1 }} onClick={handleUpdate} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card" style={{ marginBottom: 20, padding: 16, background: 'var(--surface-3)' }}>
                  <div className="sl" style={{ marginBottom: 12, fontSize: 12 }}>DATOS DE CONTACTO</div>
                  {[
                    { icon: <CreditCard size={14} />, label: 'DNI / CUIT', val: selected.dni },
                    { icon: <Phone size={14} />, label: 'Teléfono', val: selected.phone },
                    { icon: <Mail size={14} />, label: 'Email', val: selected.email },
                    { icon: <Instagram size={14} />, label: 'Instagram', val: selected.instagram, isLink: true },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ color: 'var(--text-3)', width: 16 }}>{r.icon}</div>
                      <span style={{ color: 'var(--text-3)', fontSize: 12, width: 70 }}>{r.label}</span>
                      {r.isLink && r.val ? (
                        <a href={`https://instagram.com/${r.val}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)', textDecoration: 'none' }}>
                          @{r.val}
                        </a>
                      ) : (
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{r.val || '—'}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="sl" style={{ marginBottom: 12, fontSize: 12 }}>
                <ShoppingBag size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                HISTORIAL DE COMPRAS ({custSales(selected).length})
              </div>
              {custSales(selected).length === 0 ? (
                <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '16px 0' }}>Sin ventas registradas.</div>
              ) : (
                custSales(selected).map((s: any, i: number) => (
                  <div key={i} className="card" style={{ marginBottom: 12, padding: 14, background: 'var(--surface-3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700 }}>{s.brand} {s.model}</div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--green)' }}>
                        {s.currency === 'USD' ? 'U$' : '$'} {s.price?.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {s.storage} · {s.color} · IMEI: {s.imei}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                      {new Date(s.created_at).toLocaleString('es-AR')} — Vendedor: {s.seller_name}
                    </div>
                    {s.payments?.map((p: any, j: number) => (
                      <span key={j} className="badge b-neu" style={{ marginRight: 4, marginTop: 6, fontSize: 10 }}>{p.label}: {s.currency === 'USD' ? 'U$' : '$'} {p.amount}</span>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
