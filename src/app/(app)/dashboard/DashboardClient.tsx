"use client"
import { BRANDS } from '@/constants/data';
import { TrendingUp, Download, ShoppingBag, Plus, Clock, Package, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

export function DashboardClient({ stock, sales, exchangeRate }: { stock: any[], sales: any[], exchangeRate: number }) {
  const av = stock.filter(s => s.status === 'available');
  const sv = av.filter(s => s.currency === 'USD').reduce((a, s) => a + s.price, 0);

  if (av.length === 0 && sales.length === 0) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center' }}>
        <div style={{ background: 'var(--surface-3)', width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <TrendingUp size={40} color="var(--text-3)" />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Bienvenido a Stackr</h1>
        <p style={{ color: 'var(--text-3)', maxWidth: 400, marginBottom: 32 }}>Parece que aún no tienes actividad. Comienza cargando equipos al inventario para ver las analíticas en tiempo real.</p>
        <button className="btn btn-dark btn-lg" onClick={() => window.location.href = '/scan'}>
          <Package size={20} style={{ marginRight: 10 }} /> Cargar mi primer equipo
        </button>
      </div>
    );
  }

  const totals: Record<string, number> = {};
  sales.forEach(s => s.payments?.forEach((p: any) => {
    totals[p.id] = (totals[p.id] || 0) + p.amount;
  }));

  const totalARS =
    (totals['ars_cash'] || 0) +
    (totals['ars_transf'] || 0) +
    ((totals['usd_cash'] || 0) + (totals['usd_transf'] || 0) + (totals['usdt'] || 0)) * exchangeRate;

  const exportCSV = () => {
    const headers = ['Fecha', 'Vendedor', 'Marca', 'Modelo', 'Storage', 'Color', 'IMEI', 'Precio', 'Moneda', 'Cliente', 'DNI', 'Tel', 'Notas'];
    const rows = sales.map(s => [
      s.created_at ? new Date(s.created_at).toLocaleString('es-AR') : '',
      s.seller_name || '',
      s.brand || '', s.model || '', s.storage || '', s.color || '', s.imei || '',
      s.price || '', s.currency || '',
      s.customer?.name || '', s.customer?.dni || '', s.customer?.phone || '',
      s.notes || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ventas_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const brandRanking = BRANDS.map(b => ({
    name: b,
    count: sales.filter(s => s.brand === b).length
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const today = new Date();
  const weekTrend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const dayStr = d.toISOString().slice(0, 10);
    return {
      label: days[d.getDay()],
      count: sales.filter(s => s.created_at?.slice(0, 10) === dayStr).length
    };
  });

  const sellerCounts: Record<string, { name: string; count: number }> = {};
  sales.forEach(s => {
    if (!s.seller_id) return;
    if (!sellerCounts[s.seller_id]) {
      sellerCounts[s.seller_id] = { name: s.seller_name || 'Sin nombre', count: 0 };
    }
    sellerCounts[s.seller_id].count++;
  });
  const topSeller = Object.values(sellerCounts).sort((a, b) => b.count - a.count)[0];

  const modelCounts: Record<string, { brand: string; model: string; count: number }> = {};
  av.forEach(s => {
    const key = `${s.brand}|${s.model}`;
    if (!modelCounts[key]) modelCounts[key] = { brand: s.brand, model: s.model, count: 0 };
    modelCounts[key].count++;
  });
  const lowStock = Object.values(modelCounts).filter(m => m.count <= 2).sort((a, b) => a.count - b.count);

  const sellerList = Object.values(sellerCounts).sort((a, b) => b.count - a.count);

  return (
    <div className="page">
      <div className="sh" style={{ marginBottom: 24 }}>
        <h1 className="st">Dashboard</h1>
        <button className="btn btn-outline btn-sm" onClick={exportCSV} style={{ gap: 6 }}>
          <Download size={13} /> Exportar
        </button>
      </div>

      <div className="sg">
        <div className="sc">
          <div className="sl">En Stock</div>
          <div className="sv">{av.length}</div>
        </div>
        <div className="sc">
          <div className="sl">Capital USD</div>
          <div className="sv">U$ {sv.toLocaleString()}</div>
        </div>
        <div className="sc">
          <div className="sl">Ventas</div>
          <div className="sv">{sales.length}</div>
        </div>
        <div className="sc">
          <div className="sl">Vendedor top</div>
          <div className="sv" style={{ fontSize: 20 }}>{topSeller ? topSeller.name.split(' ')[0] : '—'}</div>
          {topSeller && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{topSeller.count} ventas</div>}
        </div>
      </div>

      {lowStock.length > 0 && (
        <div style={{ marginBottom: 24, padding: '14px 18px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={16} color="var(--amber)" />
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--amber)' }}>Stock Bajo — {lowStock.length} modelo{lowStock.length > 1 ? 's' : ''} con pocas unidades</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {lowStock.map(m => (
              <span key={`${m.brand}${m.model}`} style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 6, padding: '4px 10px', fontSize: 12 }}>
                {m.brand} {m.model} — <strong style={{ color: m.count === 0 ? 'var(--red)' : 'var(--amber)' }}>{m.count} ud{m.count !== 1 ? 's' : ''}.</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="row" style={{ marginBottom: 24 }}>
        <div className="col card" style={{ flex: 2, padding: 24 }}>
          <div className="sl" style={{ marginBottom: 24 }}>Tendencia de Ventas (Últimos 7 días)</div>
          <div style={{ height: 200, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-3)', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-3)', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                  itemStyle={{ color: 'var(--accent)', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="count" name="Ventas" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col card" style={{ padding: 24 }}>
          <div className="sl" style={{ marginBottom: 20 }}>Top 5 Marcas</div>
          <div style={{ height: 200, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={brandRanking} margin={{ top: 0, right: 30, left: -20, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text)', fontSize: 12, fontWeight: 500 }} width={80} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                />
                <Bar dataKey="count" name="Ventas" radius={[0, 4, 4, 0]} barSize={20}>
                  {brandRanking.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--green)' : 'var(--border-strong)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col card">
          <div style={{ marginBottom: 16 }}>
            <div className="sl">Arqueo de Caja</div>
          </div>
          {[
            { id: 'ars_cash', l: 'Efectivo ARS', p: '$' },
            { id: 'usd_cash', l: 'Dólar Billete', p: 'U$' },
            { id: 'ars_transf', l: 'Transf. ARS', p: '$' },
            { id: 'usd_transf', l: 'Transf. USD', p: 'U$' },
            { id: 'usdt', l: 'USDT', p: 'U$' }
          ].map(it => (
            <div className="receipt-row" key={it.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <span className="col" style={{ color: 'var(--text-2)' }}>{it.l}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{it.p} {(totals[it.id] || 0).toLocaleString()}</span>
            </div>
          ))}
          {exchangeRate > 0 && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
                Total equivalente en ARS (TC: ${exchangeRate.toLocaleString()})
              </div>
              <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, fontSize: 20, color: 'var(--green)' }}>
                $ {Math.round(totalARS).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        <div className="col card">
          <div className="sl" style={{ marginBottom: 16 }}>Ventas por Vendedor</div>
          {sellerList.length === 0 ? (
            <div style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              Sin ventas registradas aún
            </div>
          ) : sellerList.map((s, i) => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: i === 0 ? 'var(--amber)' : 'var(--surface-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 12, color: i === 0 ? '#000' : 'var(--text-3)', flexShrink: 0
              }}>
                {s.name.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{s.name}</div>
              <span className="badge b-green">{s.count} ventas</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 24, padding: 24 }}>
        <div className="sl" style={{ marginBottom: 20 }}>Actividad Reciente</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            ...sales.slice(0, 8).map(s => ({
              type: 'sale',
              label: `${s.seller_name || 'Alguien'} vendió un ${s.brand} ${s.model}`,
              sub: s.customer?.name ? `Cliente: ${s.customer.name}` : `${s.currency === 'USD' ? 'U$' : '$'} ${s.price?.toLocaleString()}`,
              time: s.created_at,
              color: 'var(--green)'
            })),
            ...stock.slice(0, 5).map(s => ({
              type: 'stock',
              label: `Stock cargado: ${s.brand} ${s.model}`,
              sub: `${s.storage} · ${s.color} · ${s.condition === 'new' ? 'Nuevo' : 'Usado'}`,
              time: s.created_at,
              color: 'var(--accent)'
            }))
          ]
            .filter(e => e.time)
            .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
            .slice(0, 10)
            .map((event, i) => {
              const date = new Date(event.time);
              const now = new Date();
              const diffMs = now.getTime() - date.getTime();
              const diffMins = Math.floor(diffMs / 60000);
              const diffHours = Math.floor(diffMs / 3600000);
              const diffDays = Math.floor(diffMs / 86400000);
              const timeStr = diffMins < 1 ? 'ahora'
                : diffMins < 60 ? `hace ${diffMins}m`
                : diffHours < 24 ? `hace ${diffHours}h`
                : diffDays === 1 ? 'ayer'
                : `hace ${diffDays}d`;
              return (
                <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: i < 9 ? '1px solid var(--border)' : 'none', alignItems: 'flex-start' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: event.type === 'sale' ? 'rgba(16,185,129,0.12)' : 'rgba(244,244,245,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    {event.type === 'sale'
                      ? <ShoppingBag size={16} color="var(--green)" />
                      : <Plus size={16} color="var(--accent)" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{event.sub}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-3)', fontSize: 11, flexShrink: 0 }}>
                    <Clock size={11} />
                    {timeStr}
                  </div>
                </div>
              );
            })}
          {sales.length === 0 && stock.length === 0 && (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Sin actividad registrada aún</div>
          )}
        </div>
      </div>
    </div>
  );
}
