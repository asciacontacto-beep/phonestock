"use client"
import { useState, useMemo } from 'react';
import { categoryBreakdown, totalsFromBreakdown, saleCategory, saleExchangeRate, toUSD, isRepairClosed } from '@/utils/sales';
import { ProfitBreakdownModal, type ProfitLine } from '@/components/ProfitBreakdownModal';
import { Sparkline } from '@/components/Sparkline';
import { voidSale, voidSaleSummary } from '@/utils/voidSale';
import { logAudit } from '@/utils/audit';
import { Download, Package, AlertTriangle, Trash2 } from 'lucide-react';
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

  /* ── Seller stats ──────────────────────────────────── */
  const { topSeller } = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {};
    filteredSales.forEach(s => {
      if (!s.seller_id) return;
      if (!counts[s.seller_id]) counts[s.seller_id] = { name: s.seller_name || 'Sin nombre', count: 0 };
      counts[s.seller_id].count++;
    });
    const list = Object.values(counts).sort((a, b) => b.count - a.count);
    return { topSeller: list[0] };
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

  /* ── Ganancia día a día de las últimas 4 semanas ──────────────
     El número grande dice cuánto ganaste; esto dice si venís subiendo o
     cayendo, que es lo que un número solo no puede responder. Va siempre
     sobre 28 días, independiente del filtro, para que sea comparable. */
  const profitSeries = useMemo(() => {
    const DAYS = 28;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (DAYS - 1));

    const buckets: { sales: any[]; repairs: any[] }[] =
      Array.from({ length: DAYS }, () => ({ sales: [], repairs: [] }));

    const indexOf = (t?: string | null) => {
      if (!t) return -1;
      const d = new Date(t);
      if (Number.isNaN(d.getTime())) return -1;
      const i = Math.floor((d.getTime() - start.getTime()) / 86_400_000);
      return i >= 0 && i < DAYS ? i : -1;
    };

    allSales.forEach(s => { const i = indexOf(s.created_at); if (i >= 0) buckets[i].sales.push(s); });
    repairs.forEach(r => { const i = indexOf(r.updated_at || r.created_at); if (i >= 0) buckets[i].repairs.push(r); });

    return buckets.map(b => totalsFromBreakdown(categoryBreakdown(b.sales, b.repairs, exchangeRate)).profit);
  }, [allSales, repairs, exchangeRate]);

  const hasSeries = useMemo(() => profitSeries.some(v => v !== 0), [profitSeries]);

  /* ── Qué conviene reponer ────────────────────────────────────
     La decisión que un local de celulares toma todas las semanas es qué
     comprar. Cruza lo que se vendió en el período con lo que queda en
     stock: un modelo que deja plata y ya no tenés es plata que dejás de
     hacer. Reports muestra la rentabilidad por modelo; esto muestra qué
     hacer con esa información. */
  const restock = useMemo(() => {
    const byModel = new Map<string, { model: string; units: number; profit: number; stock: number }>();

    filteredSales.filter(s => saleCategory(s) === 'device').forEach(s => {
      const key = `${s.brand} ${s.model}`.trim();
      const rate = saleExchangeRate(s, exchangeRate);
      const profit = toUSD(s.price || 0, s.currency, rate) - toUSD(s.cost_price || 0, s.currency, rate);
      const cur = byModel.get(key) || { model: key, units: 0, profit: 0, stock: 0 };
      cur.units += 1;
      cur.profit += profit;
      byModel.set(key, cur);
    });

    if (byModel.size === 0) return [];

    av.forEach(s => {
      const key = `${s.brand} ${s.model}`.trim();
      const cur = byModel.get(key);
      if (cur) cur.stock += 1;
    });

    return Array.from(byModel.values())
      .filter(m => m.profit > 0)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 6);
  }, [filteredSales, av, exchangeRate]);

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

  // Negocio recién creado: mostrar el próximo paso, no ocho tarjetas en cero.
  if (isEmpty) {
    return (
      <div className="page">
        <div className="sh" style={{ marginBottom: 20 }}>
          <h1 className="st">Resumen</h1>
        </div>
        <div className="panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div className="d-empty-icon" style={{ width: 56, height: 56 }}>
            <Package size={24} />
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
            Empecemos por el inventario
          </div>
          <div className="d-empty-text" style={{ marginBottom: 22 }}>
            Cargá tu primer equipo y desde acá vas a ver cuánto ganás, qué se
            vende y qué te conviene reponer.
          </div>
          <button className="btn btn-dark" onClick={() => router.push('/scan')}>
            <Package size={17} style={{ marginRight: 8 }} /> Cargar mi primer equipo
          </button>
        </div>
        {ConfirmDialog}
      </div>
    );
  }

  return (
    <div className="page">

      {/* Header */}
      <div className="sh" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="st">Resumen</h1>
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

      {/* ── Lo primero: cuánto ganaste y de dónde salió ────────── */}
      <div className="d-hero">
        <div className="d-hero-grid">
          <div>
            <div className="sl" style={{ marginBottom: 8 }}>Ganancia · {RANGE_LABELS[range].toLowerCase()}</div>

            <div className="d-hero-top">
              <div className={`d-hero-value ${profitUSD >= 0 ? 'pos' : 'neg'}`}>
                U$ {Math.round(profitUSD).toLocaleString('es-AR')}
              </div>
              {profitDelta != null && (
                <span className={`d-delta ${profitDelta >= 0 ? 'pos' : 'neg'}`}>
                  {profitDelta >= 0 ? '↑' : '↓'} {Math.abs(Math.round(profitDelta))}% vs {RANGE_PREV_LABEL[range]}
                </span>
              )}
            </div>

            <div className="d-hero-sub">
              {revenueUSD > 0
                ? <>Facturaste U$ {Math.round(revenueUSD).toLocaleString('es-AR')} · te quedó el <strong>{marginPct}%</strong></>
                : 'Todavía no hubo ventas en este período.'}
            </div>
          </div>

          {/* El espacio de la derecha estaba vacío; acá va la tendencia */}
          {hasSeries && (
            <div className="d-hero-chart">
              <Sparkline
                data={profitSeries}
                color={profitUSD >= 0 ? 'var(--green)' : 'var(--red)'}
              />
              <div className="d-chart-label">ganancia día a día · últimas 4 semanas</div>
            </div>
          )}
        </div>

        {(() => {
          const cats = [
            { key: 'device' as const,    label: 'Equipos',    s: catBreakdown.device,    color: 'var(--blue)' },
            { key: 'accessory' as const, label: 'Accesorios', s: catBreakdown.accessory, color: 'var(--text-3)' },
            { key: 'service' as const,   label: 'Servicio',   s: catBreakdown.service,   color: 'var(--green)' },
          ];
          if (cats.every(c => c.s.profit === 0 && c.s.revenue === 0)) return null;
          const positive = cats.filter(c => c.s.profit > 0);
          const totalPositive = positive.reduce((a, c) => a + c.s.profit, 0);

          return (
            <>
              {positive.length > 1 && (
                <div className="d-split">
                  {positive.map(c => (
                    <span key={c.key}
                      title={`${c.label}: U$ ${Math.round(c.s.profit).toLocaleString('es-AR')}`}
                      style={{ width: `${(c.s.profit / totalPositive) * 100}%`, background: c.color }} />
                  ))}
                </div>
              )}

              <div className="d-legend">
                {cats.map(c => (
                  <button key={c.key} className="d-legend-item" onClick={() => setDetailCat(c.key)}>
                    <div className="d-legend-label">
                      <span className="d-legend-dot" style={{ background: c.color }} />
                      {c.label}
                      {c.s.missingCost > 0 && <AlertTriangle size={11} color="var(--amber)" />}
                    </div>
                    <div className="d-legend-value" style={{ color: c.s.profit >= 0 ? 'var(--text)' : 'var(--red)' }}>
                      U$ {Math.round(c.s.profit).toLocaleString('es-AR')}
                      {c.s.revenue > 0 && <span className="d-legend-pct">{c.s.margin.toFixed(0)}%</span>}
                    </div>
                  </button>
                ))}
              </div>

              <div className="d-hint">Tocá cualquiera para ver cómo se calcula →</div>
            </>
          );
        })()}
      </div>

      {/* ── Estado del negocio ─────────────────────────────────── */}
      <div className="sg" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 14 }}>
        <div className="sc" style={{ cursor: 'pointer' }} onClick={() => router.push('/stock')}>
          <div className="sl">En stock</div>
          <div className="sv">{av.length}</div>
          <div className="sc-sub">equipos sin vender</div>
        </div>

        {userRole !== 'seller' && (
          <div className="sc" style={{ cursor: 'pointer' }} onClick={() => router.push('/stock')}>
            <div className="sl">Capital</div>
            <div className="sv">U$ {Math.round(capitalUSD).toLocaleString('es-AR')}</div>
            <div className="sc-sub">invertido en esos equipos</div>
          </div>
        )}

        <div className="sc">
          <div className="sl">Ventas</div>
          <div className="sv">{filteredSales.length}</div>
          <div className="sc-sub">
            {topSeller ? `mejor: ${topSeller.name.split(' ')[0]}` : RANGE_LABELS[range].toLowerCase()}
          </div>
        </div>

        {userRole !== 'seller' && (
          <div className="sc">
            <div className="sl">Facturación</div>
            <div className="sv">U$ {Math.round(revenueUSD).toLocaleString('es-AR')}</div>
            <div className="sc-sub">{RANGE_LABELS[range].toLowerCase()}</div>
          </div>
        )}
      </div>

      {/* ── Todo lo que pide atención, junto y accionable ───────── */}
      {userRole !== 'seller' && alerts.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <AlertTriangle size={15} color="var(--amber)" />
            <span className="panel-title">Necesitan tu atención</span>
            <span className="panel-count">({alerts.length})</span>
          </div>
          {alerts.map(a => (
            <div key={a.key} className={`panel-row ${a.onClick ? 'is-link' : ''}`} onClick={a.onClick}>
              <span className={`panel-dot ${a.tone}`} />
              <span className="panel-text">{a.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Qué conviene reponer ────────────────────────────────
           Reports explica la rentabilidad por modelo; acá se cruza con el
           stock para que la conclusión sea una acción, no un gráfico. */}
      {userRole !== 'seller' && restock.length > 0 && (
        <div className="panel">
          <div className="panel-head" style={{ display: 'block' }}>
            <div className="panel-title">Lo que más te deja</div>
            <div className="panel-sub">
              Modelos que dejaron ganancia {RANGE_LABELS[range].toLowerCase()} y cuántos te quedan
            </div>
          </div>

          {restock.map(m => {
            const agotado = m.stock === 0;
            const poco = m.stock === 1;
            return (
              <div key={m.model} className="panel-row is-link" onClick={() => router.push('/stock')}>
                <div className="panel-main">
                  <div className="panel-strong">{m.model}</div>
                  <div className="panel-meta">
                    {m.units} {m.units === 1 ? 'vendido' : 'vendidos'} · U$ {Math.round(m.profit / m.units).toLocaleString('es-AR')} c/u
                  </div>
                </div>
                <div className="panel-right">
                  <div className="panel-amount" style={{ color: 'var(--green)' }}>
                    U$ {Math.round(m.profit).toLocaleString('es-AR')}
                  </div>
                  <div className={`panel-note ${agotado ? 'danger' : poco ? 'warn' : ''}`}>
                    {agotado ? 'sin stock — reponer' : poco ? 'queda 1 — reponer' : `${m.stock} en stock`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Últimas operaciones ─────────────────────────────────── */}
      {userRole !== 'seller' && (
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Últimas operaciones</span>
          </div>

          {(() => {
            const events = [
              ...filteredSales.slice(0, 6).map(s => ({
                id: String(s.id), type: 'sale' as const,
                label: `${s.brand} ${s.model}`,
                sub: s.customer?.name || 'Consumidor final',
                time: s.created_at,
              })),
              ...stock.slice(0, 4).map(s => ({
                id: String(s.id), type: 'stock' as const,
                label: `${s.brand} ${s.model}`,
                sub: 'ingresó al stock',
                time: s.created_at,
              })),
            ]
              .filter(e => e.time)
              .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
              .slice(0, 8);

            if (events.length === 0) {
              return (
                <div className="d-empty">
                  <div className="d-empty-icon"><Package size={20} /></div>
                  <div className="d-empty-title">Todavía no pasó nada</div>
                  <div className="d-empty-text">
                    Cuando cargues equipos o hagas ventas, las vas a ver acá.
                  </div>
                </div>
              );
            }

            return events.map(e => {
              const mins = Math.floor((Date.now() - new Date(e.time).getTime()) / 60_000);
              const when = mins < 1 ? 'ahora'
                : mins < 60 ? `hace ${mins}m`
                : mins < 1440 ? `hace ${Math.floor(mins / 60)}h`
                : Math.floor(mins / 1440) === 1 ? 'ayer'
                : `hace ${Math.floor(mins / 1440)}d`;

              return (
                <div key={`${e.type}-${e.id}`} className="panel-row">
                  <span className={`panel-dot ${e.type === 'sale' ? 'green' : 'mute'}`} />
                  <div className="panel-main">
                    <div className="panel-strong">{e.label}</div>
                    <div className="panel-meta">{e.sub}</div>
                  </div>
                  <span className="panel-time">{when}</span>
                  {e.type === 'sale' && (
                    <button className="btn-icon" style={{ color: 'var(--red)', opacity: 0.55, flexShrink: 0 }}
                      title="Anular venta" onClick={() => deleteSale(e.id)}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            });
          })()}
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
