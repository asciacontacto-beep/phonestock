"use client"
import { useState, useEffect } from 'react';
import { Warehouse, Plus, Trash2, Edit2, ArrowLeftRight, Loader2, Check, X, Package } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

const DEPOSIT_COLORS = ['#d4d4d8', '#10b981', '#3b82f6', '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

export function DepositsClient({ initialStock, initialDeposits }: { initialStock: any[], initialDeposits: any[] }) {
  const [stock, setStock] = useState(initialStock);
  const [deposits, setDeposits] = useState(initialDeposits);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editDep, setEditDep] = useState<any>(null);
  const [transferModal, setTransferModal] = useState<any>(null); 
  const [transferring, setTransferring] = useState(false);
  const [selectedDep, setSelectedDep] = useState<number | 'all'>('all');

  const [form, setForm] = useState({ name: '', color: '#10b981' });
  const supabase = createClient();

  async function addDeposit() {
    if (!form.name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('deposits').insert({ name: form.name.trim(), color: form.color }).select().single();
    if (error) {
      toast.error('Error: ' + error.message);
    } else {
      setDeposits(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: '', color: '#10b981' });
      setShowAdd(false);
      toast.success('Depósito creado');
    }
    setSaving(false);
  }

  async function saveEdit() {
    if (!editDep?.name?.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('deposits').update({ name: editDep.name, color: editDep.color }).eq('id', editDep.id);
    if (error) {
      toast.error('Error: ' + error.message);
    } else {
      setDeposits(prev => prev.map(d => d.id === editDep.id ? editDep : d));
      setEditDep(null);
      toast.success('Depósito actualizado');
    }
    setSaving(false);
  }

  async function deleteDeposit(id: number) {
    const count = stock.filter((s: any) => s.deposit === id && s.status === 'available').length;
    if (count > 0) {
      toast.error(`Este depósito tiene ${count} equipos. Transferilos antes de eliminarlo.`);
      return;
    }
    if (!confirm('¿Eliminar este depósito?')) return;
    const { error } = await supabase.from('deposits').delete().eq('id', id);
    if (error) {
      toast.error('Error: ' + error.message);
    } else {
      setDeposits(prev => prev.filter(d => d.id !== id));
      toast.success('Depósito eliminado');
    }
  }

  async function transferItem(item: any, toDepositId: number) {
    setTransferring(true);
    const { error } = await supabase.from('stock').update({ deposit: toDepositId }).eq('id', item.id);
    if (error) {
      toast.error('Error al transferir: ' + error.message);
    } else {
      setStock((prev: any[]) => prev.map(s => s.id === item.id ? { ...s, deposit: toDepositId } : s));
      const destName = deposits.find((d: any) => d.id === toDepositId)?.name ?? '';
      toast.success(`${item.brand} ${item.model} transferido a ${destName}`);
      setTransferModal(null);
    }
    setTransferring(false);
  }

  const depStock = (depId: number) => stock.filter((s: any) => s.deposit === depId && s.status === 'available');

  const filteredStock = selectedDep === 'all'
    ? stock.filter((s: any) => s.status === 'available')
    : stock.filter((s: any) => s.deposit === selectedDep && s.status === 'available');

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div className="st">Gestión de Depósitos</div>
          <div className="ss2">Ubicaciones, transferencias y distribución de stock</div>
        </div>
        <button className="btn btn-dark" onClick={() => setShowAdd(true)}>
          <Plus size={18} /> Nuevo Depósito
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        {deposits.map((d: any) => {
          const items = depStock(d.id);
          const valUsd = items.filter((s: any) => s.currency === 'USD' && s.cost_price).reduce((a: any, b: any) => a + (b.cost_price || 0), 0);
          const valArs = items.filter((s: any) => s.currency === 'ARS' && s.cost_price).reduce((a: any, b: any) => a + (b.cost_price || 0), 0);
          return (
            <div key={d.id} className="card" style={{ padding: 0, overflow: 'hidden', border: selectedDep === d.id ? `2px solid ${d.color}` : '1px solid var(--border)' }}>
              <div style={{ height: 4, background: d.color }} />
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${d.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Warehouse size={20} style={{ color: d.color }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{d.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{items.length} equipos disponibles</div>
                      {(valUsd > 0 || valArs > 0) && (
                        <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>
                          Capital: {valUsd > 0 ? `U$ ${valUsd.toLocaleString()}` : ''}
                          {valUsd > 0 && valArs > 0 ? ' + ' : ''}
                          {valArs > 0 ? `$ ${valArs.toLocaleString()}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-pill" style={{ padding: '5px 8px' }} onClick={() => setEditDep({ ...d })}>
                      <Edit2 size={13} />
                    </button>
                    <button className="btn-pill" style={{ padding: '5px 8px', color: 'var(--red)' }} onClick={() => deleteDeposit(d.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <button
                  className={`btn-pill ${selectedDep === d.id ? 'active' : ''}`}
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setSelectedDep(selectedDep === d.id ? 'all' : d.id)}
                >
                  <Package size={13} /> Ver equipos
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="sl">
          {selectedDep === 'all' ? 'Todo el Stock' : `Stock en: ${deposits.find((d: any) => d.id === selectedDep)?.name}`}
          <span style={{ marginLeft: 8, color: 'var(--text-3)', fontSize: 13 }}>({filteredStock.length} equipos)</span>
        </div>
        {selectedDep !== 'all' && (
          <button className="btn-pill" onClick={() => setSelectedDep('all')}>Ver todos</button>
        )}
      </div>

      <div className="tw">
        <table className="table">
          <thead>
            <tr>
              <th>Equipo</th>
              <th>IMEI</th>
              <th>Precio</th>
              <th>Depósito</th>
              <th>Transferir</th>
            </tr>
          </thead>
          <tbody>
            {filteredStock.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
                  No hay equipos disponibles
                </td>
              </tr>
            ) : filteredStock.map((s: any) => {
              const dep = deposits.find((d: any) => d.id === s.deposit);
              return (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.brand} {s.model}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.storage} · {s.color}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-3)', fontSize: 12 }}>{s.imei}</td>
                  <td style={{ fontWeight: 700 }}>{s.currency === 'USD' ? 'U$' : '$'} {s.price?.toLocaleString()}</td>
                  <td>
                    {dep ? (
                      <span className="badge b-neu" style={{ borderLeft: `3px solid ${dep.color}` }}>
                        {dep.name}
                      </span>
                    ) : <span className="badge b-neu">Sin asignar</span>}
                  </td>
                  <td>
                    <button
                      className="btn-pill"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      onClick={() => setTransferModal({ item: s, toDepositId: deposits.find((d: any) => d.id !== s.deposit)?.id ?? null })}
                    >
                      <ArrowLeftRight size={13} /> Transferir
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="mo">
          <div className="mb" style={{ maxWidth: 420 }}>
            <div className="mh">
              <div className="mt">Nuevo Depósito</div>
              <button className="btn-ghost" onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>
            <div className="mbd">
              <div className="field">
                <label className="lbl">Nombre del Depósito</label>
                <input className="inp" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Sucursal Centro" autoFocus />
              </div>
              <div className="field">
                <label className="lbl">Color Identificador</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {DEPOSIT_COLORS.map(c => (
                    <button key={c} onClick={() => setForm({ ...form, color: c })}
                      style={{ width: 34, height: 34, borderRadius: '50%', background: c, border: form.color === c ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
              <button className="btn btn-dark btn-lg" style={{ width: '100%', marginTop: 12 }} onClick={addDeposit} disabled={saving}>
                {saving ? <Loader2 size={18} className="spin" /> : <><Plus size={16} /> Crear Depósito</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {editDep && (
        <div className="mo">
          <div className="mb" style={{ maxWidth: 420 }}>
            <div className="mh">
              <div className="mt">Editar Depósito</div>
              <button className="btn-ghost" onClick={() => setEditDep(null)}><X size={18} /></button>
            </div>
            <div className="mbd">
              <div className="field">
                <label className="lbl">Nombre</label>
                <input className="inp" value={editDep.name} onChange={e => setEditDep({ ...editDep, name: e.target.value })} />
              </div>
              <div className="field">
                <label className="lbl">Color</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {DEPOSIT_COLORS.map(c => (
                    <button key={c} onClick={() => setEditDep({ ...editDep, color: c })}
                      style={{ width: 34, height: 34, borderRadius: '50%', background: c, border: editDep.color === c ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
              <button className="btn btn-dark btn-lg" style={{ width: '100%', marginTop: 12 }} onClick={saveEdit} disabled={saving}>
                {saving ? <Loader2 size={18} className="spin" /> : <><Check size={16} /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {transferModal && (
        <div className="mo">
          <div className="mb" style={{ maxWidth: 440 }}>
            <div className="mh">
              <div className="mt">Transferir Equipo</div>
              <button className="btn-ghost" onClick={() => setTransferModal(null)}><X size={18} /></button>
            </div>
            <div className="mbd">
              <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{transferModal.item.brand} {transferModal.item.model}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{transferModal.item.storage} · {transferModal.item.color} · {transferModal.item.imei}</div>
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  Actualmente en: <strong style={{ color: deposits.find((d: any) => d.id === transferModal.item.deposit)?.color }}>
                    {deposits.find((d: any) => d.id === transferModal.item.deposit)?.name ?? 'Sin asignar'}
                  </strong>
                </div>
              </div>

              <div className="field">
                <label className="lbl">Mover a depósito:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {deposits.filter((d: any) => d.id !== transferModal.item.deposit).map((d: any) => (
                    <button
                      key={d.id}
                      className={`btn-pill ${transferModal.toDepositId === d.id ? 'active' : ''}`}
                      style={{ justifyContent: 'flex-start', gap: 10, padding: '10px 14px' }}
                      onClick={() => setTransferModal({ ...transferModal, toDepositId: d.id })}
                    >
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600 }}>{d.name}</span>
                      <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 12 }}>
                        {depStock(d.id).length} equipos
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="btn btn-dark btn-lg"
                style={{ width: '100%', marginTop: 16 }}
                disabled={!transferModal.toDepositId || transferring}
                onClick={() => transferItem(transferModal.item, transferModal.toDepositId)}
              >
                {transferring ? <Loader2 size={18} className="spin" /> : <><ArrowLeftRight size={16} /> Confirmar Transferencia</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
