"use client"
import { useState, useEffect } from 'react';
import { CheckCircle, Trash2, Building2, Users, Clock, RefreshCw, ShieldAlert, CreditCard, AlertTriangle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { useConfirm } from '@/hooks/useConfirm';

export function SuperAdminClient() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const supabase = createClient();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_all_organizations');
    if (!error && data) setOrgs(data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    else if (error) toast.error('Error cargando negocios');
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const activate = async (orgId: string) => {
    if (!await confirm('¿Activar este negocio? El trial quedará activo indefinidamente.')) return;
    setActionId(orgId);
    await supabase.rpc('activate_organization', { org_id: orgId });
    await load();
    setActionId(null);
  };

  const deleteOrg = async (orgId: string, orgName: string) => {
    if (!await confirm(`¿Borrar "${orgName}" y TODOS sus datos? Esta acción es irreversible.`)) return;
    setActionId(orgId);
    await supabase.rpc('delete_organization', { org_id: orgId });
    await load();
    setActionId(null);
  };

  const trialInfo = (org: any) => {
    if (!org.trial_expires_at) return { label: 'Sin vencimiento', color: 'var(--text-3)', urgent: false, expired: false };
    const diff = new Date(org.trial_expires_at).getTime() - Date.now();
    const hours = Math.floor(diff / 1000 / 3600);
    if (diff < 0) return { label: 'VENCIDO', color: 'var(--red)', urgent: true, expired: true };
    if (hours < 24) return { label: `${hours}h restantes`, color: 'var(--red)', urgent: true, expired: false };
    const days = Math.ceil(diff / 1000 / 3600 / 24);
    return { label: `${days} días`, color: days <= 3 ? 'var(--amber)' : 'var(--text-2)', urgent: days <= 3, expired: false };
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtFull = (d: string) => new Date(d).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const active = orgs.filter(o => o.plan === 'active');
  const trial = orgs.filter(o => o.plan !== 'active').sort((a, b) => {
    const aExp = a.trial_expires_at ? new Date(a.trial_expires_at).getTime() : Infinity;
    const bExp = b.trial_expires_at ? new Date(b.trial_expires_at).getTime() : Infinity;
    return aExp - bExp;
  });
  const expired = trial.filter(o => o.trial_expires_at && new Date(o.trial_expires_at).getTime() < Date.now());

  return (
    <div className="page">
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <ShieldAlert size={20} color="var(--amber)" />
            <div className="st" style={{ margin: 0 }}>Panel Superadmin</div>
          </div>
          <div className="ss2">Gestión de todos los negocios registrados en Stackr.</div>
        </div>
        <button className="btn btn-outline" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="sg" style={{ marginBottom: 28 }}>
        {[
          { label: 'Total', value: orgs.length, icon: <Building2 size={18} />, color: 'var(--text-2)' },
          { label: 'Pagos', value: active.length, icon: <CreditCard size={18} />, color: 'var(--green)' },
          { label: 'En Trial', value: trial.length - expired.length, icon: <Clock size={18} />, color: 'var(--amber)' },
          { label: 'Vencidos', value: expired.length, icon: <AlertTriangle size={18} />, color: 'var(--red)' },
          { label: 'Usuarios', value: orgs.reduce((a, o) => a + (o.user_count || 0), 0), icon: <Users size={18} />, color: 'var(--blue)' },
        ].map(s => (
          <div key={s.label} className="sc">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="sl">{s.label}</div>
                <div className="sv">{loading ? '—' : s.value}</div>
              </div>
              <div style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 10, color: s.color }}>
                {s.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-3)' }}>Cargando...</div>
      ) : (
        <>
          {/* Pagos */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <CreditCard size={16} color="var(--green)" />
              <span style={{ fontWeight: 700, fontSize: 15 }}>Pagos ({active.length})</span>
            </div>
            {active.length === 0 ? (
              <div className="card" style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                Ningún negocio pago todavía.
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Negocio</th>
                      <th>Email owner</th>
                      <th>Usuarios</th>
                      <th>Registrado</th>
                      <th>Activado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.map(org => (
                      <tr key={org.id} style={{ opacity: actionId === org.id ? 0.5 : 1 }}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{org.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono' }}>{org.id.substring(0, 12)}…</div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{org.owner_email || '—'}</td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                            <Users size={11} color="var(--text-3)" /> {org.user_count}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{fmt(org.created_at)}</td>
                        <td style={{ fontSize: 12, color: 'var(--green)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={12} /> Activo
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-icon"
                            onClick={() => deleteOrg(org.id, org.name)}
                            disabled={actionId === org.id}
                            style={{ color: 'var(--red)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Trial */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Clock size={16} color="var(--amber)" />
              <span style={{ fontWeight: 700, fontSize: 15 }}>En Trial ({trial.length})</span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>— ordenados por vencimiento</span>
            </div>
            {trial.length === 0 ? (
              <div className="card" style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                Ningún negocio en trial.
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Negocio</th>
                      <th>Email owner</th>
                      <th>Usuarios</th>
                      <th>Registrado</th>
                      <th>Vence</th>
                      <th>Restante</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trial.map(org => {
                      const info = trialInfo(org);
                      const busy = actionId === org.id;
                      return (
                        <tr key={org.id} style={{ opacity: busy ? 0.5 : 1, background: info.expired ? 'rgba(239,68,68,0.04)' : undefined }}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{org.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono' }}>{org.id.substring(0, 12)}…</div>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{org.owner_email || '—'}</td>
                          <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                              <Users size={11} color="var(--text-3)" /> {org.user_count}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{fmt(org.created_at)}</td>
                          <td style={{ fontSize: 12, color: info.expired ? 'var(--red)' : 'var(--text-2)' }}>
                            {org.trial_expires_at ? fmtFull(org.trial_expires_at) : '—'}
                          </td>
                          <td>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                              background: `${info.color}18`, color: info.color,
                              animation: info.urgent ? 'pulse 2s infinite' : undefined,
                            }}>
                              {info.label}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className="btn btn-sm btn-dark"
                                onClick={() => activate(org.id)}
                                disabled={busy}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}
                              >
                                <CheckCircle size={11} /> Activar
                              </button>
                              <button
                                className="btn-icon"
                                onClick={() => deleteOrg(org.id, org.name)}
                                disabled={busy}
                                style={{ color: 'var(--red)' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <div style={{ marginTop: 20, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 11, color: 'var(--text-3)' }}>
        Los trials vencidos son eliminados automáticamente por pg_cron cada hora. Activar cancela el vencimiento.
      </div>
      {ConfirmDialog}
    </div>
  );
}
