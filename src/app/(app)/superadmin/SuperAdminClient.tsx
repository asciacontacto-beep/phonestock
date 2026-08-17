"use client"
import { useMemo } from 'react';
import Link from 'next/link';
import {
  Building2, Users, Clock, RefreshCw, CreditCard, MousePointerClick, DollarSign,
  TrendingUp, Package, Wrench, ShoppingCart, AlertTriangle, Bell,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAdminData, money, trialInfo } from './useAdminData';

const PRICE_USD = 400;

export function SuperAdminClient() {
  const {
    loading, reload, orgs, activity, health, hasActivity,
    healthOf, payments, notes, visits,
  } = useAdminData();

  const active = orgs.filter(o => o.plan === 'active');
  const trial = orgs.filter(o => o.plan !== 'active');
  const expired = trial.filter(o => trialInfo(o).expired);

  const nowMs = Date.now();
  const DAY = 86_400_000;
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const age = (o: { created_at: string }) => nowMs - new Date(o.created_at).getTime();
  const signups = {
    today: orgs.filter(o => new Date(o.created_at) >= startOfToday).length,
    last7: orgs.filter(o => age(o) <= 7 * DAY).length,
    prev7: orgs.filter(o => age(o) > 7 * DAY && age(o) <= 14 * DAY).length,
  };
  const signupDelta = signups.prev7 > 0 ? Math.round((signups.last7 - signups.prev7) / signups.prev7 * 100) : null;
  const totalUsers = orgs.reduce((a, o) => a + (o.user_count || 0), 0);
  const convVisitReg = visits && visits.total > 0 ? (orgs.length / visits.total) * 100 : null;
  const convRegActive = orgs.length > 0 ? (active.length / orgs.length) * 100 : null;

  /* Cobrado real vs. estimado. La estimación (activos × precio) servía
     mientras no había registro de cobros; ahora que existe, se muestran los
     dos y la diferencia deja de ser invisible. */
  const cobrado = useMemo(() => payments.reduce((a, p) => a + (p.currency === 'USD' ? p.amount : 0), 0), [payments]);
  const estimado = active.length * PRICE_USD;

  const platform = useMemo(() => activity.reduce((a, x) => ({
    sales: a.sales + x.sales_total,
    sales30: a.sales30 + x.sales_30d,
    stock: a.stock + x.stock_available,
    repairs: a.repairs + x.repairs_total,
  }), { sales: 0, sales30: 0, stock: 0, repairs: 0 }), [activity]);

  /* Lo que hay que hacer hoy, resumido: el detalle vive en Agenda. */
  const pendientes = useMemo(() => {
    const hoy = startOfToday.getTime();
    const vencenHoy = notes.filter(n => n.follow_up_at && !n.done && new Date(n.follow_up_at).getTime() <= hoy).length;
    const trialsUrgentes = trial.filter(o => { const t = trialInfo(o); return t.urgent || t.expired; }).length;
    const dormidos = hasActivity ? health.dormido : 0;
    return { vencenHoy, trialsUrgentes, dormidos, total: vencenHoy + trialsUrgentes + dormidos };
  }, [notes, trial, health, hasActivity]);

  const dailySignups = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(startOfToday); day.setDate(day.getDate() - (29 - i));
    const next = new Date(day); next.setDate(day.getDate() + 1);
    const count = orgs.filter(o => { const t = new Date(o.created_at); return t >= day && t < next; }).length;
    return { label: day.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }), altas: count };
  });

  const funnel = [
    { stage: 'Visitas al link', value: visits ? visits.total : null, color: '#7c3aed' },
    { stage: 'Se registraron', value: orgs.length, color: '#3b82f6' },
    { stage: 'Cargaron datos', value: hasActivity ? orgs.length - health.nunca : null, color: '#0891b2' },
    { stage: 'Pagaron', value: active.length, color: '#16a34a' },
  ];
  const funnelMax = Math.max(...funnel.map(f => f.value ?? 0), 1);

  return (
    <div className="page">
      <div className="sh" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="st">Resumen</h1>
          <div className="ss2">Cómo viene Stackr como negocio.</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={reload}><RefreshCw size={13} /> Actualizar</button>
      </div>

      {!loading && !hasActivity && (
        <div className="panel">
          <div className="panel-row">
            <span className="panel-dot amber" />
            <span className="panel-text">
              Aplicá <strong>20260816_org_activity.sql</strong> y <strong>20260816_admin_crm.sql</strong> en
              Supabase para ver qué negocios usan el sistema y poder registrar cobros y seguimiento.
            </span>
          </div>
        </div>
      )}

      {pendientes.total > 0 && (
        <Link href="/superadmin/agenda" className="panel is-link" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <div className="panel-row is-link">
            <Bell size={15} color="var(--amber)" />
            <span className="panel-text">
              <strong>Tenés {pendientes.total} {pendientes.total === 1 ? 'cosa' : 'cosas'} para atender.</strong>
              {pendientes.vencenHoy > 0 && ` ${pendientes.vencenHoy} recordatorio${pendientes.vencenHoy === 1 ? '' : 's'} vencido${pendientes.vencenHoy === 1 ? '' : 's'}.`}
              {pendientes.trialsUrgentes > 0 && ` ${pendientes.trialsUrgentes} trial${pendientes.trialsUrgentes === 1 ? '' : 's'} por vencer.`}
              {pendientes.dormidos > 0 && ` ${pendientes.dormidos} cliente${pendientes.dormidos === 1 ? '' : 's'} sin entrar hace más de un mes.`}
            </span>
          </div>
        </Link>
      )}

      <div className="sg" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', marginBottom: 14 }}>
        {[
          { label: 'Cobrado', icon: <DollarSign size={18} />, color: '#16a34a',
            value: money(cobrado),
            sub: estimado !== cobrado ? `estimado por licencias: ${money(estimado)}` : `${payments.length} cobros registrados` },
          { label: 'Visitas al link', icon: <MousePointerClick size={18} />, color: '#7c3aed',
            value: visits ? visits.total.toLocaleString('es-AR') : '—',
            sub: visits ? `${visits.today} hoy · ${visits.last7} en 7 días` : 'Falta la migración site_visits' },
          { label: 'Registros', icon: <Building2 size={18} />, color: 'var(--blue)',
            value: orgs.length.toLocaleString('es-AR'), sub: `${signups.last7} en 7 días`, delta: signupDelta },
          { label: 'Negocios pagos', icon: <CreditCard size={18} />, color: 'var(--green)',
            value: active.length.toLocaleString('es-AR'),
            sub: convRegActive != null ? `${convRegActive.toFixed(0)}% de los registrados` : '—' },
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

      {hasActivity && (
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
              <Link key={x.k} href="/superadmin/negocios"
                style={{ padding: '16px 18px', textAlign: 'left', borderRight: '1px solid var(--border)', textDecoration: 'none', color: 'inherit' }}>
                <div className="sl" style={{ marginBottom: 6 }}>{x.l}</div>
                <div className="sv" style={{ fontSize: 24, color: x.c }}>{health[x.k]}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{x.d}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {hasActivity && (
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
    </div>
  );
}
