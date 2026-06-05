"use client"
import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Wrench, CheckCircle, PackageSearch, PackageOpen, XCircle, Printer } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function RepairsClient({ isOwner, user }: { isOwner: boolean, user: any }) {
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [q, setQ] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchRepairs();
  }, []);

  const fetchRepairs = async () => {
    setLoading(true);
    const { data } = await supabase.from('repairs').select('*').order('created_at', { ascending: false });
    if (data) setRepairs(data);
    setLoading(false);
  };

  const STATUSES = [
    { id: 'INGRESADO', label: 'Ingresado', color: 'var(--amber)' },
    { id: 'REVISION', label: 'En Revisión', color: 'var(--blue)' },
    { id: 'REPUESTO', label: 'Esp. Repuesto', color: 'var(--purple)' },
    { id: 'REPARADO', label: 'Reparado', color: 'var(--green)' },
    { id: 'ENTREGADO', label: 'Entregado', color: 'var(--text-3)' },
    { id: 'CANCELADO', label: 'Cancelado', color: 'var(--red)' }
  ];

  const getStatus = (id: string) => STATUSES.find(s => s.id === id) || STATUSES[0];

  const filtered = repairs.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (q) {
      const qs = q.toLowerCase();
      if (!r.customer_name?.toLowerCase().includes(qs) && 
          !r.device_model?.toLowerCase().includes(qs) && 
          !r.id?.toLowerCase().includes(qs)) return false;
    }
    return true;
  });

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title"><Wrench size={20} /> Servicio Técnico</h2>
        <button className="btn btn-dark" onClick={() => setShowNew(true)}><Plus size={16} /> Nuevo Ingreso</button>
      </div>

      <div className="filters-wrap">
        <button className={`btn-pill ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>Todos</button>
        {STATUSES.map(s => (
          <button key={s.id} className={`btn-pill ${filterStatus === s.id ? 'active' : ''}`} onClick={() => setFilterStatus(s.id)}>
            {s.label}
          </button>
        ))}
      </div>
      
      <input className="inp" style={{ marginBottom: 16 }} placeholder="Buscar por cliente, equipo o # de orden..." value={q} onChange={e => setQ(e.target.value)} />

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Cargando reparaciones...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-3)' }}>
          <PackageOpen size={36} style={{ marginBottom: 14, opacity: 0.3 }} />
          <div style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>No hay reparaciones</div>
        </div>
      ) : (
        <div className="tw">
          <table className="table">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Cliente</th>
                <th>Equipo</th>
                <th>Estado</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} onClick={() => setDetailItem(r)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--text-3)' }}>#{r.id.split('-')[0]}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.customer_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.customer_phone || 'Sin tel'}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{r.device_brand} {r.device_model}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Falla: {r.issue_description}</div>
                  </td>
                  <td>
                    <span className="badge" style={{ background: getStatus(r.status).color, color: '#fff', fontSize: 10 }}>
                      {getStatus(r.status).label}
                    </span>
                  </td>
                  <td><button className="btn-icon" onClick={e => { e.stopPropagation(); setDetailItem(r); }}><Edit2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <NewRepairModal onClose={() => setShowNew(false)} onSave={fetchRepairs} user={user} />}
      {detailItem && <RepairDetailModal repair={detailItem} onClose={() => setDetailItem(null)} onSave={fetchRepairs} user={user} isOwner={isOwner} STATUSES={STATUSES} />}
    </div>
  );
}

function NewRepairModal({ onClose, onSave, user }: any) {
  const [f, setF] = useState({
    customer_name: '', customer_phone: '',
    device_brand: 'Apple', device_model: '', device_color: '', device_password: '',
    issue_description: '', visual_condition: '',
    budget: '', deposit_paid: '', deposit_id: ''
  });
  const [deposits, setDeposits] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('deposits').select('id, name').then(({data}) => {
      if(data) {
        setDeposits(data);
        if(data.length > 0) setF(p => ({...p, deposit_id: String(data[0].id)}));
      }
    });
  }, []);

  const handleSave = async () => {
    if (!f.customer_name || !f.device_model || !f.issue_description) return toast.error('Completá los campos obligatorios');
    setSaving(true);
    try {
      const deposit_paid = parseFloat(f.deposit_paid) || 0;
      const budget = parseFloat(f.budget) || null;
      
      const { data: repData, error } = await supabase.from('repairs').insert([{
        customer_name: f.customer_name, customer_phone: f.customer_phone,
        device_brand: f.device_brand, device_model: f.device_model, device_color: f.device_color, device_password: f.device_password,
        issue_description: f.issue_description, visual_condition: f.visual_condition,
        budget, deposit_paid, deposit_id: deposit_paid > 0 ? parseInt(f.deposit_id) : null
      }]).select();
      if (error) throw error;

      if (deposit_paid > 0) {
        // Registrar movimiento en caja
        const saleData = {
          seller_id: user.id, seller_name: user.name,
          deposit_id: parseInt(f.deposit_id),
          brand: 'SERVICIO', model: 'SEÑA REPARACIÓN',
          storage: '-', color: '-', imei: `REP-${repData[0].id.split('-')[0]}`,
          cost_price: 0, price: deposit_paid, currency: 'ARS',
          payments: [{ id: 'ars_cash', amount: deposit_paid, original_amount: deposit_paid, label: 'Efectivo ARS (Seña)' }],
          customer: { name: f.customer_name, phone: f.customer_phone }
        };
        await supabase.from('sales').insert([saleData]);
      }

      toast.success('Orden creada');
      onSave();
      onClose();
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="mo">
      <div className="mb" style={{ maxWidth: 600 }}>
        <div className="mh">
          <div className="mh-title">Nueva Reparación</div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="mbd" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="row">
            <div className="col field"><label className="lbl">Cliente *</label><input className="inp" value={f.customer_name} onChange={e=>setF({...f, customer_name: e.target.value})} placeholder="Ej: Juan Perez" /></div>
            <div className="col field"><label className="lbl">Teléfono</label><input className="inp" value={f.customer_phone} onChange={e=>setF({...f, customer_phone: e.target.value})} placeholder="Ej: 112345678" /></div>
          </div>
          <div className="row">
            <div className="col field"><label className="lbl">Marca</label><input className="inp" value={f.device_brand} onChange={e=>setF({...f, device_brand: e.target.value})} /></div>
            <div className="col field"><label className="lbl">Modelo *</label><input className="inp" value={f.device_model} onChange={e=>setF({...f, device_model: e.target.value})} placeholder="Ej: iPhone 11" /></div>
          </div>
          <div className="row">
            <div className="col field"><label className="lbl">Color</label><input className="inp" value={f.device_color} onChange={e=>setF({...f, device_color: e.target.value})} /></div>
            <div className="col field"><label className="lbl">Contraseña/Pin (Opcional)</label><input className="inp" value={f.device_password} onChange={e=>setF({...f, device_password: e.target.value})} /></div>
          </div>
          <div className="field"><label className="lbl">Falla Reportada *</label><textarea className="inp" style={{ minHeight: 60, padding: '10px 14px' }} value={f.issue_description} onChange={e=>setF({...f, issue_description: e.target.value})} placeholder="No prende, cambiar pantalla..." /></div>
          <div className="field"><label className="lbl">Estado Visual (Opcional)</label><input className="inp" value={f.visual_condition} onChange={e=>setF({...f, visual_condition: e.target.value})} placeholder="Rayado atrás, vidrio roto..." /></div>
          
          <div style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="col field"><label className="lbl">Presupuesto Estimado ($)</label><input className="inp" type="number" value={f.budget} onChange={e=>setF({...f, budget: e.target.value})} placeholder="0" /></div>
            <div className="col field"><label className="lbl">Seña Dejada ($)</label><input className="inp" type="number" value={f.deposit_paid} onChange={e=>setF({...f, deposit_paid: e.target.value})} placeholder="0" /></div>
            {parseFloat(f.deposit_paid) > 0 && deposits.length > 0 && (
              <div className="col field"><label className="lbl">Ingresar seña a caja:</label>
                <select className="inp" value={f.deposit_id} onChange={e=>setF({...f, deposit_id: e.target.value})}>
                  {deposits.map(d=><option key={d.id} value={String(d.id)}>{d.name}</option>)}
                </select>
              </div>
            )}
          </div>
          
          <button className="btn btn-dark btn-lg" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Registrar Ingreso'}</button>
        </div>
      </div>
    </div>
  )
}

function RepairDetailModal({ repair, onClose, onSave, isOwner, STATUSES, user }: any) {
  const [f, setF] = useState(repair);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('repairs').update({
        status: f.status,
        assigned_technician: f.assigned_technician,
        budget: f.budget,
        notes: f.notes,
        updated_at: new Date().toISOString()
      }).eq('id', f.id);
      if (error) throw error;
      toast.success('Actualizado');
      onSave();
      onClose();
    } catch(e:any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  const handleDelete = async () => {
    if(!confirm('¿Eliminar orden?')) return;
    try {
      await supabase.from('repairs').delete().eq('id', f.id);
      toast.success('Eliminada');
      onSave();
      onClose();
    } catch(e:any) { toast.error(e.message); }
  }

  const printTicket = () => {
    const printWin = window.open('', '_blank');
    if(!printWin) return;
    printWin.document.write(`
      <html><head><title>Ticket Reparacion</title>
      <style>body { font-family: monospace; padding: 20px; max-width: 300px; } h2, h3 { margin: 5px 0; }</style>
      </head><body>
      <h2>ORDEN DE REPARACION</h2>
      <div>Fecha: ${new Date(repair.created_at).toLocaleDateString()}</div>
      <div>Orden: #${repair.id.split('-')[0]}</div>
      <hr/>
      <h3>Cliente</h3>
      <div>${repair.customer_name} - ${repair.customer_phone || ''}</div>
      <hr/>
      <h3>Equipo</h3>
      <div>${repair.device_brand} ${repair.device_model} ${repair.device_color ? `(${repair.device_color})` : ''}</div>
      <div>Falla: ${repair.issue_description}</div>
      ${repair.visual_condition ? `<div>Condición: ${repair.visual_condition}</div>` : ''}
      <hr/>
      <div>Seña dejada: $${repair.deposit_paid || 0}</div>
      <hr/>
      <div style="font-size: 10px; margin-top: 20px;">Firma cliente: ......................</div>
      <div style="font-size: 10px; margin-top: 20px;">Pasados los 90 dias no nos hacemos cargo del equipo.</div>
      <script>window.print(); window.close();</script>
      </body></html>
    `);
    printWin.document.close();
  }

  return (
    <div className="mo">
      <div className="mb" style={{ maxWidth: 600 }}>
        <div className="mh">
          <div className="mh-title">Orden #{repair.id.split('-')[0]}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-icon" onClick={printTicket} title="Imprimir Ticket"><Printer size={16} /></button>
            <button className="btn-icon" onClick={onClose}><X size={18} /></button>
          </div>
        </div>
        <div className="mbd" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Cliente</div>
              <div style={{ fontWeight: 600 }}>{repair.customer_name}</div>
              <div>{repair.customer_phone}</div>
            </div>
            <div style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Equipo</div>
              <div style={{ fontWeight: 600 }}>{repair.device_brand} {repair.device_model}</div>
              <div>Pin: {repair.device_password || 'Sin pin'}</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Falla reportada:</div>
            <div style={{ padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>{repair.issue_description}</div>
          </div>

          <div className="divider" />

          <div className="row">
            <div className="col field">
              <label className="lbl">Estado</label>
              <select className="inp" value={f.status} onChange={e=>setF({...f, status: e.target.value})}>
                {STATUSES.map((s:any)=><option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="col field">
              <label className="lbl">Técnico Asignado</label>
              <input className="inp" placeholder="Ej: Lucas (Externo)" value={f.assigned_technician || ''} onChange={e=>setF({...f, assigned_technician: e.target.value})} />
            </div>
          </div>

          <div className="row">
            <div className="col field">
              <label className="lbl">Presupuesto ($)</label>
              <input className="inp" type="number" value={f.budget || ''} onChange={e=>setF({...f, budget: e.target.value})} />
              {repair.deposit_paid > 0 && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Seña cobrada: ${repair.deposit_paid}</div>}
            </div>
          </div>

          <div className="field">
            <label className="lbl">Notas internas / Reparación realizada</label>
            <textarea className="inp" style={{ minHeight: 60 }} value={f.notes || ''} onChange={e=>setF({...f, notes: e.target.value})} placeholder="Se cambió pin de carga, todo ok..." />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            {isOwner && <button className="btn btn-ghost" style={{ color: 'var(--red)' }} onClick={handleDelete}>Eliminar</button>}
            <button className="btn btn-dark" style={{ flex: 1 }} onClick={handleUpdate} disabled={saving}>{saving ? 'Guardando...' : 'Guardar Cambios'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
