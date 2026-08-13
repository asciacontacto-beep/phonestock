"use client"
import { useState } from 'react';
import { Truck, Plus, Trash2, Edit2, Loader2, Check, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { useConfirm } from '@/hooks/useConfirm';

export function SuppliersClient({ initialSuppliers }: { initialSuppliers: any[] }) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editSup, setEditSup] = useState<any>(null);

  const [form, setForm] = useState({ name: '' });
  const supabase = createClient();

  async function addSupplier() {
    if (!form.name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('suppliers').insert({ name: form.name.trim() }).select().single();
    if (error) {
      toast.error('Error: ' + error.message);
    } else {
      setSuppliers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: '' });
      setShowAdd(false);
      toast.success('Proveedor creado');
    }
    setSaving(false);
  }

  async function saveEdit() {
    if (!editSup?.name?.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('suppliers').update({ name: editSup.name }).eq('id', editSup.id);
    if (error) {
      toast.error('Error: ' + error.message);
    } else {
      setSuppliers(prev => prev.map(s => s.id === editSup.id ? editSup : s));
      setEditSup(null);
      toast.success('Proveedor actualizado');
    }
    setSaving(false);
  }

  async function deleteSupplier(id: string) {
    if (!await confirm('¿Eliminar este proveedor? Se conservará en los productos que ya lo tengan asignado pero no aparecerá más en la lista.')) return;
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) {
      toast.error('Error: ' + error.message);
    } else {
      setSuppliers(prev => prev.filter(s => s.id !== id));
      toast.success('Proveedor eliminado');
    }
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div className="st">Gestión de Proveedores</div>
          <div className="ss2">Administra los proveedores disponibles para la carga de productos</div>
        </div>
        <button className="btn btn-dark" onClick={() => setShowAdd(true)}>
          <Plus size={18} /> Nuevo Proveedor
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        {suppliers.map((s: any) => (
          <div key={s.id} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `var(--surface-2)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={20} style={{ color: 'var(--text)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-pill" style={{ padding: '5px 8px' }} onClick={() => setEditSup({ ...s })}>
                  <Edit2 size={13} />
                </button>
                <button className="btn-pill" style={{ padding: '5px 8px', color: 'var(--red)' }} onClick={() => deleteSupplier(s.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {suppliers.length === 0 && (
          <div style={{ color: 'var(--text-3)', fontSize: 14 }}>
            No hay proveedores cargados.
          </div>
        )}
      </div>

      {ConfirmDialog}
      {showAdd && (
        <div className="mo">
          <div className="mb" style={{ maxWidth: 420 }}>
            <div className="mh">
              <div className="mt">Nuevo Proveedor</div>
              <button className="btn-ghost" onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>
            <div className="mbd">
              <div className="field">
                <label className="lbl">Nombre del Proveedor</label>
                <input className="inp" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Apple Distributor Inc." autoFocus />
              </div>
              <button className="btn btn-dark btn-lg" style={{ width: '100%', marginTop: 12 }} onClick={addSupplier} disabled={saving}>
                {saving ? <Loader2 size={18} className="spin" /> : <><Plus size={16} /> Crear Proveedor</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {editSup && (
        <div className="mo">
          <div className="mb" style={{ maxWidth: 420 }}>
            <div className="mh">
              <div className="mt">Editar Proveedor</div>
              <button className="btn-ghost" onClick={() => setEditSup(null)}><X size={18} /></button>
            </div>
            <div className="mbd">
              <div className="field">
                <label className="lbl">Nombre</label>
                <input className="inp" value={editSup.name} onChange={e => setEditSup({ ...editSup, name: e.target.value })} autoFocus />
              </div>
              <button className="btn btn-dark btn-lg" style={{ width: '100%', marginTop: 12 }} onClick={saveEdit} disabled={saving}>
                {saving ? <Loader2 size={18} className="spin" /> : <><Check size={16} /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
