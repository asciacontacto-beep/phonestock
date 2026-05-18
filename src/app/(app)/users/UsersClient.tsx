"use client"
import { useState } from 'react';
import { UserPlus, Trash2, Shield, User as UserIcon, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export function UsersClient({ initialUsers }: { initialUsers: any[] }) {
  const [list, setList] = useState(initialUsers);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'seller', color: '#3b82f6' });
  const supabase = createClient();

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('name');
    if (!error && data) {
      setList(data);
    }
  };

  const addUser = async () => {
    if (!form.name || !form.email || !form.password) return;
    
    try {
      setLoading(true);
      const initials = form.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            name: form.name,
            role: form.role,
            initials: initials,
            color: form.color
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
        });

        if (profileError) {
          console.warn('Profile upsert warning:', profileError.message);
        }

        setShowAdd(false);
        setForm({ name: '', email: '', password: '', role: 'seller', color: '#3b82f6' });
        toast.success('Usuario creado correctamente');
        await fetchUsers();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  const removeUser = async (id: any) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;

      const { data: updated } = await supabase.from('profiles').select('*').order('name');
      const newList = updated ?? [];
      setList(newList);

      const stillExists = newList.some((u: any) => u.id === id);
      if (stillExists) {
        toast.error('El usuario no se borró de la base de datos por permisos RLS.');
      } else {
        toast.success('Usuario eliminado');
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div className="st">Gestión de Usuarios</div>
          <div className="ss2">Control de acceso y perfiles</div>
        </div>
        <button className="btn btn-dark" onClick={() => setShowAdd(true)}>
          <UserPlus size={18} /> Crear Usuario Acceso
        </button>
      </div>

      <div className="tw">
        <table className="table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Email</th>
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
                  <button className="btn-ghost" onClick={() => removeUser(u.id)} style={{ color: 'var(--red)' }}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="mo">
          <div className="mb" style={{ maxWidth: 450 }}>
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
                <select className="inp" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="seller">Vendedor (Acceso limitado)</option>
                  <option value="owner">Administrador (Acceso total)</option>
                </select>
              </div>
              <div className="field">
                <label className="lbl">Color Distintivo</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['#d4d4d8', '#10b981', '#3b82f6', '#f43f5e', '#f59e0b', '#8b5cf6'].map(c => (
                    <button 
                      key={c} 
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
