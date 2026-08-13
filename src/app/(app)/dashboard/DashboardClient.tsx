"use client"
import { useState, useMemo } from 'react';
import { BRANDS } from '@/constants/data';
import { categoryBreakdown, totalsFromBreakdown, saleCategory, saleExchangeRate, toUSD, isRepairClosed } from '@/utils/sales';
import { ProfitBreakdownModal, type ProfitLine } from '@/components/ProfitBreakdownModal';
import { voidSale, voidSaleSummary } from '@/utils/voidSale';
import { logAudit } from '@/utils/audit';
import { TrendingUp, Download, ShoppingBag, Plus, Clock, Package, AlertTriangle, Trash2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useConfirm } from '@/hooks/useConfirm';

type Range = 'today' | 'week' | 'month' | 'all';

const RANGE_LABELS: Record<Range, string> = {
  today: 'Hoy',
  week: '7 días',
  month: 'Este mes',
  all: 'Todo',
};

function sinceDate(range: Range): Date | null {
  if (range === 'all') return null;
  const d = new Date();
  if (range === 'today') { d.setHours(0, 0, 0, 0); return d; }
  if (range === 'week')  { d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d; }
  if (range === 'month') { d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
  return null;
}

/** Ventana anterior del mismo largo, para poder decir "vas mejor o peor". */
function previousWindow(range: Range): { from: Date; to: Date } | null {
  if (range === 'all') return null;
  const to = sinceDate(range)!;
  const from = new Date(to);
  if (range === 'today') from.setDate(from.getDate() - 1);
  else if (range === 'week') from.setDate(from.getDate() - 7);
  else if (range === 'month') from.setMonth(from.getMonth() - 1);
  return { from, to };
}

const RANGE_PREV_LABEL: Record<Range, string> = {
  today: 'ayer',
  week: 'la semana anterior',
  month: 'el mes anterior',
  all: '',
};

/** Dias que un equipo lleva en stock. */
function daysInStock(createdAt?: string | null): number | null {
  if (!createdAt) return null;
  const ms = Date.now() - new Date(createdAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.floor(ms / 86_400_000);
}

function fmtARS(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n).toLocaleString('es-AR')}`;
}

export function DashboardClient({
  stock, sales, exchangeRate, userRole, repairs = [],
}: {
  stock: any[]; sales: any[]; exchangeRate: number; userRole?: string; repairs?: any[];
}) {
  const router   = useRouter();
  const supabase = createClient();
  const { confirm, ConfirmDialog } = useConfirm();
  const [range, setRange] = useState<Range>('month');
  const [detailCat, setDetailCat] = useState<'device' | 'accessory' | 'service' | null>(null);

  const deleteSale = async (saleId: string) => {
    const sale = sales.find(s => String(s.id) === String(saleId));
    if (!sale) return;
    if (!await confirm('¿Anular esta venta? Se devuelve el equipo y los accesorios al stock, y se elimina el equipo recibido en canje.')) return;
    try {
      const result = await voidSale(supabase, sale);
      await logAudit(supabase, {
        action: 'venta_anulada', entity: 'sale', entityId: String(sale.id),
        summary: `Anuló la venta de ${sale.brand} ${sale.model} (${sale.customer?.name || 'sin cliente'})`,
      });
      toast.success(voidSaleSummary(result));
      result.warnings.forEach(w => toast.warning(w, { duration: 8000 }));
      router.refresh();
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    }
  };

  /* ── Base data ─────────────────────────────────────── */
  const av = useMemo(() => stock.filter(s => s.status === 'available'), [stock]);

  const capitalUSD = useMemo(
    () => av.reduce((a, s) => a + (s.currency === 'USD' ? (s.cost_price || 0) : (s.cost_price || 0) / exchangeRate), 0),
    [av, exchangeRate],
  );

  const allSales = useMemo(() => sales.filter(s => s.brand !== 'MOVIMIENTO'), [sales]);

  /* ── Date-filtered sales ───────────────────────────── */
  const filteredSales = useMemo(() => {
    const since = sinceDate(range);
    if (!since) return allSales;
    return allSales.filter(s => s.created_at && new Date(s.created_at) >= since);
  }, [allSales, range]);

  /* ── Revenue & Profit ──────────────────────────────────
     Derivados del mismo desglose por categoría que muestran las tarjetas
     de abajo, así el total siempre es exactamente la suma de las partes.  */

  /* ── Brand ranking ─────────────────────────────────── */
  const brandRanking = useMemo(
    () => BRANDS
      .map(b => ({ name: b, count: filteredSales.filter(s => s.brand === b).length }))
      .filter(b => b.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    [filteredSales],
  );

  /* ── Trend chart ───────────────────────────────────── */
  const trendDays = range === 'month' ? 30 : 7;
  const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const weekTrend = useMemo(() => {
    const today = new Date();
    return Array.from({ length: trendDays }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (trendDays - 1 - i));
      const dayStr = d.toISOString().slice(0, 10);
      return {
        label: trendDays <= 7
          ? DAYS[d.getDay()]
          : `${d.getDate()}/${d.getMonth() + 1}`,
        count: allSales.filter(s => s.created_at?.slice(0, 10) === dayStr).length,
      };
    });
  }, [allSales, trendDays]);

  /* ── Seller stats ──────────────────────────────────── */
  const { topSeller, sellerList } = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {};
    filteredSales.forEach(s => {
      if (!s.seller_id) return;
      if (!counts[s.seller_id]) counts[s.seller_id] = { name: s.seller_name || 'Sin nombre', count: 0 };
      counts[s.seller_id].count++;
    });
    const list = Object.values(counts).sort((a, b) => b.count - a.count);
    return { topSeller: list[0], sellerList: list };
  }, [filteredSales]);

  /* ── Low stock alert ───────────────────────────────── */
  const lowStock = useMemo(() => {
    const mc: Record<string, { brand: string; model: string; count: number }> = {};
    av.forEach(s => {
      const k = `${s.brand}|${s.model}`;
      if (!mc[k]) mc[k] = { brand: s.brand, model: s.model, count: 0 };
      mc[k].count++;
    });
    return Object.values(mc).filter(m => m.count <= 2).sort((a, b) => a.count - b.count);
  }, [av]);

  const filteredRepairs = useMemo(() => {
    const since = sinceDate(range);
    if (!since) return repairs;
    return repairs.filter(r => {
      const t = r.updated_at || r.created_at;
      return t && new Date(t) >= since;
    });
  }, [repairs, range]);

  const catBreakdown = useMemo(
    () => categoryBreakdown(filteredSales, filteredRepairs, exchangeRate),
    [filteredSales, filteredRepairs, exchangeRate]
  );

  const totals = useMemo(() => totalsFromBreakdown(catBreakdown), [catBreakdown]);
  const revenueUSD = totals.revenue;
  const profitUSD = totals.profit;
  const marginPct = Math.round(totals.margin);

  /* ── Cómo venías en el período anterior ─────────────────────
     Un número solo no dice nada: U$3.340 puede ser buenísimo o pésimo.
     Contra el período anterior sí se entiende. */
  const previousProfit = useMemo(() => {
    const w = previousWindow(range);
    if (!w) return null;
    const inWindow = (t?: string | null) => {
      if (!t) return false;
      const d = new Date(t);
      return d >= w.from && d < w.to;
    };
    const prevSales = allSales.filter(s => inWindow(s.created_at));
    const prevRepairs = repairs.filter(r => inWindow(r.updated_at || r.created_at));
    if (prevSales.length === 0 && prevRepairs.length === 0) return null;
    return totalsFromBreakdown(categoryBreakdown(prevSales, prevRepairs, exchangeRate)).profit;
  }, [allSales, repairs, range, exchangeRate]);

  const profitDelta = useMemo(() => {
    if (previousProfit == null || previousProfit === 0) return null;
    return ((totals.profit - previousProfit) / Math.abs(previousProfit)) * 100;
  }, [totals.profit, previousProfit]);

  /* ── Equipos parados: capital que no rota ───────────────────── */
  const agedStock = useMemo(() => {
    const items = av.filter(s => {
      const d = daysInStock(s.created_at);
      return d != null && d >= 60;
    });
    const capital = items.reduce((a, s) => {
      const c = s.cost_price || 0;
      return a + (s.currency === 'USD' ? c : c / (exchangeRate || 1));
    }, 0);
    return { count: items.length, capital };
  }, [av, exchangeRate]);

  /* ── Quién debe plata ───────────────────────────────────────── */
  const debts = useMemo(() => {
    const rows = allSales.filter(s => s.balance_due > 0);
    const usd = rows.reduce((a, s) => {
      const b = s.balance_due || 0;
      return a + (s.currency === 'USD' ? b : b / (exchangeRate || 1));
    }, 0);
    return { count: rows.length, usd };
  }, [allSales, exchangeRate]);

  /* ── Todo lo que pide atención, en una sola lista priorizada ──
     Antes cada aviso era un cartel suelto en distinto lugar de la página. */
  const alerts = useMemo(() => {
    const list: { key: string; text: string; tone: 'red' | 'amber'; onClick?: () => void }[] = [];

    if (debts.count > 0) list.push({
      key: 'debts',
      tone: 'amber',
      text: `${debts.count} ${debts.count === 1 ? 'cliente debe' : 'clientes deben'} U$ ${Math.round(debts.usd).toLocaleString('es-AR')}`,
      onClick: () => router.push('/sales'),
    });

    if (agedStock.count > 0) list.push({
      key: 'aged',
      tone: agedStock.count >= 5 ? 'red' : 'amber',
      text: `${agedStock.count} ${agedStock.count === 1 ? 'equipo lleva' : 'equipos llevan'} más de 60 días sin venderse` +
            (agedStock.capital > 0 ? ` — U$ ${Math.round(agedStock.capital).toLocaleString('es-AR')} parados` : ''),
      onClick: () => router.push('/stock'),
    });

    if (totals.missingCost > 0) list.push({
      key: 'cost',
      tone: 'amber',
      text: `${totals.missingCost} ${totals.missingCost === 1 ? 'operación no tiene' : 'operaciones no tienen'} el costo cargado — la ganancia figura más alta que la real`,
      onClick: () => setDetailCat('device'),
    });

    if (lowStock.length > 0) list.push({
      key: 'low',
      tone: 'amber',
      text: `${lowStock.length} ${lowStock.length === 1 ? 'modelo' : 'modelos'} con pocas unidades: ${lowStock.slice(0, 3).map(m => m.model).join(', ')}${lowStock.length > 3 ? ` y ${lowStock.length - 3} más` : ''}`,
      onClick: () => router.push('/stock'),
    });

    return list;
  }, [debts, agedStock, totals.missingCost, lowStock, router]);

  /* ── Detalle línea por línea de cada tarjeta de ganancia ───── */
  const byNewest = (a: { time: string }, b: { time: string }) =>
    new Date(b.time).getTime() - new Date(a.time).getTime();

  const deviceLines = useMemo(() => filteredSales
    .filter(s => saleCategory(s) === 'device')
    .map(s => {
      const rate = saleExchangeRate(s, exchangeRate);
      const priceUSD = toUSD(s.price || 0, s.currency, rate);
      const costUSD = toUSD(s.cost_price || 0, s.currency, rate);
      return {
        id: String(s.id),
        label: `${s.brand} ${s.model}${s.cost_price ? '' : '  ⚠ sin costo cargado'}`,
        costUSD, priceUSD, profitUSD: priceUSD - costUSD,
        time: s.created_at,
      };
    })
    .sort(byNewest),
    [filteredSales, exchangeRate]
  );

  const accessoryLines = useMemo(() => {
    const rows: (ProfitLine & { time: string })[] = [];
    filteredSales.forEach(s => {
      const rate = saleExchangeRate(s, exchangeRate);
      (s.accessories || []).forEach((a: any, i: number) => {
        if (a.is_gift) return;
        const priceUSD = toUSD((a.price || 0) * (a.qty || 1), a.currency || 'ARS', rate);
        const costUSD = toUSD((a.cost_price || 0) * (a.qty || 1), a.currency || 'ARS', rate);
        rows.push({
          id: `${s.id}-${i}`,
          label: `${a.qty || 1}x ${a.name}`,
          costUSD, priceUSD, profitUSD: priceUSD - costUSD,
          time: s.created_at,
        });
      });
    });
    return rows.sort(byNewest);
  }, [filteredSales, exchangeRate]);

  /* Servicio: el ingreso viene de las ventas SERVICIO y el costo de las
     reparaciones entregadas. Se emparejan por orden para poder mostrar
     una línea por trabajo cerrado. */
  const serviceLines = useMemo(() => {
    const closed = filteredRepairs.filter(isRepairClosed).sort((a, b) =>
      new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    );
    const revenueByCustomer = new Map<string, number>();
    filteredSales.filter(s => saleCategory(s) === 'service').forEach(s => {
      const key = (s.customer?.name || '').toLowerCase().trim();
      const rate = saleExchangeRate(s, exchangeRate);
      revenueByCustomer.set(key, (revenueByCustomer.get(key) || 0) + toUSD(s.price || 0, s.currency, rate));
    });

    return closed.map(r => {
      const key = (r.customer_name || '').toLowerCase().trim();
      const priceUSD = revenueByCustomer.get(key) || 0;
      const costUSD = toUSD(r.cost || 0, 'ARS', exchangeRate);
      return {
        id: String(r.id),
        label: `${r.device_brand || ''} ${r.device_model || ''}`.trim() || 'Reparación',
        costUSD, priceUSD, profitUSD: priceUSD - costUSD,
        time: r.updated_at || r.created_at,
      };
    });
  }, [filteredRepairs, filteredSales, exchangeRate]);

  const linesFor = (cat: 'device' | 'accessory' | 'service'): ProfitLine[] =>
    cat === 'device' ? deviceLines : cat === 'accessory' ? accessoryLines : serviceLines;

  const isEmpty = av.length === 0 && allSales.length === 0;

  /* ── Export CSV ────────────────────────────────────── */
  const exportCSV = () => {
    const headers = ['Fecha', 'Vendedor', 'Marca', 'Modelo', 'Storage', 'Color', 'IMEI', 'Precio', 'Moneda', 'Cliente', 'DNI', 'Tel', 'Notas'];
    const rows = filteredSales.map(s => [
      s.created_at ? new Date(s.created_at).toLocaleString('es-AR') : '',
      s.seller_name || '',
      s.brand || '', s.model || '', s.storage || '', s.color || '', s.imei || '',
      s.price || '', s.currency || '',
      s.customer?.name || '', s.customer?.dni || '', s.customer?.phone || '',
      s.notes || '',
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `ventas_${range}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ═══ RENDER ════════════════════════════════════════ */
  return (
    <div className="page">

      {/* Header */}
      <div className="sh" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="st">Dashboard</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="filters-wrap" style={{ margin: 0 }}>
            {(Object.keys(RANGE_LABELS) as Range[]).map(r => (
              <button
                key={r}
                className={`btn-pill${range === r ? ' active' : ''}`}
                onClick={() => setRange(r)}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
          <button className="btn btn-outline btn-sm" onClick={exportCSV}>
            <Download size={13} /> Exportar
          </button>
        </div>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div style={{ marginBottom: 24, padding: 32, background: 'var(--surface-2)', borderRadius: 16, textAlign: 'center', border: '1px solid var(--border)' }}>
          <div style={{ background: 'var(--surface-3)', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <TrendingUp size={32} color="var(--text-3)" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>¡Bienvenido a Stackr!</h2>
          <p style={{ color: 'var(--text-3)', maxWidth: 400, margin: '0 auto 24px' }}>
            Cargá equipos al inventario para ver tus analíticas en tiempo real.
          </p>
          <button className="btn btn-dark" onClick={() => router.push('/scan')}>
            <Package size={18} style={{ marginRight: 8 }} /> Cargar mi primer equipo
          </button>
        </div>
      )}

      {/* ── Lo primero: cuánto ganaste y de dónde salió ────────── */}
      <div className="card" style={{ padding: 24, marginBottom: 14 }}>
        <div className="sl" style={{ marginBottom: 6 }}>Ganancia · {RANGE_LABELS[range].toLowerCase()}</div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, color: profitUSD >= 0 ? 'var(--green)' : 'var(--red)' }}>
            U$ {Math.round(profitUSD).toLocaleString('es-AR')}
          </div>
          {profitDelta != null && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12.5, fontWeight: 700,
              padding: '3px 9px', borderRadius: 20,
              color: profitDelta >= 0 ? 'var(--green)' : 'var(--red)',
              background: profitDelta >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            }}>
              {profitDelta >= 0 ? '↑' : '↓'} {Math.abs(Math.round(profitDelta))}% vs {RANGE_PREV_LABEL[range]}
            </span>
          )}
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 8 }}>
          {revenueUSD > 0
            ? <>Facturaste U$ {Math.round(revenueUSD).toLocaleString('es-AR')} · te quedó el <strong style={{ color: 'var(--text-2)' }}>{marginPct}%</strong></>
            : 'Sin ventas en este período.'}
        </div>

        {/* De dónde viene la ganancia */}
        {(() => {
          const cats = [
            { key: 'device' as const,    label: 'Equipos',    s: catBreakdown.device,    color: 'var(--blue)' },
            { key: 'accessory' as const, label: 'Accesorios', s: catBreakdown.accessory, color: 'var(--purple)' },
            { key: 'service' as const,   label: 'Servicio',   s: catBreakdown.service,   color: 'var(--green)' },
          ];
          const positive = cats.filter(c => c.s.profit > 0);
          const totalPositive = positive.reduce((a, c) => a + c.s.profit, 0);
          if (cats.every(c => c.s.profit === 0 && c.s.revenue === 0)) return null;

          return (
            <div style={{ marginTop: 18 }}>
              {totalPositive > 0 && (
                <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--surface-3)' }}>
                  {positive.map(c => (
                    <div key={c.key} title={`${c.label}: U$ ${Math.round(c.s.profit).toLocaleString('es-AR')}`}
                      style={{ width: `${(c.s.profit / totalPositive) * 100}%`, background: c.color }} />
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
                {cats.map(c => (
                  <button key={c.key} onClick={() => setDetailCat(c.key)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                      {c.label}
                      {c.s.missingCost > 0 && <AlertTriangle size={11} color="var(--amber)" />}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2, color: c.s.profit >= 0 ? 'var(--text)' : 'var(--red)' }}>
                      U$ {Math.round(c.s.profit).toLocaleString('es-AR')}
                      {c.s.revenue > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-3)', marginLeft: 5 }}>
                          {c.s.margin.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 10, fontWeight: 600 }}>
                Tocá cualquiera para ver cómo se calcula →
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Estado del negocio, en una línea ────────────────────── */}
      <div className="sg" style={{ gridTemplateColumns: userRole === 'seller' ? 'repeat(2,1fr)' : 'repeat(4,1fr)', marginBottom: 14 }}>
        <div className="sc" style={{ cursor: 'pointer' }} onClick={() => router.push('/stock')}>
          <div className="sl">En stock</div>
          <div className="sv">{av.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>equipos sin vender</div>
        </div>

        {userRole !== 'seller' && (
          <div className="sc" style={{ cursor: 'pointer' }} onClick={() => router.push('/stock')}>
            <div className="sl">Capital</div>
            <div className="sv">U$ {Math.round(capitalUSD).toLocaleString('es-AR')}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>invertido en esos equipos</div>
          </div>
        )}

        <div className="sc">
          <div className="sl">Ventas</div>
          <div className="sv">{filteredSales.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            {topSeller ? `mejor: ${topSeller.name.split(' ')[0]}` : RANGE_LABELS[range].toLowerCase()}
          </div>
        </div>

        {userRole !== 'seller' && (
          <div className="sc">
            <div className="sl">Facturación</div>
            <div className="sv">U$ {Math.round(revenueUSD).toLocaleString('es-AR')}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{RANGE_LABELS[range].toLowerCase()}</div>
          </div>
        )}
      </div>

      {/* ── Todo lo que pide atención, junto y accionable ───────── */}
      {userRole !== 'seller' && alerts.length > 0 && (
        <div className="card" style={{ padding: 0, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={15} color="var(--amber)" />
            <span style={{ fontWeight: 700, fontSize: 13 }}>Necesitan tu atención</span>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>({alerts.length})</span>
          </div>
          {alerts.map((a, i) => (
            <div key={a.key} onClick={a.onClick}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 18px',
                borderBottom: i < alerts.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: a.onClick ? 'pointer' : 'default', fontSize: 13, lineHeight: 1.5,
              }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 6, background: a.tone === 'red' ? 'var(--red)' : 'var(--amber)' }} />
              <span style={{ color: 'var(--text-2)' }}>{a.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Charts row */}
      <div className="row" style={{ marginBottom: 24 }}>
        {/* Trend chart */}
        <div className="col card" style={{ flex: 2, padding: 24 }}>
          <div className="sl" style={{ marginBottom: 20 }}>
            Tendencia — {trendDays === 7 ? 'últimos 7 días' : 'este mes'}
          </div>
          <div style={{ height: 200, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  axisLine={false} tickLine={false}
                  tick={{ fill: 'var(--text-3)', fontSize: 11 }}
                  dy={10}
                  interval={trendDays > 14 ? 4 : 0}
                />
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

        {/* Top brands */}
        <div className="col card" style={{ padding: 24 }}>
          <div className="sl" style={{ marginBottom: 20 }}>Top Marcas</div>
          {brandRanking.length === 0 ? (
            <div style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              Sin ventas en este período
            </div>
          ) : (
            <div style={{ height: 200, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={brandRanking} margin={{ top: 0, right: 30, left: -20, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name" type="category"
                    axisLine={false} tickLine={false}
                    tick={{ fill: 'var(--text)', fontSize: 12, fontWeight: 500 }}
                    width={80}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                    contentStyle={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                  />
                  <Bar dataKey="count" name="Ventas" radius={[0, 4, 4, 0]} barSize={20}>
                    {brandRanking.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--green)' : 'var(--surface-3)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Seller leaderboard */}
      <div className="row">
        <div className="col card">
          <div className="sl" style={{ marginBottom: 16 }}>Ventas por Vendedor</div>
          {sellerList.length === 0 ? (
            <div style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              Sin ventas en este período
            </div>
          ) : (
            sellerList.map((s, i) => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: i === 0 ? 'var(--amber)' : 'var(--surface-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 12,
                  color: i === 0 ? '#000' : 'var(--text-3)',
                  flexShrink: 0,
                }}>
                  {s.name.substring(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                <span className="badge b-green">{s.count} ventas</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent activity — owners only */}
      {userRole !== 'seller' && (
        <div className="card" style={{ marginTop: 24, padding: 24 }}>
          <div className="sl" style={{ marginBottom: 20 }}>Actividad Reciente</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              ...filteredSales.slice(0, 8).map(s => ({
                id: s.id,
                type: 'sale' as const,
                label: `${s.seller_name || 'Alguien'} vendió un ${s.brand} ${s.model}`,
                sub: s.customer?.name
                  ? `Cliente: ${s.customer.name}`
                  : `${s.currency === 'USD' ? 'U$' : '$'} ${(s.price || 0).toLocaleString('es-AR')}`,
                time: s.created_at,
              })),
              ...stock.slice(0, 5).map(s => ({
                id: s.id,
                type: 'stock' as const,
                label: `Stock cargado: ${s.brand} ${s.model}`,
                sub: `${s.storage} · ${s.color} · ${s.condition === 'new' ? 'Nuevo' : 'Usado'}`,
                time: s.created_at,
              })),
            ]
              .filter(e => e.time)
              .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
              .slice(0, 10)
              .map((event, i) => {
                const diffMs    = Date.now() - new Date(event.time).getTime();
                const diffMins  = Math.floor(diffMs / 60_000);
                const diffHours = Math.floor(diffMs / 3_600_000);
                const diffDays  = Math.floor(diffMs / 86_400_000);
                const timeStr   = diffMins < 1   ? 'ahora'
                                : diffMins < 60  ? `hace ${diffMins}m`
                                : diffHours < 24 ? `hace ${diffHours}h`
                                : diffDays === 1  ? 'ayer'
                                : `hace ${diffDays}d`;
                return (
                  <div
                    key={i}
                    style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: i < 9 ? '1px solid var(--border)' : 'none', alignItems: 'flex-start' }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: event.type === 'sale' ? 'rgba(16,185,129,0.12)' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      {event.type === 'sale'
                        ? <ShoppingBag size={16} color="var(--green)" />
                        : <Plus size={16} color="var(--accent)" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {event.label}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{event.sub}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-3)', fontSize: 11, flexShrink: 0 }}>
                      <Clock size={11} />
                      {timeStr}
                      {event.type === 'sale' && (
                        <button
                          className="btn-icon"
                          style={{ marginLeft: 8, color: 'var(--red)', opacity: 0.7 }}
                          onClick={() => deleteSale(event.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            {allSales.length === 0 && stock.length === 0 && (
              <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                Sin actividad registrada aún
              </div>
            )}
          </div>
        </div>
      )}
      {ConfirmDialog}

      {detailCat && (
        <ProfitBreakdownModal
          cat={detailCat}
          stats={catBreakdown[detailCat]}
          lines={linesFor(detailCat)}
          pendingRepairs={catBreakdown.pendingRepairs}
          periodLabel={RANGE_LABELS[range]}
          onClose={() => setDetailCat(null)}
        />
      )}
    </div>
  );
}
