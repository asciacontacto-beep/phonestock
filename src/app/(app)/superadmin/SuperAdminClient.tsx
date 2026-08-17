"use client"
import { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle, Trash2, Building2, Users, Clock, RefreshCw, ShieldAlert, CreditCard,
  AlertTriangle, MousePointerClick, DollarSign, TrendingUp, Search, X, Package,
  Wrench, ShoppingCart, Activity, Mail, Download,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { useConfirm } from '@/hooks/useConfirm';
import { orgHealth, summarizeHealth, daysSince, type OrgActivity, type HealthLevel } from '@/utils/orgHealth';

type Tab = 'resumen' | 'negocios' | 'atencion';

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'negocios', label: 'Negocios' },
  { id: 'atencion', label: 'Necesitan atención' },
];

const TONE_COLOR: Record<string, string> = {
  green: 'var(--green)', amber: 'var(--amber)', red: 'var(--red)', mute: 'var(--text-3)',
};

export function SuperAdminClient() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [activity, setActivity] = useState<OrgActivity[]>([]);
  const [visits, setVisits] = useState<{ total: number; today: number; last7: number; prev7: number; last30: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('resumen');
  const [q, setQ] = useState('');
  const [healthFilter, setHealthFilter] = useState<HealthLevel | 'all'>('all');
  const [planFilter, setPlanFilter] = useState<'all' | 'active' | 'trial'>('all');
  const [detail, setDetail] = useState<any>(null);
  const supabase = createClient();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_all_organizations');
    if (!error && data) setOrgs(data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    else if (error) toast.error('Error cargando negocios');

    // Actividad real por negocio. Si la migración no está aplicada, el panel
    // sigue funcionando: sólo no muestra el estado de uso.
    try {
      const { data: act } = await supabase.rpc('get_org_activity');
      if (act) setActivity(act.map((a: any) => ({
        ...a,
        sales_total: Number(a.sales_total) || 0,
        sales_30d: Number(a.sales_30d) || 0,
        sales_7d: Number(a.sales_7d) || 0,
        stock_total: Number(a.stock_total) || 0,
        stock_available: Number(a.stock_available) || 0,
        repairs_total: Number(a.repairs_total) || 0,
      })));
    } catch { /* migración pendiente */ }

    try {
      const { data: vs } = await supabase.rpc('get_visit_stats');
      if (vs && vs[0]) setVisits({ total: Number(vs[0].total) || 0, today: Number(vs[0].today) || 0, last7: Number(vs[0].last7) || 0, prev7: Number(vs[0].prev7) || 0, last30: Number(vs[0].last30) || 0 });
    } catch { /* migración pendiente */ }

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const activate = async (orgId: string) => {
    if (!await confirm('¿Activar este negocio? El trial quedará activo indefinidamente.')) return;
    setActionId(orgId);
    await supabase.rpc('activate_organization', { org_id: orgId });
    await load();
    setActionId(null);
    setDetail(null);
  };

  const deleteOrg = async (orgId: string, orgName: string) => {
    if (!await confirm(`¿Borrar "${orgName}" y TODOS sus datos? Esta acción es irreversible.`)) return;
    setActionId(orgId);
    await supabase.rpc('delete_organization', { org_id: orgId });
    await load();
    setActionId(null);
    setDetail(null);
  };

  const trialInfo = (org: any) => {
    if (org.plan === 'active') return { label: 'Pago', color: 'var(--green)', urgent: false, expired: false };
    if (!org.trial_expires_at) return { label: 'Sin vencimiento', color: 'var(--text-3)', urgent: false, expired: false };
    const diff = new Date(org.trial_expires_at).getTime() - Date.now();
    const hours = Math.floor(diff / 1000 / 3600);
    if (diff < 0) return { label: 'Vencido', color: 'var(--red)', urgent: true, expired: true };
    if (hours < 24) return { label: `${hours}h restantes`, color: 'var(--red)', urgent: true, expired: false };
    const days = Math.ceil(diff / 1000 / 3600 / 24);
    return { label: `${days} días`, color: days <= 3 ? 'var(--amber)' : 'var(--text-2)', urgent: days <= 3, expired: false };
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtFull = (d: string) => new Date(d).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  /* ── Índice de actividad y salud ───────────────────────────── */
  const activityById = useMemo(() => new Map(activity.map(a => [a.org_id, a])), [activity]);
  const healthOf = (o: any) => orgHealth(activityById.get(o.id), o.created_at);
  const health = useMemo(() => summarizeHealth(orgs, activityById), [orgs, activityById]);
  const hasActivityData = activity.length > 0;

  const active = orgs.filter(o => o.plan === 'active');
  const trial = orgs.filter(o => o.plan !== 'active');
  const expired = trial.filter(o => o.trial_expires_at && new Date(o.trial_expires_at).getTime() < Date.now());

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

  const PRICE_USD = 400;
  const revenueUSD = active.length * PRICE_USD;

  /* Volumen total que mueve la plataforma: hasta ahora el panel no sabía
     si los negocios registrados de verdad operaban. */
  const platform = useMemo(() => activity.reduce((a, x) => ({
    sales: a.sales + x.sales_total,
    sales30: a.sales30 + x.sales_30d,
    stock: a.stock + x.stock_available,
    repairs: a.repairs + x.repairs_total,
  }), { sales: 0, sales30: 0, stock: 0, repairs: 0 }), [activity]);

  const dailySignups = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(startOfToday); day.setDate(day.getDate() - (29 - i));
    const next = new Date(day); next.setDate(day.getDate() + 1);
    const count = orgs.filter(o => { const t = new Date(o.created_at); return t >= day && t < next; }).length;
    return { label: day.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }), altas: count };
  });

  const funnel = [
    { stage: 'Visitas al link', value: visits ? visits.total : null, color: '#7c3aed' },
    { stage: 'Se registraron', value: orgs.length, color: '#3b82f6' },
    { stage: 'Cargaron datos', value: hasActivityData ? orgs.length - health.nunca : null, color: '#0891b2' },
    { stage: 'Pagaron', value: active.length, color: '#16a34a' },
  ];
  const funnelMax = Math.max(...funnel.map(f => f.value ?? 0), 1);

  /* ── Lista filtrada ────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return orgs.filter(o => {
      if (term && !`${o.name} ${o.owner_email || ''}`.toLowerCase().includes(term)) return false;
      if (planFilter === 'active' && o.plan !== 'active') return false;
      if (planFilter === 'trial' && o.plan === 'active') return false;
      if (healthFilter !== 'all' && healthOf(o).level !== healthFilter) return false;
      return true;
    });
  }, [orgs, q, planFilter, healthFilter, activityById]);

  /* ── Cosas que piden acción, ordenadas por urgencia ────────── */
  const attention = useMemo(() => {
    const rows: { org: any; why: string; tone: string; priority: number }[] = [];
    orgs.forEach(o => {
      const t = trialInfo(o);
      const h = healthOf(o);
      if (t.expired) rows.push({ org: o, why: 'El trial venció y sigue sin pagar', tone: 'red', priority: 1 });
      else if (t.urgent && o.plan !== 'active') rows.push({ org: o, why: `El trial vence en ${t.label}`, tone: 'amber', priority: 2 });
      if (h.level === 'dormido') rows.push({ org: o, why: h.detail, tone: 'red', priority: 3 });
      else if (h.level === 'nunca' && h.tone === 'red') rows.push({ org: o, why: h.detail, tone: 'red', priority: 2 });
      if (o.user_count === 0) rows.push({ org: o, why: 'No tiene ningún usuario cargado', tone: 'amber', priority: 4 });
    });
    return rows.sort((a, b) => a.priority - b.priority);
  }, [orgs, activityById]);

  const exportCSV = () => {
    const head = ['Negocio', 'Email owner', 'Plan', 'Usuarios', 'Registrado', 'Trial vence', 'Estado de uso', 'Ventas', 'Ventas 30d', 'Stock', 'Reparaciones', 'Última actividad'];
    const rows = orgs.map(o => {
      const a = activityById.get(o.id);
      const h = healthOf(o);
      return [
        o.name, o.owner_email || '', o.plan === 'active' ? 'Pago' : 'Trial', o.user_count || 0,
        fmt(o.created_at), o.trial_expires_at ? fmt(o.trial_expires_at) : '',
        h.label, a?.sales_total ?? '', a?.sales_30d ?? '', a?.stock_available ?? '', a?.repairs_total ?? '',
        a?.last_activity ? fmt(a.last_activity) : '',
      ];
    });
    const csv = [head, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `negocios_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Fila de negocio, compartida por las listas ─────────────── */
  const OrgRow = ({ o, note }: { o: any; note?: string }) => {
    const h = healthOf(o);
    const t = trialInfo(o);
    const a = activityById.get(o.id);
    return (
      <div className="panel-row is-link" onClick={() => setDetail(o)}>
        <span className="panel-dot" style={{ background: TONE_COLOR[h.tone] }} />
        <div className="panel-main">
          <div className="panel-strong">{o.name}</div>
          <div className="panel-meta">
            {o.owner_email || 'sin email'}
            {a && <> · {a.sales_total} {a.sales_total === 1 ? 'venta' : 'ventas'} · {a.stock_available} en stock</>}
          </div>
          {note && <div style={{ fontSize: 11.5, color: TONE_COLOR[h.tone], marginTop: 3 }}>{note}</div>}
        </div>
        <div className="panel-right">
          <div style={{ fontSize: 12, fontWeight: 700, color: t.color }}>{t.label}</div>
          {hasActivityData && <div className="panel-note" style={{ color: TONE_COLOR[h.tone] }}>{h.label}</div>}
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <ShieldAlert size={20} color="var(--amber)" />
            <div className="st" style={{ margin: 0 }}>Panel Superadmin</div>
          </div>
          <div className="ss2">Todos los negocios registrados en Stackr y cómo los están usando.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={exportCSV}><Download size={13} /> Exportar</button>
          <button className="btn btn-outline btn-sm" onClick={load}><RefreshCw size={13} /> Actualizar</button>
        </div>
      </div>

      {!loading && !hasActivityData && (
        <div className="panel" style={{ marginBottom: 14 }}>
          <div className="panel-row">
            <span className="panel-dot amber" />
            <span className="panel-text">
              Para ver qué negocios están usando el sistema, aplicá la migración
              <strong> 20260816_org_activity.sql</strong> en Supabase.
            </span>
          </div>
        </div>
      )}

      <div className="filters-wrap no-print" style={{ marginBottom: 18 }}>
        {TABS.map(t => (
          <button key={t.id} className={`btn-pill ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'atencion' && attention.length > 0 && ` (${attention.length})`}
          </button>
        ))}
      </div>

      {/* ══════════════ RESUMEN ══════════════ */}
      {tab === 'resumen' && (<>
        <div className="sg" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', marginBottom: 14 }}>
          {[
            { label: 'Visitas al link', icon: <MousePointerClick size={18} />, color: '#7c3aed',
              value: visits ? visits.total.toLocaleString('es-AR') : '—',
              sub: visits ? `${visits.today} hoy · ${visits.last7} en 7 días` : 'Falta la migración site_visits' },
            { label: 'Registros', icon: <Building2 size={18} />, color: 'var(--blue)',
              value: orgs.length.toLocaleString('es-AR'), sub: `${signups.last7} en 7 días`, delta: signupDelta },
            { label: 'Negocios pagos', icon: <CreditCard size={18} />, color: 'var(--green)',
              value: active.length.toLocaleString('es-AR'),
              sub: convRegActive != null ? `${convRegActive.toFixed(0)}% de los registrados` : '—' },
            { label: 'Ingresos estimados', icon: <DollarSign size={18} />, color: '#16a34a',
              value: `U$ ${revenueUSD.toLocaleString('es-AR')}`, sub: `${active.length} × U$ ${PRICE_USD} (pago único)` },
            { label: 'Usuarios totales', icon: <Users size={18} />, color: 'var(--text-2)',
              value: totalUsers.toLocaleString('es-AR'), sub: `en ${orgs.length} ${orgs.length === 1 ? 'negocio' : 'negocios'}` },
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
                <div style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 10, color: s.color, flexShrink: 0 }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Estado de uso: la pregunta que el panel no podía responder */}
        {hasActivityData && (
          <div className="panel">
            <div className="panel-head" style={{ display: 'block' }}>
              <div className="panel-title">Quién está usando el sistema</div>
              <div className="panel-sub">Según la última vez que vendieron, cargaron stock o ingresaron una reparación</div>
            </div>
            <div className="sg" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 0, margin: 0 }}>
              {([
                { k: 'activo' as const, l: 'Activos', d: 'movimiento esta semana', c: 'var(--green)' },
                { k: 'tibio' as const, l: 'Poco uso', d: 'entre 8 y 30 días', c: 'var(--amber)' },
                { k: 'dormido' as const, l: 'Dormidos', d: 'más de 30 días', c: 'var(--red)' },
                { k: 'nunca' as const, l: 'Sin arrancar', d: 'nunca cargaron nada', c: 'var(--text-3)' },
              ]).map(x => (
                <button key={x.k}
                  onClick={() => { setHealthFilter(x.k); setTab('negocios'); }}
                  style={{ padding: '16px 18px', textAlign: 'left', borderRight: '1px solid var(--border)', background: 'none', cursor: 'pointer' }}>
                  <div className="sl" style={{ marginBottom: 6 }}>{x.l}</div>
                  <div className="sv" style={{ fontSize: 24, color: x.c }}>{health[x.k]}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{x.d}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Volumen que mueve la plataforma */}
        {hasActivityData && (
          <div className="sg" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 14 }}>
            {[
              { l: 'Ventas totales', v: platform.sales.toLocaleString('es-AR'), i: <ShoppingCart size={15} />, s: `${platform.sales30.toLocaleString('es-AR')} en 30 días` },
              { l: 'Equipos en stock', v: platform.stock.toLocaleString('es-AR'), i: <Package size={15} />, s: 'sumando todos los negocios' },
              { l: 'Reparaciones', v: platform.repairs.toLocaleString('es-AR'), i: <Wrench size={15} />, s: 'ingresadas en total' },
              { l: 'Trials activos', v: trial.length - expired.length, i: <Clock size={15} />, s: `${expired.length} ya vencidos` },
            ].map(x => (
              <div key={x.l} className="sc" style={{ padding: '14px 16px', position: 'relative' }}>
                <span className="sc-icon">{x.i}</span>
                <div className="sl" style={{ marginBottom: 6 }}>{x.l}</div>
                <div className="sv" style={{ fontSize: 20 }}>{loading ? '—' : x.v}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{x.s}</div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <div className="row" style={{ marginBottom: 20, alignItems: 'stretch' }}>
            <div className="col card" style={{ flex: 2, padding: 20, minWidth: 280 }}>
              <div className="sl" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={15} /> Altas por día · últimos 30 días
              </div>
              <div style={{ height: 200, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailySignups} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="altas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="var(--blue)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-3)', fontSize: 10 }} interval={5} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-3)', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="altas" stroke="var(--blue)" strokeWidth={2.4} fill="url(#altas)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="col card" style={{ padding: 20, minWidth: 240 }}>
              <div className="sl" style={{ marginBottom: 18 }}>Embudo</div>
              {funnel.map(f => (
                <div key={f.stage} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-2)' }}>{f.stage}</span>
                    <strong>{f.value ?? '—'}</strong>
                  </div>
                  <div style={{ height: 7, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${((f.value ?? 0) / funnelMax) * 100}%`, background: f.color, borderRadius: 4, transition: 'width .5s' }} />
                  </div>
                </div>
              ))}
              {convVisitReg != null && (
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>
                  De cada 100 que entran al link, se registran {convVisitReg.toFixed(1)}.
                </div>
              )}
            </div>
          </div>
        )}
      </>)}

      {/* ══════════════ NEGOCIOS ══════════════ */}
      {tab === 'negocios' && (<>
        <div className="search-bar" style={{ marginBottom: 12 }}>
          <Search size={16} color="var(--text-3)" />
          <input className="inp" placeholder="Buscar por nombre o email del dueño..." value={q} onChange={e => setQ(e.target.value)} />
        </div>

        <div className="filters-wrap no-print" style={{ marginBottom: 14 }}>
          {([['all', 'Todos'], ['active', 'Pagos'], ['trial', 'En trial']] as const).map(([v, l]) => (
            <button key={v} className={`btn-pill ${planFilter === v ? 'active' : ''}`} onClick={() => setPlanFilter(v)}>{l}</button>
          ))}
          {hasActivityData && <>
            <div style={{ width: 1, height: 20, background: 'var(--border-md)', margin: '0 4px' }} />
            {([['all', 'Cualquier uso'], ['activo', 'Activos'], ['tibio', 'Poco uso'], ['dormido', 'Dormidos'], ['nunca', 'Sin arrancar']] as const).map(([v, l]) => (
              <button key={v} className={`btn-pill ${healthFilter === v ? 'active' : ''}`} onClick={() => setHealthFilter(v as any)}>{l}</button>
            ))}
          </>}
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">{filtered.length} {filtered.length === 1 ? 'negocio' : 'negocios'}</span>
            {(q || planFilter !== 'all' || healthFilter !== 'all') && (
              <button className="btn-pill" style={{ marginLeft: 'auto' }}
                onClick={() => { setQ(''); setPlanFilter('all'); setHealthFilter('all'); }}>Limpiar filtros</button>
            )}
          </div>
          {loading ? (
            <div className="d-empty"><div className="d-empty-text">Cargando…</div></div>
          ) : filtered.length === 0 ? (
            <div className="d-empty">
              <div className="d-empty-icon"><Building2 size={20} /></div>
              <div className="d-empty-title">Ningún negocio con esos filtros</div>
            </div>
          ) : filtered.map(o => <OrgRow key={o.id} o={o} />)}
        </div>
      </>)}

      {/* ══════════════ ATENCIÓN ══════════════ */}
      {tab === 'atencion' && (
        <div className="panel">
          <div className="panel-head">
            <AlertTriangle size={15} color="var(--amber)" />
            <span className="panel-title">Necesitan que hagas algo</span>
            <span className="panel-count">({attention.length})</span>
          </div>
          {attention.length === 0 ? (
            <div className="d-empty">
              <div className="d-empty-icon"><CheckCircle size={20} /></div>
              <div className="d-empty-title">Todo en orden</div>
              <div className="d-empty-text">Ningún trial por vencer y ningún negocio abandonado.</div>
            </div>
          ) : attention.map((r, i) => <OrgRow key={`${r.org.id}-${i}`} o={r.org} note={r.why} />)}
        </div>
      )}

      {/* ══════════════ DETALLE ══════════════ */}
      {detail && (() => {
        const a = activityById.get(detail.id);
        const h = healthOf(detail);
        const t = trialInfo(detail);
        const idle = daysSince(a?.last_activity);
        return (
          <div className="mo" onClick={() => setDetail(null)}>
            <div className="mb" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
              <div className="mh">
                <div>
                  <div className="mh-title">{detail.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Registrado el {fmt(detail.created_at)}</div>
                </div>
                <button className="btn-icon" onClick={() => setDetail(null)}><X size={18} /></button>
              </div>

              <div className="mbd" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  <span className="badge" style={{ background: 'var(--surface-2)', color: t.color, border: `1px solid ${t.color}44`, fontWeight: 700 }}>{t.label}</span>
                  {hasActivityData && (
                    <span className="badge" style={{ background: 'var(--surface-2)', color: TONE_COLOR[h.tone], border: `1px solid ${TONE_COLOR[h.tone]}44`, fontWeight: 700 }}>{h.label}</span>
                  )}
                </div>

                {hasActivityData && (
                  <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 13, lineHeight: 1.55, color: 'var(--text-2)' }}>
                    {h.detail}
                  </div>
                )}

                <div className="sg" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', marginBottom: 16 }}>
                  {[
                    { l: 'Usuarios', v: detail.user_count ?? 0 },
                    { l: 'Ventas', v: a ? a.sales_total : '—' },
                    { l: 'Ventas 30d', v: a ? a.sales_30d : '—' },
                    { l: 'En stock', v: a ? a.stock_available : '—' },
                    { l: 'Reparaciones', v: a ? a.repairs_total : '—' },
                    { l: 'Sin entrar', v: idle != null ? `${idle}d` : '—' },
                  ].map(x => (
                    <div key={x.l} className="sc" style={{ padding: '12px 14px' }}>
                      <div className="sl" style={{ marginBottom: 4 }}>{x.l}</div>
                      <div className="sv" style={{ fontSize: 19 }}>{x.v}</div>
                    </div>
                  ))}
                </div>

                <div className="panel" style={{ marginBottom: 16 }}>
                  <div className="panel-row">
                    <Mail size={14} color="var(--text-3)" />
                    <span className="panel-text" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                      {detail.owner_email || 'sin email registrado'}
                    </span>
                  </div>
                  {detail.trial_expires_at && (
                    <div className="panel-row">
                      <Clock size={14} color="var(--text-3)" />
                      <span className="panel-text">Trial vence el {fmtFull(detail.trial_expires_at)}</span>
                    </div>
                  )}
                  {a?.last_activity && (
                    <div className="panel-row">
                      <Activity size={14} color="var(--text-3)" />
                      <span className="panel-text">Última actividad: {fmtFull(a.last_activity)}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {detail.plan !== 'active' && (
                    <button className="btn btn-dark" style={{ flex: 1, minWidth: 150 }}
                      disabled={actionId === detail.id} onClick={() => activate(detail.id)}>
                      <CheckCircle size={15} /> Marcar como pago
                    </button>
                  )}
                  {detail.owner_email && (
                    <a className="btn btn-outline" style={{ flex: 1, minWidth: 150, justifyContent: 'center' }}
                      href={`mailto:${detail.owner_email}`}>
                      <Mail size={15} /> Escribirle
                    </a>
                  )}
                  <button className="btn btn-outline" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
                    disabled={actionId === detail.id} onClick={() => deleteOrg(detail.id, detail.name)}>
                    <Trash2 size={15} /> Borrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {ConfirmDialog}
    </div>
  );
}
