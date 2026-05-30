"use client"
import { useState } from 'react';
import { UserPlus, Trash2, Shield, User as UserIcon, Loader2, Building2, Pencil, X, Check } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export function UsersClient({ initialUsers, deposits, currentOrgId }: { initialUsers: any[]; deposits: any[]; currentOrgId?: string | null }) {
  const [list, setList] = useState(initialUsers);
  const [showAdd, setShowAdd] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'seller', color: '#3b82f6', deposit_ids: [] as string[] });
  const supabase = createClient();

  const fetchUsers = async () => {
    let query = supabase.from('profiles').select('*').order('name');
    if (currentOrgId) {
      query = query.eq('org_id', currentOrgId);
    }
    const { data, error } = await query;
    if (!error && data) setList(data);
  };

  const toggleDepositInForm = (depId: string) => {
    setForm(p => ({
      ...p,
      deposit_ids: p.deposit_ids.includes(depId)
        ? p.deposit_ids.filter(id => id !== depId)
        : [...p.deposit_ids, depId]
    }));
  };

  const toggleDepositInEdit = (depId: string) => {
    setEditingUser((p: any) => ({
      ...p,
      deposit_ids: (p.deposit_ids || []).includes(depId)
        ? (p.deposit_ids || []).filter((id: string) => id !== depId)
        : [...(p.deposit_ids || []), depId]
    }));
  };

  const addUser = async () => {
    if (!form.name || !form.email || !form.password) return;
    try {
      setLoading(true);
      const initials = form.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

      const { data: authData } = await supabase.auth.getUser();
      let orgId = null;
      if (authData?.user) {
        const { data: currentProfile } = await supabase.from('profiles').select('org_id').eq('id', authData.user.id).single();
        orgId = currentProfile?.org_id;
      }

      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            name: form.name,
            role: form.role,
            initials,
            color: form.color,
            org_id: orgId
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          name: form.name,
          email: form.email,
          role: form.role,
          initials,
          color: form.color,
          org_id: orgId,
          deposit_ids: form.role === 'seller' ? form.deposit_ids : [],
        });
        if (profileError) console.warn('Profile upsert warning:', profileError.message);

        setShowAdd(false);
        setForm({ name: '', email: '', password: '', role: 'seller', color: '#3b82f6', deposit_ids: [] });
        toast.success('Usuario creado correctamente');
        await fetchUsers();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({
        deposit_ids: editingUser.role === 'seller' ? (editingUser.deposit_ids || []) : [],
      }).eq('id', editingUser.id);
      if (error) throw error;
      toast.success('Depósitos actualizados');
      setEditingUser(null);
      await fetchUsers();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const removeUser = async (id: any) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;

      await fetchUsers();
      toast.success('Usuario eliminado (o recargado según permisos)');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const depNames = (ids: string[]) => {
    if (!ids || ids.length === 0) return null;
    return ids.map(id => deposits.find(d => String(d.id) === String(id))?.name).filter(Boolean).join(', ');
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div className="st">Gestión de Usuarios</div>
          <div className="ss2">Control de acceso y asignación de depósitos</div>
        </div>
        <button className="btn btn-dark" onClick={() => setShowAdd(true)}>
          <UserPlus size={18} /> Crear Usuario
        </button>
      </div>

      <div className="tw">
        <table className="table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Email</th>
              <th>Depósitos asignados</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {list.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="u-row" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                    <div className="av" style={{ background: u.color, color: '#000', width: 32, height: 32 }}>{u.initials}</div>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                  </div>
                </td>
                <td>
                  <span className={`badge ${u.role === 'owner' ? 'b-amber' : 'b-neu'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    {u.role === 'owner' ? <Shield size={12} /> : <UserIcon size={12} />}
                    {u.role === 'owner' ? 'Administrador' : 'Vendedor'}
                  </span>
                </td>
                <td><span style={{ color: 'var(--text-3)' }}>{u.email || 'Acceso por Auth'}</span></td>
                <td>
                  {u.role === 'owner' ? (
                    <span style={{ color: 'var(--text-3)', fontSize: 12 }}>Acceso total</span>
                  ) : depNames(u.deposit_ids) ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                      <Building2 size={13} style={{ color: 'var(--text-3)' }} />
                      {depNames(u.deposit_ids)}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--amber)', fontSize: 12 }}>Sin asignar</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {u.role === 'seller' && (
                      <button className="btn-ghost" title="Editar depósitos" onClick={() => setEditingUser({ ...u, deposit_ids: u.deposit_ids || [] })}>
                        <Pencil size={14} />
                      </button>
                    )}
                    <button className="btn-ghost" onClick={() => removeUser(u.id)} style={{ color: 'var(--red)' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit deposits modal */}
      {editingUser && (
        <div className="mo" onClick={() => setEditingUser(null)}>
          <div className="mb" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="mh">
              <div className="mh-title">Depósitos de {editingUser.name}</div>
              <button className="btn-icon" onClick={() => setEditingUser(null)}><X size={18} /></button>
            </div>
            <div className="mbd" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Seleccioná uno o más depósitos donde opera este vendedor.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {deposits.map(d => {
                  const selected = (editingUser.deposit_ids || []).map(String).includes(String(d.id));
                  return (
                    <button
                      key={d.id}
                      onClick={() => toggleDepositInEdit(String(d.id))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 16px', borderRadius: 10,
                        background: selected ? 'var(--surface-3)' : 'var(--surface-2)',
                        border: selected ? '1px solid var(--text)' : '1px solid var(--border)',
                        color: 'var(--text)', cursor: 'pointer', textAlign: 'left', width: '100%'
                      }}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        background: selected ? 'var(--text)' : 'transparent',
                        border: selected ? 'none' : '1px solid var(--border-md)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {selected && <Check size={14} color="var(--bg)" />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{d.name}</div>
                        {d.address && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{d.address}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditingUser(null)}>Cancelar</button>
                <button className="btn btn-dark" style={{ flex: 1 }} onClick={saveEdit} disabled={loading}>
                  {loading ? <Loader2 className="spin" size={16} /> : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add user modal */}
      {showAdd && (
        <div className="mo">
          <div className="mb" style={{ maxWidth: 480 }}>
            <div className="mh">
              <div className="mt">Alta de Nuevo Acceso</div>
              <button className="btn-ghost" onClick={() => setShowAdd(false)}>×</button>
            </div>
            <div className="mbd">
              <div className="field">
                <label className="lbl">Nombre y Apellido</label>
                <input className="inp" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Roberto Gomez" />
              </div>
              <div className="row">
                <div className="col field">
                  <label className="lbl">Email de Acceso</label>
                  <input className="inp" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="vendedor@tienda.com" />
                </div>
                <div className="col field">
                  <label className="lbl">Contraseña</label>
                  <input className="inp" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
                </div>
              </div>
              <div className="field">
                <label className="lbl">Rol en el sistema</label>
                <select className="inp" value={form.role} onChange={e => setForm({ ...form, role: e.target.value, deposit_ids: [] })}>
                  <option value="seller">Vendedor (Acceso limitado)</option>
                  <option value="owner">Administrador (Acceso total)</option>
                </select>
              </div>

              {form.role === 'seller' && deposits.length > 0 && (
                <div className="field">
                  <label className="lbl">Depósitos asignados <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(puede ser más de uno)</span></label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {deposits.map(d => {
                      const selected = form.deposit_ids.includes(String(d.id));
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleDepositInForm(String(d.id))}
                          style={{
                            padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                            background: selected ? 'var(--text)' : 'var(--surface-2)',
                            color: selected ? 'var(--bg)' : 'var(--text)',
                            border: selected ? 'none' : '1px solid var(--border)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                          }}
                        >
                          {selected && <Check size={12} />} {d.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="field">
                <label className="lbl">Color Distintivo</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['#d4d4d8', '#10b981', '#3b82f6', '#f43f5e', '#f59e0b', '#8b5cf6'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      style={{
                        width: 32, height: 32, borderRadius: '50%', background: c,
                        border: form.color === c ? '2px solid var(--text)' : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>
              <button className="btn btn-dark btn-lg" style={{ width: '100%', marginTop: 10 }} onClick={addUser} disabled={loading}>
                {loading ? <Loader2 className="spin" size={20} /> : 'Crear Acceso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
