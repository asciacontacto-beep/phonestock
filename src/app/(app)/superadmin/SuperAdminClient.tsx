"use client"
import { useState, useEffect } from 'react';
import { CheckCircle, Trash2, Building2, Users, Clock, RefreshCw, ShieldAlert, CreditCard, AlertTriangle, MousePointerClick, DollarSign, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { useConfirm } from '@/hooks/useConfirm';

export function SuperAdminClient() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [visits, setVisits] = useState<{ total: number; today: number; last7: number; prev7: number; last30: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const supabase = createClient();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_all_organizations');
    if (!error && data) setOrgs(data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    else if (error) toast.error('Error cargando negocios');
    // Métricas de visitas (si la migración site_visits está aplicada).
    try {
      const { data: vs } = await supabase.rpc('get_visit_stats');
      if (vs && vs[0]) setVisits({ total: Number(vs[0].total) || 0, today: Number(vs[0].today) || 0, last7: Number(vs[0].last7) || 0, prev7: Number(vs[0].prev7) || 0, last30: Number(vs[0].last30) || 0 });
    } catch { /* migración no aplicada aún */ }
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

  // ── Métricas de registros (altas) derivadas de created_at ──
  const nowMs = Date.now();
  const DAY = 86_400_000;
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const signupAge = (o: any) => nowMs - new Date(o.created_at).getTime();
  const signups = {
    today: orgs.filter(o => new Date(o.created_at) >= startOfToday).length,
    last7: orgs.filter(o => signupAge(o) <= 7 * DAY).length,
    prev7: orgs.filter(o => signupAge(o) > 7 * DAY && signupAge(o) <= 14 * DAY).length,
    last30: orgs.filter(o => signupAge(o) <= 30 * DAY).length,
  };
  const signupDelta = signups.prev7 > 0 ? Math.round((signups.last7 - signups.prev7) / signups.prev7 * 100) : null;
  const totalUsers = orgs.reduce((a, o) => a + (o.user_count || 0), 0);
  const convVisitReg = visits && visits.total > 0 ? (orgs.length / visits.total) * 100 : null;
  const convRegActive = orgs.length > 0 ? (active.length / orgs.length) * 100 : null;

  // ── Ingresos, promedios e insights ──
  const PRICE_USD = 400; // pago único de Stackr
  const revenueUSD = active.length * PRICE_USD;
  const avgUsers = orgs.length > 0 ? totalUsers / orgs.length : 0;
  const expiringSoon = trial.filter(o => {
    if (!o.trial_expires_at) return false;
    const d = new Date(o.trial_expires_at).getTime() - nowMs;
    return d > 0 && d < DAY;
  }).length;

  // Altas por día (últimos 30 días) para el gráfico
  const dailySignups = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(startOfToday); day.setDate(day.getDate() - (29 - i));
    const next = new Date(day); next.setDate(day.getDate() + 1);
    const count = orgs.filter(o => { const t = new Date(o.created_at); return t >= day && t < next; }).length;
    return { label: day.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }), altas: count };
  });

  // Embudo de conversión
  const funnel = [
    { stage: 'Visitas al link', value: visits ? visits.total : null, color: '#7c3aed' },
    { stage: 'Se registraron', value: orgs.length, color: '#3b82f6' },
    { stage: 'Pagaron', value: active.length, color: '#16a34a' },
  ];
  const funnelMax = Math.max(...funnel.map(f => f.value ?? 0), 1);

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

      {/* ── Métricas principales ── */}
      <div className="sg" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 14 }}>
        {[
          {
            label: 'Visitas al link', icon: <MousePointerClick size={18} />, color: '#7c3aed',
            value: visits ? visits.total.toLocaleString('es-AR') : '—',
            sub: visits ? `${visits.today} hoy · ${visits.last7} en 7 días` : 'Aplicá la migración site_visits para activarlo',
          },
          {
            label: 'Registros', icon: <Building2 size={18} />, color: 'var(--blue)',
            value: orgs.length.toLocaleString('es-AR'),
            sub: `${signups.last7} en 7 días`, delta: signupDelta,
          },
          {
            label: 'Usuarios totales', icon: <Users size={18} />, color: 'var(--green)',
            value: totalUsers.toLocaleString('es-AR'),
            sub: `en ${orgs.length} ${orgs.length === 1 ? 'negocio' : 'negocios'}`,
          },
          {
            label: 'Negocios pagos', icon: <CreditCard size={18} />, color: 'var(--green)',
            value: active.length.toLocaleString('es-AR'),
            sub: convRegActive != null ? `${convRegActive.toFixed(0)}% de los registrados` : '—',
          },
          {
            label: 'Ingresos estimados', icon: <DollarSign size={18} />, color: '#16a34a',
            value: `U$ ${revenueUSD.toLocaleString('es-AR')}`,
            sub: `${active.length} × U$ ${PRICE_USD} (pago único)`,
          },
        ].map(s => (
          <div key={s.label} className="sc">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div className="sl">{s.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <div className="sv">{loading ? '—' : s.value}</div>
                  {'delta' in s && s.delta != null && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: s.delta >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {s.delta >= 0 ? '↑' : '↓'} {Math.abs(s.delta)}%
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.4 }}>{s.sub}</div>
              </div>
              <div style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 10, color: s.color, flexShrink: 0 }}>
                {s.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Métricas secundarias ── */}
      <div className="sg" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 28 }}>
        {[
          { label: 'En trial', value: trial.length - expired.length, color: 'var(--amber)' },
          { label: 'Vencidos', value: expired.length, color: 'var(--red)' },
          { label: 'Altas hoy', value: signups.today, color: 'var(--text)' },
          { label: 'Altas 30 días', value: signups.last30, color: 'var(--text)' },
          { label: 'Conversión visita → registro', value: convVisitReg != null ? `${convVisitReg.toFixed(1)}%` : '—', color: '#7c3aed' },
        ].map(s => (
          <div key={s.label} className="sc" style={{ padding: '14px 16px' }}>
            <div className="sl" style={{ marginBottom: 6 }}>{s.label}</div>
            <div className="sv" style={{ fontSize: 20, color: s.color }}>{loading ? '—' : s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Gráfico de altas + embudo de conversión ── */}
      {!loading && (
        <div className="row" style={{ marginBottom: 28, alignItems: 'stretch' }}>
          <div className="col card" style={{ flex: 2, padding: 20, minWidth: 280 }}>
            <div className="sl" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={15} /> Altas por día · últimos 30 días
            </div>
            <div style={{ height: 220, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySignups} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="saSignup" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-3)', fontSize: 10 }} interval={4} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-3)', fontSize: 10 }} width={26} />
                  <Tooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [`${v} ${v === 1 ? 'alta' : 'altas'}`, undefined]} />
                  <Area type="monotone" dataKey="altas" stroke="#3b82f6" strokeWidth={2} fill="url(#saSignup)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col card" style={{ flex: 1, padding: 20, minWidth: 240 }}>
            <div className="sl" style={{ marginBottom: 18 }}>Embudo de conversión</div>
            {funnel.map((f, i) => {
              const prev = i > 0 ? funnel[i - 1].value : null;
              const conv = prev && prev > 0 && f.value != null ? (f.value / prev * 100) : null;
              const widthPct = f.value != null ? Math.max((f.value / funnelMax) * 100, 3) : 0;
              return (
                <div key={f.stage} style={{ marginBottom: 16 }}>
                  {conv != null && (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', marginBottom: 6 }}>
                      ↓ {conv.toFixed(1)}%
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12.5 }}>
                    <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{f.stage}</span>
                    <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{f.value != null ? f.value.toLocaleString('es-AR') : '—'}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${widthPct}%`, background: f.color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
            {!visits && (
              <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.4 }}>
                Aplicá la migración site_visits para ver las visitas y la conversión desde el link.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Insights rápidos */}
      {!loading && (expiringSoon > 0 || orgs.length > 0) && (
        <div className="sg" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 28 }}>
          <div className="sc" style={{ padding: '14px 16px', ...(expiringSoon > 0 ? { border: '1px solid var(--amber)', background: 'rgba(245,158,11,0.06)' } : {}) }}>
            <div className="sl" style={{ marginBottom: 6 }}>Vencen en 24h</div>
            <div className="sv" style={{ fontSize: 20, color: expiringSoon > 0 ? 'var(--amber)' : 'var(--text)' }}>{expiringSoon}</div>
          </div>
          <div className="sc" style={{ padding: '14px 16px' }}>
            <div className="sl" style={{ marginBottom: 6 }}>Prom. usuarios/negocio</div>
            <div className="sv" style={{ fontSize: 20 }}>{avgUsers.toFixed(1)}</div>
          </div>
          <div className="sc" style={{ padding: '14px 16px' }}>
            <div className="sl" style={{ marginBottom: 6 }}>Altas 7 días</div>
            <div className="sv" style={{ fontSize: 20 }}>{signups.last7}</div>
          </div>
          <div className="sc" style={{ padding: '14px 16px' }}>
            <div className="sl" style={{ marginBottom: 6 }}>Visitas hoy</div>
            <div className="sv" style={{ fontSize: 20, color: '#7c3aed' }}>{visits ? visits.today : '—'}</div>
          </div>
        </div>
      )}

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
