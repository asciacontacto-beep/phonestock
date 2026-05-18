"use client"
import { useState, useEffect } from 'react';
import { CheckCircle, Trash2, Building2, Users, Clock, RefreshCw, ShieldAlert } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export function SuperAdminClient() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const supabase = createClient();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_all_organizations');
    if (!error && data) setOrgs(data);
    else if (error) toast.error('Error loading orgs');
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const activate = async (orgId: string) => {
    if (!confirm('¿Activar este negocio? El trial quedará activo indefinidamente.')) return;
    setActionId(orgId);
    await supabase.rpc('activate_organization', { org_id: orgId });
    await load();
    setActionId(null);
  };

  const deleteOrg = async (orgId: string, orgName: string) => {
    if (!confirm(`¿Borrar "${orgName}" y TODOS sus datos? Esta acción es irreversible.`)) return;
    setActionId(orgId);
    await supabase.rpc('delete_organization', { org_id: orgId });
    await load();
    setActionId(null);
  };

  const trialStatus = (org: any) => {
    if (org.plan === 'active') return { label: 'Activo', color: 'var(--green)', urgent: false };
    if (!org.trial_expires_at) return { label: 'Trial', color: 'var(--amber)', urgent: false };
    const diff = new Date(org.trial_expires_at).getTime() - Date.now();
    const hours = Math.floor(diff / 1000 / 3600);
    if (diff < 0) return { label: 'VENCIDO', color: 'var(--red)', urgent: true };
    if (hours < 12) return { label: `${hours}h restantes`, color: 'var(--red)', urgent: true };
    const days = Math.ceil(diff / 1000 / 3600 / 24);
    return { label: `${days}d restantes`, color: 'var(--amber)', urgent: false };
  };

  return (
    <div className="page">
      <div className="sh" style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <ShieldAlert size={20} color="var(--amber)" />
            <h1 className="st" style={{ margin: 0 }}>Panel Superadmin</h1>
          </div>
          <p className="helper-text">Gestión de todos los negocios registrados en Stackr.</p>
        </div>
        <button className="btn btn-outline" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      <div className="sg" style={{ marginBottom: 28 }}>
        <div className="sc">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="sl">Total Negocios</div>
              <div className="sv">{orgs.length}</div>
            </div>
            <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 12 }}>
              <Building2 size={20} color="var(--text-dim)" />
            </div>
          </div>
        </div>
        <div className="sc">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="sl">Activos (Pagos)</div>
              <div className="sv">{orgs.filter(o => o.plan === 'active').length}</div>
            </div>
            <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 12 }}>
              <CheckCircle size={20} color="var(--green)" />
            </div>
          </div>
        </div>
        <div className="sc">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="sl">En Trial</div>
              <div className="sv">{orgs.filter(o => o.plan === 'trial').length}</div>
            </div>
            <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 12 }}>
              <Clock size={20} color="var(--amber)" />
            </div>
          </div>
        </div>
        <div className="sc">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="sl">Usuarios Totales</div>
              <div className="sv">{orgs.reduce((a, o) => a + (o.user_count || 0), 0)}</div>
            </div>
            <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 12 }}>
              <Users size={20} color="var(--text-dim)" />
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-3)' }}>Cargando...</div>
        ) : orgs.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-3)' }}>
            <Building2 size={40} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
            Ningún negocio registrado aún.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Negocio</th>
                <th>Usuario(s)</th>
                <th>Registrado</th>
                <th>Trial vence</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org: any) => {
                const status = trialStatus(org);
                const busy = actionId === org.id;
                return (
                  <tr key={org.id} style={{ opacity: busy ? 0.5 : 1 }}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{org.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono' }}>{org.id.substring(0, 8)}...</div>
                    </td>
                    <td>
                      <span className="badge b-neu" style={{ display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
                        <Users size={11} /> {org.user_count}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>
                      {new Date(org.created_at).toLocaleDateString('es-AR')}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {org.plan === 'active'
                        ? <span style={{ color: 'var(--text-3)' }}>—</span>
                        : org.trial_expires_at
                          ? new Date(org.trial_expires_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                          : '—'
                      }
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: `${status.color}22`,
                          color: status.color,
                          border: `1px solid ${status.color}44`,
                          fontWeight: 700,
                          animation: status.urgent ? 'pulse 2s infinite' : undefined
                        }}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {org.plan !== 'active' && (
                          <button
                            className="btn btn-sm btn-dark"
                            onClick={() => activate(org.id)}
                            disabled={busy}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            <CheckCircle size={13} /> Activar
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => deleteOrg(org.id, org.name)}
                          disabled={busy}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red)', borderColor: 'var(--red)' }}
                        >
                          <Trash2 size={13} /> Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 10, fontSize: 12, color: 'var(--text-3)' }}>
        Los negocios en trial que venzan son eliminados automáticamente por pg_cron cada hora.
        Activar un negocio cancela el vencimiento y lo deja activo indefinidamente.
      </div>
    </div>
  );
}
