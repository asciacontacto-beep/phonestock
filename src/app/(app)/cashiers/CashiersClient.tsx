"use client"
import { useState } from 'react';
import { PAY } from '@/constants/data';
import {
  Lock, AlertTriangle, CheckCircle2, Wallet,
  ArrowRightLeft, X, Building2, ArrowRight, Plus
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Props {
  sales: any[];
  user: any;
  realSellers: any[];
  deposits: any[];
  transfers: any[];
  movements: any[];
}

type PayMethod = { id: string; l: string; p: string };

const PAY_LABELS: PayMethod[] = [
  { id: 'ars_cash',   l: 'Efectivo ARS',      p: 'ARS' },
  { id: 'usd_cash',   l: 'Dólar Billete',      p: 'U$' },
  { id: 'ars_transf', l: 'Transferencia ARS',  p: 'ARS' },
  { id: 'usd_transf', l: 'Transferencia USD',  p: 'U$' },
  { id: 'usdt',       l: 'Cripto USDT',        p: 'U$' },
];

export function CashiersClient({ sales, user, realSellers, deposits, transfers, movements }: Props) {
  const [showClose, setShowClose] = useState(false);
  const [showExchange, setShowExchange] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [exLoading, setExLoading] = useState(false);
  const [trLoading, setTrLoading] = useState(false);
  const [showMovement, setShowMovement] = useState(false);
  const [mvLoading, setMvLoading] = useState(false);
  const [declared, setDeclared] = useState<Record<string, string>>({ ars_cash: '', usd_cash: '' });
  const [closureResult, setClosureResult] = useState<any>(null);

  const [exForm, setExForm] = useState({ fromCur: 'ARS', fromAmt: '', toCur: 'USD', toAmt: '' });
  const [trForm, setTrForm] = useState({
    from_deposit_id: deposits[0]?.id?.toString() || '',
    to_deposit_id:   deposits[1]?.id?.toString() || deposits[0]?.id?.toString() || '',
    amount:          '',
    currency:        'ARS',
    payment_method:  'ars_cash',
    notes:           '',
  });
  const [mvForm, setMvForm] = useState({
    type: 'IN',
    deposit_id: deposits[0]?.id?.toString() || '',
    amount: '',
    currency: 'ARS',
    payment_method: 'ars_cash',
    notes: ''
  });

  const supabase = createClient();
  const router   = useRouter();

  const isOwner = user.role === 'owner';

  // ─── helpers ─────────────────────────────────────────────────────────────

  /** Compute totals per payment method for a given array of sales + transfers + movements */
  const computeTotals = (saleList: any[], inTransfers: any[], outTransfers: any[], depMovements: any[]) => {
    const t: Record<string, number> = {};
    PAY_LABELS.forEach(p => { t[p.id] = 0; });
    saleList.forEach(v => {
      if (v.payments && Array.isArray(v.payments)) {
        v.payments.forEach((p: any) => {
          t[p.id] = (t[p.id] || 0) + (p.original_amount ?? p.amount);
        });
      }
    });
    // Add incoming transfers
    inTransfers.forEach(tr => {
      t[tr.payment_method] = (t[tr.payment_method] || 0) + Number(tr.amount);
    });
    // Subtract outgoing transfers
    outTransfers.forEach(tr => {
      t[tr.payment_method] = (t[tr.payment_method] || 0) - Number(tr.amount);
    });
    // Add manual cash movements
    depMovements.forEach(m => {
      if (m.movement_type === 'IN') {
        t[m.payment_method] = (t[m.payment_method] || 0) + Number(m.amount);
      } else if (m.movement_type === 'OUT') {
        t[m.payment_method] = (t[m.payment_method] || 0) - Number(m.amount);
      }
    });
    return t;
  };

  /**
   * Map each seller to the deposits they belong to.
   * sales have seller_id; profiles have deposit_ids.
   */
  const sellerDepositMap = new Map<string, number[]>();
  realSellers.forEach(s => {
    sellerDepositMap.set(s.id, s.deposit_ids || []);
  });

  /**
   * Build per-deposit data.
   * A sale "belongs" to a deposit if the seller is assigned to it.
   * If seller has multiple deposits, the sale appears in all of them (rare edge case,
   * but the user said multi-deposit is possible).
   */
  const buildDepositData = () => {
    return deposits.map(dep => {
      const depId = String(dep.id);
      // Sellers assigned to this deposit
      const depSellers = realSellers.filter(s =>
        (s.deposit_ids || []).map(String).includes(depId)
      );
      const depSellerIds = new Set(depSellers.map((s: any) => s.id));

      // Sales that belong to this deposit: explicit deposit_id or via seller assignment
      const depSales = sales.filter(v =>
        (v.deposit_id && String(v.deposit_id) === depId) ||
        (!v.deposit_id && depSellerIds.has(v.seller_id || v.sellerId))
      );

      // Transfers in/out of this deposit (compare as strings for UUID safety)
      const inTransfers  = transfers.filter(tr => String(tr.to_deposit_id)   === depId);
      const outTransfers = transfers.filter(tr => String(tr.from_deposit_id) === depId);
      const depMovements = movements.filter(m => String(m.deposit_id) === depId);

      const totals = computeTotals(depSales, inTransfers, outTransfers, depMovements);

      return { dep, depSellers, depSales, totals, inTransfers, outTransfers, depMovements };
    });
  };

  const depositData = buildDepositData();

  // Unassigned sales (seller has no deposit or seller not in realSellers)
  const allAssignedSellerIds = new Set(realSellers.flatMap((s: any) => (s.deposit_ids?.length > 0) ? [s.id] : []));
  const unassignedSales = sales.filter(v => !allAssignedSellerIds.has(v.seller_id || v.sellerId)
    && v.brand !== 'MOVIMIENTO'  // ignore internal movements
  );

  // ─── handlers ────────────────────────────────────────────────────────────

  const handleClose = () => {
    const mySales = sales.filter(v => (v.seller_id || v.sellerId) === user.id);
    const expected: Record<string, number> = {};
    PAY.forEach(p => { expected[p.id] = 0; });
    mySales.forEach(v => v.payments.forEach((p: any) => { expected[p.id] += (p.original_amount ?? p.amount); }));
    const result = {
      date: new Date().toLocaleString('es-AR'),
      expected,
      declared: {
        ars_cash: parseFloat(declared.ars_cash) || 0,
        usd_cash: parseFloat(declared.usd_cash) || 0
      },
      diff: {
        ars: (parseFloat(declared.ars_cash) || 0) - expected.ars_cash,
        usd: (parseFloat(declared.usd_cash) || 0) - expected.usd_cash,
      }
    };
    setClosureResult(result);
  };

  const handleExchange = async () => {
    const { fromCur, fromAmt, toCur, toAmt } = exForm;
    if (!fromAmt || !toAmt) { toast.error('Ingresá ambos montos'); return; }
    if (fromCur === toCur) { toast.error('Las monedas deben ser distintas'); return; }
    setExLoading(true);
    try {
      const saleData = {
        seller_id: user.id, seller_name: user.name,
        brand: 'MOVIMIENTO', model: 'CAMBIO DE DIVISA',
        storage: '-', color: '-', imei: `EXC-${Date.now()}`,
        cost_price: 0, price: 0, currency: 'USD',
        payments: [
          { id: fromCur === 'ARS' ? 'ars_cash' : 'usd_cash', amount: -parseFloat(fromAmt), original_amount: -parseFloat(fromAmt), label: `Egreso ${fromCur}` },
          { id: toCur === 'ARS' ? 'ars_cash' : 'usd_cash', amount: parseFloat(toAmt), original_amount: parseFloat(toAmt), label: `Ingreso ${toCur}` }
        ]
      };
      const { error } = await supabase.from('sales').insert([saleData]);
      if (error) throw error;
      toast.success('Movimiento registrado');
      setShowExchange(false);
      setExForm({ fromCur: 'ARS', fromAmt: '', toCur: 'USD', toAmt: '' });
      router.refresh();
    } catch {
      toast.error('Error al registrar movimiento');
    } finally {
      setExLoading(false);
    }
  };

  const handleTransfer = async () => {
    const { from_deposit_id, to_deposit_id, amount, currency, payment_method, notes } = trForm;
    if (!amount || parseFloat(amount) <= 0) { toast.error('Ingresá un monto válido'); return; }
    if (from_deposit_id === to_deposit_id) { toast.error('El origen y destino deben ser distintos'); return; }

    const transferAmount = parseFloat(amount);
    
    // Validate if enough balance
    const fromDepData = depositData.find(d => String(d.dep.id) === from_deposit_id);
    if (fromDepData) {
      const availableBalance = fromDepData.totals[payment_method] || 0;
      if (transferAmount > availableBalance) {
        toast.error(`Saldo insuficiente en la caja origen. Disponible: ${availableBalance.toLocaleString()}`);
        return;
      }
    }

    setTrLoading(true);
    try {
      const { error } = await supabase.from('cash_transfers').insert([{
        from_deposit_id,
        to_deposit_id,
        amount:          parseFloat(amount),
        currency,
        payment_method,
        notes:           notes.trim() || null,
        created_by:      user.id,
        created_by_name: user.name,
      }]);
      if (error) throw error;
      const fromName = deposits.find(d => String(d.id) === from_deposit_id)?.name || '?';
      const toName   = deposits.find(d => String(d.id) === to_deposit_id)?.name   || '?';
      toast.success(`Transferencia registrada: ${fromName} → ${toName}`);
      setShowTransfer(false);
      setTrForm({
        from_deposit_id: deposits[0]?.id?.toString() || '',
        to_deposit_id:   deposits[1]?.id?.toString() || deposits[0]?.id?.toString() || '',
        amount: '', currency: 'ARS', payment_method: 'ars_cash', notes: '',
      });
      router.refresh();
    } catch (e: any) {
      toast.error('Error: ' + (e.message || JSON.stringify(e)));
    } finally {
      setTrLoading(false);
    }
  };

  const handleMovement = async () => {
    const { type, deposit_id, amount, currency, payment_method, notes } = mvForm;
    if (!amount || parseFloat(amount) <= 0) { toast.error('Ingresá un monto válido'); return; }
    if (!deposit_id) { toast.error('Seleccioná un depósito'); return; }
    setMvLoading(true);
    try {
      const { error } = await supabase.from('cash_movements').insert([{
        deposit_id,
        movement_type:   type,
        amount:          parseFloat(amount),
        currency,
        payment_method,
        notes:           notes.trim() || null,
        created_by:      user.id,
        created_by_name: user.name,
      }]);
      if (error) throw error;
      toast.success(type === 'IN' ? 'Ingreso registrado' : 'Egreso registrado');
      setShowMovement(false);
      setMvForm({ type: 'IN', deposit_id: deposits[0]?.id?.toString() || '', amount: '', currency: 'ARS', payment_method: 'ars_cash', notes: '' });
      router.refresh();
    } catch (e: any) {
      toast.error('Error: ' + (e.message || JSON.stringify(e)));
    } finally {
      setMvLoading(false);
    }
  };

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div className="st">{isOwner ? 'Control de Cajas' : 'Mi Caja'}</div>
          <div className="ss2">Saldo por depósito · Ventas y transferencias</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {isOwner && (
            <button className="btn btn-outline" onClick={() => setShowTransfer(true)}>
              <ArrowRightLeft size={18} /> Transferir entre cajas
            </button>
          )}
          {isOwner && (
            <button className="btn btn-outline" onClick={() => setShowExchange(true)}>
              <ArrowRightLeft size={18} /> Cambio de Divisa
            </button>
          )}
          {isOwner && (
            <button className="btn btn-dark" onClick={() => setShowMovement(true)}>
              <Plus size={18} /> Ingreso / Egreso
            </button>
          )}
          {user.role === 'seller' && (
            <button className="btn btn-dark" onClick={() => setShowClose(true)}>
              <Lock size={18} /> Cerrar Turno
            </button>
          )}
        </div>
      </div>

      {/* Owner: resumen general */}
      {isOwner && (() => {
        const totals: Record<string, number> = {};
        PAY_LABELS.forEach(p => { totals[p.id] = 0; });
        sales.forEach(v => {
          if (v.payments && Array.isArray(v.payments)) {
            v.payments.forEach((p: any) => { totals[p.id] = (totals[p.id] || 0) + (p.original_amount ?? p.amount); });
          }
        });
        const hasAny = PAY_LABELS.some(it => totals[it.id] !== 0);
        if (!hasAny) return null;
        return (
          <div className="card" style={{ marginBottom: 28, padding: 20 }}>
            <div className="sl" style={{ marginBottom: 16 }}>Resumen General — {sales.filter(s => s.brand !== 'MOVIMIENTO').length} ventas</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              {PAY_LABELS.map(it => totals[it.id] !== 0 ? (
                <div key={it.id} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{it.l}</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 16, color: totals[it.id] < 0 ? 'var(--red)' : 'var(--text)' }}>
                    {it.p} {totals[it.id].toLocaleString('es-AR')}
                  </div>
                </div>
              ) : null)}
            </div>
          </div>
        );
      })()}

      {/* Deposit cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {depositData.map(({ dep, depSellers, depSales, totals, inTransfers, outTransfers }) => {
          // For non-owner, only show deposits they belong to
          if (!isOwner && !(user.deposit_ids || []).map(String).includes(String(dep.id))) return null;

          const hasSales    = depSales.length > 0;
          const hasMovement = inTransfers.length > 0 || outTransfers.length > 0;
          const hasAnything = PAY_LABELS.some(it => totals[it.id] !== 0);

          return (
            <div key={dep.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Deposit header */}
              <div style={{ padding: '18px 24px', background: 'var(--surface-3)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={20} style={{ color: 'var(--text-2)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{dep.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {depSellers.length > 0
                      ? depSellers.map((s: any) => s.name).join(', ')
                      : 'Sin vendedores asignados'}
                    {' · '}{depSales.filter((s: any) => s.brand !== 'MOVIMIENTO').length} ventas
                  </div>
                </div>
              </div>

              {/* Totals row */}
              <div style={{ padding: '20px 24px', background: 'var(--surface-2)', borderBottom: hasAnything ? '1px solid var(--border)' : 'none' }}>
                {hasAnything ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                    {PAY_LABELS.map(it => totals[it.id] !== 0 ? (
                      <div key={it.id} style={{ background: 'var(--surface-3)', borderRadius: 10, padding: '12px 16px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{it.l}</div>
                        <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 15, color: totals[it.id] < 0 ? 'var(--red)' : 'var(--text)' }}>
                          {it.p} {totals[it.id].toLocaleString('es-AR')}
                        </div>
                      </div>
                    ) : null)}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-3)', padding: '12px 0' }}>
                    <Wallet size={20} style={{ opacity: 0.3 }} />
                    <span style={{ fontSize: 14 }}>Sin movimientos en caja</span>
                  </div>
                )}
              </div>

              {/* Sellers breakdown (owner only) */}
              {isOwner && depSellers.length > 0 && (
                <div style={{ padding: '16px 24px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Desglose por Vendedor
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {depSellers.map((s: any) => {
                      const sellerSales = depSales.filter(v => (v.seller_id || v.sellerId) === s.id);
                      const st: Record<string, number> = {};
                      PAY_LABELS.forEach(p => { st[p.id] = 0; });
                      sellerSales.forEach(v => {
                        if (v.payments && Array.isArray(v.payments)) {
                          v.payments.forEach((p: any) => { st[p.id] = (st[p.id] || 0) + (p.original_amount ?? p.amount); });
                        }
                      });
                      const sellerHasAny = PAY_LABELS.some(it => st[it.id] !== 0);
                      return (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 10 }}>
                          <div className="av" style={{ background: s.color, color: '#000', width: 32, height: 32, fontSize: 12, flexShrink: 0 }}>{s.initials}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{sellerSales.filter(s => s.brand !== 'MOVIMIENTO').length} ventas</div>
                          </div>
                          {sellerHasAny && (
                            <div style={{ display: 'flex', gap: 12, fontFamily: 'JetBrains Mono', fontSize: 13 }}>
                              {PAY_LABELS.map(it => st[it.id] !== 0 ? (
                                <span key={it.id} style={{ color: st[it.id] < 0 ? 'var(--red)' : 'var(--text-2)' }}>
                                  {it.p} {st[it.id].toLocaleString('es-AR')}
                                </span>
                              ) : null)}
                            </div>
                          )}
                          {!sellerHasAny && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Sin ventas</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Transfers in/out */}
                  {(inTransfers.length > 0 || outTransfers.length > 0) && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Transferencias de Caja
                      </div>
                      {[...inTransfers.map(t => ({ ...t, dir: 'in' })), ...outTransfers.map(t => ({ ...t, dir: 'out' }))].map(tr => {
                        const fromDep = deposits.find(d => d.id === tr.from_deposit_id)?.name || '?';
                        const toDep   = deposits.find(d => d.id === tr.to_deposit_id)?.name   || '?';
                        const payLabel = PAY_LABELS.find(p => p.id === tr.payment_method);
                        return (
                          <div key={tr.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 6 }}>
                            <ArrowRight size={14} style={{ color: tr.dir === 'in' ? 'var(--green)' : 'var(--red)', transform: tr.dir === 'out' ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
                            <div style={{ flex: 1, fontSize: 12 }}>
                              <span style={{ color: 'var(--text-3)' }}>{fromDep}</span>
                              <span style={{ color: 'var(--text-3)', margin: '0 4px' }}>→</span>
                              <span style={{ color: 'var(--text-3)' }}>{toDep}</span>
                              {tr.notes && <span style={{ marginLeft: 6, color: 'var(--text-3)' }}>· {tr.notes}</span>}
                            </div>
                            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color: tr.dir === 'in' ? 'var(--green)' : 'var(--red)' }}>
                              {tr.dir === 'in' ? '+' : '-'}{payLabel?.p} {Number(tr.amount).toLocaleString('es-AR')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Manual Movements */}
                  {dep.depMovements?.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Ingresos y Egresos (Manual)
                      </div>
                      {dep.depMovements.map((m: any) => {
                        const payLabel = PAY_LABELS.find(p => p.id === m.payment_method);
                        return (
                          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 6 }}>
                            <ArrowRight size={14} style={{ color: m.movement_type === 'IN' ? 'var(--green)' : 'var(--red)', transform: m.movement_type === 'OUT' ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
                            <div style={{ flex: 1, fontSize: 12 }}>
                              <span style={{ color: 'var(--text-3)' }}>{m.movement_type === 'IN' ? 'Ingreso a caja' : 'Retiro de caja'}</span>
                              {m.notes && <span style={{ marginLeft: 6, color: 'var(--text-3)' }}>· {m.notes}</span>}
                            </div>
                            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color: m.movement_type === 'IN' ? 'var(--green)' : 'var(--red)' }}>
                              {m.movement_type === 'IN' ? '+' : '-'}{payLabel?.p} {Number(m.amount).toLocaleString('es-AR')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Historial de ventas */}
              {depSales.filter((s: any) => s.brand !== 'MOVIMIENTO').length > 0 && (
                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Historial de Ventas
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {depSales.filter((s: any) => s.brand !== 'MOVIMIENTO').map((sale: any) => (
                      <div key={sale.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{sale.brand} {sale.model}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                            Vendedor: {sale.seller_name || sale.sellerId} • IMEI/SN: {sale.imei || '-'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontFamily: 'JetBrains Mono', fontSize: 13 }}>
                          <div style={{ color: 'var(--text)' }}>
                            {sale.currency === 'USD' ? 'U$' : 'ARS'} {sale.price.toLocaleString('es-AR')}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                            {sale.payments?.map((p: any) => PAY_LABELS.find(l => l.id === p.id)?.l || p.id).join(', ')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Unassigned sales (owner only) */}
        {isOwner && unassignedSales.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--amber)', opacity: 0.85 }}>
            <div style={{ padding: '18px 24px', background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid var(--amber)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <AlertTriangle size={18} style={{ color: 'var(--amber)' }} />
              <div>
                <div style={{ fontWeight: 700 }}>Ventas sin depósito asignado</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Estos vendedores no tienen depósito asignado aún</div>
              </div>
            </div>
            <div style={{ padding: '16px 24px' }}>
              {(() => {
                const ut: Record<string, number> = {};
                PAY_LABELS.forEach(p => { ut[p.id] = 0; });
                unassignedSales.forEach(v => {
                  if (v.payments && Array.isArray(v.payments)) {
                    v.payments.forEach((p: any) => { ut[p.id] = (ut[p.id] || 0) + (p.original_amount ?? p.amount); });
                  }
                });
                return (
                  <div style={{ display: 'flex', gap: 16, fontFamily: 'JetBrains Mono', fontSize: 14 }}>
                    {PAY_LABELS.map(it => ut[it.id] !== 0 ? (
                      <span key={it.id}>{it.p} {ut[it.id].toLocaleString('es-AR')}</span>
                    ) : null)}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* ─── Modal: Cierre de turno ─────────────────────────────── */}
      {showClose && !closureResult && (
        <div className="mo">
          <div className="mb" style={{ maxWidth: 450 }}>
            <div className="mh">
              <div className="mt">Cierre de Caja "Ciego"</div>
              <button className="btn-ghost" onClick={() => setShowClose(false)}>×</button>
            </div>
            <div className="mbd">
              <div className="badge b-amber" style={{ marginBottom: 20, display: 'flex', gap: 10, padding: 12 }}>
                <AlertTriangle size={16} /> Declare el monto físico exacto en caja. El sistema verificará diferencias.
              </div>
              <div className="field">
                <label className="lbl">Total Efectivo Pesos (ARS)</label>
                <input className="inp" type="number" placeholder="Ingrese monto..." value={declared.ars_cash} onChange={e => setDeclared({ ...declared, ars_cash: e.target.value })} />
              </div>
              <div className="field">
                <label className="lbl">Total Efectivo Dólares (U$)</label>
                <input className="inp" type="number" placeholder="Ingrese monto..." value={declared.usd_cash} onChange={e => setDeclared({ ...declared, usd_cash: e.target.value })} />
              </div>
              <div className="divider" />
              <button className="btn btn-dark btn-lg" style={{ width: '100%' }} onClick={handleClose}>
                Confirmar y Ver Diferencias
              </button>
            </div>
          </div>
        </div>
      )}

      {closureResult && (
        <div className="mo">
          <div className="mb" style={{ maxWidth: 500 }}>
            <div className="mh">
              <div className="mt">Resultado del Cierre</div>
              <button className="btn-ghost" onClick={() => { setClosureResult(null); setShowClose(false); }}>×</button>
            </div>
            <div className="mbd">
              <div className="sg" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="sc" style={{ background: closureResult.diff.ars === 0 ? 'var(--green-bg)' : 'rgba(239, 68, 68, 0.1)' }}>
                  <div className="sl">Diferencia ARS</div>
                  <div className="sv" style={{ color: closureResult.diff.ars >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 20 }}>
                    {closureResult.diff.ars >= 0 ? '+' : ''} ARS {closureResult.diff.ars.toLocaleString('es-AR')}
                  </div>
                </div>
                <div className="sc" style={{ background: closureResult.diff.usd === 0 ? 'var(--green-bg)' : 'rgba(239, 68, 68, 0.1)' }}>
                  <div className="sl">Diferencia USD</div>
                  <div className="sv" style={{ color: closureResult.diff.usd >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 20 }}>
                    {closureResult.diff.usd >= 0 ? '+' : ''} U$ {closureResult.diff.usd.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="card" style={{ marginTop: 20 }}>
                <div className="sl">Desglose Detallado</div>
                <div className="receipt-row"><span>Esperado Pesos:</span><span>ARS {closureResult.expected.ars_cash.toLocaleString('es-AR')}</span></div>
                <div className="receipt-row"><span>Declarado Pesos:</span><span>ARS {closureResult.declared.ars_cash.toLocaleString('es-AR')}</span></div>
                <div className="divider" style={{ margin: '8px 0' }} />
                <div className="receipt-row"><span>Esperado Dólares:</span><span>U$ {closureResult.expected.usd_cash.toLocaleString()}</span></div>
                <div className="receipt-row"><span>Declarado Dólares:</span><span>U$ {closureResult.declared.usd_cash.toLocaleString()}</span></div>
              </div>
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                {Math.abs(closureResult.diff.ars) < 1 && Math.abs(closureResult.diff.usd) < 1 ? (
                  <div style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontWeight: 600 }}>
                    <CheckCircle2 size={24} /> Caja Perfecta
                  </div>
                ) : (
                  <div style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontWeight: 600 }}>
                    <AlertTriangle size={24} /> Se detectaron diferencias
                  </div>
                )}
                <button className="btn btn-dark" style={{ width: '100%', marginTop: 20 }} onClick={() => { setClosureResult(null); setShowClose(false); }}>
                  Finalizar Turno
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Cambio de Divisa ────────────────────────────── */}
      {showExchange && (
        <div className="mo" style={{ zIndex: 1100 }} onClick={() => setShowExchange(false)}>
          <div className="mb" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="mh">
              <div className="mh-title">Cambio de Divisa</div>
              <button className="btn-icon" onClick={() => setShowExchange(false)}><X size={18} /></button>
            </div>
            <div className="mbd" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Monto que ENTREGÁS (Sale de caja)</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <select className="inp" style={{ flex: 1 }} value={exForm.fromCur} onChange={e => setExForm(p => ({ ...p, fromCur: e.target.value }))}>
                    <option value="ARS">Pesos (ARS)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                  <input className="inp" type="number" style={{ flex: 2 }} placeholder="0" value={exForm.fromAmt} onChange={e => setExForm(p => ({ ...p, fromAmt: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}><ArrowRightLeft size={20} style={{ color: 'var(--text-3)', transform: 'rotate(90deg)' }} /></div>
              <div style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Monto que RECIBÍS (Entra a caja)</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <select className="inp" style={{ flex: 1 }} value={exForm.toCur} onChange={e => setExForm(p => ({ ...p, toCur: e.target.value }))}>
                    <option value="USD">Dólares (USD)</option>
                    <option value="ARS">Pesos (ARS)</option>
                  </select>
                  <input className="inp" type="number" style={{ flex: 2 }} placeholder="0" value={exForm.toAmt} onChange={e => setExForm(p => ({ ...p, toAmt: e.target.value }))} />
                </div>
              </div>
              <button className="btn btn-dark btn-lg" style={{ width: '100%', marginTop: 8 }} onClick={handleExchange} disabled={exLoading}>
                {exLoading ? 'Registrando...' : 'Confirmar Cambio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Transferencia entre depósitos ──────────────── */}
      {showTransfer && (
        <div className="mo" style={{ zIndex: 1100 }} onClick={() => setShowTransfer(false)}>
          <div className="mb" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="mh">
              <div>
                <div className="mh-title">Transferir Efectivo entre Cajas</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>Registra el movimiento físico de dinero entre depósitos</div>
              </div>
              <button className="btn-icon" onClick={() => setShowTransfer(false)}><X size={18} /></button>
            </div>
            <div className="mbd" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* From / To */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'end' }}>
                <div className="field" style={{ margin: 0 }}>
                  <label className="lbl">Depósito ORIGEN (sale)</label>
                  <select className="inp" value={trForm.from_deposit_id} onChange={e => setTrForm(p => ({ ...p, from_deposit_id: e.target.value }))}>
                    {deposits.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                  </select>
                </div>
                <div style={{ paddingBottom: 10, color: 'var(--text-3)' }}>
                  <ArrowRight size={20} />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label className="lbl">Depósito DESTINO (entra)</label>
                  <select className="inp" value={trForm.to_deposit_id} onChange={e => setTrForm(p => ({ ...p, to_deposit_id: e.target.value }))}>
                    {deposits.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Amount + currency */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field" style={{ margin: 0 }}>
                  <label className="lbl">Monto</label>
                  <input className="inp" type="number" placeholder="0.00" value={trForm.amount} onChange={e => setTrForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label className="lbl">Método / Tipo</label>
                  <select className="inp" value={trForm.payment_method} onChange={e => setTrForm(p => ({
                    ...p, payment_method: e.target.value,
                    currency: ['ars_cash','ars_transf'].includes(e.target.value) ? 'ARS' : 'USD'
                  }))}>
                    <option value="ars_cash">Efectivo ARS</option>
                    <option value="usd_cash">Dólar Billete</option>
                    <option value="ars_transf">Transferencia ARS</option>
                    <option value="usd_transf">Transferencia USD</option>
                    <option value="usdt">USDT</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="field" style={{ margin: 0 }}>
                <label className="lbl">Notas (opcional)</label>
                <input className="inp" placeholder="Ej: Cierre de semana, cobro de deuda..." value={trForm.notes} onChange={e => setTrForm(p => ({ ...p, notes: e.target.value }))} />
              </div>

              {/* Warning if same deposit */}
              {trForm.from_deposit_id === trForm.to_deposit_id && (
                <div className="badge b-amber" style={{ padding: 10, display: 'flex', gap: 8 }}>
                  <AlertTriangle size={14} /> El origen y destino deben ser depósitos distintos
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowTransfer(false)}>Cancelar</button>
                <button className="btn btn-dark" style={{ flex: 1 }} onClick={handleTransfer} disabled={trLoading || trForm.from_deposit_id === trForm.to_deposit_id}>
                  {trLoading ? 'Registrando...' : <><Plus size={15} /> Registrar Transferencia</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Movimiento Manual (Ingreso / Egreso) ────────── */}
      {showMovement && (
        <div className="mo" style={{ zIndex: 1100 }} onClick={() => setShowMovement(false)}>
          <div className="mb" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="mh">
              <div>
                <div className="mh-title">Ingreso / Egreso Manual</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>Registrar entrada o salida de efectivo (Ej: Inicio de caja)</div>
              </div>
              <button className="btn-icon" onClick={() => setShowMovement(false)}><X size={18} /></button>
            </div>
            <div className="mbd" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field" style={{ margin: 0 }}>
                  <label className="lbl">Tipo de Movimiento</label>
                  <select className="inp" value={mvForm.type} onChange={e => setMvForm(p => ({ ...p, type: e.target.value }))}>
                    <option value="IN">Ingreso (Entra a caja)</option>
                    <option value="OUT">Egreso (Sale de caja)</option>
                  </select>
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label className="lbl">Caja / Depósito</label>
                  <select className="inp" value={mvForm.deposit_id} onChange={e => setMvForm(p => ({ ...p, deposit_id: e.target.value }))}>
                    {deposits.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field" style={{ margin: 0 }}>
                  <label className="lbl">Monto</label>
                  <input className="inp" type="number" placeholder="0.00" value={mvForm.amount} onChange={e => setMvForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label className="lbl">Método / Moneda</label>
                  <select className="inp" value={mvForm.payment_method} onChange={e => setMvForm(p => ({
                    ...p, payment_method: e.target.value,
                    currency: ['ars_cash','ars_transf'].includes(e.target.value) ? 'ARS' : 'USD'
                  }))}>
                    <option value="ars_cash">Efectivo ARS</option>
                    <option value="usd_cash">Dólar Billete</option>
                    <option value="ars_transf">Transferencia ARS</option>
                    <option value="usd_transf">Transferencia USD</option>
                    <option value="usdt">USDT</option>
                  </select>
                </div>
              </div>

              <div className="field" style={{ margin: 0 }}>
                <label className="lbl">Notas / Motivo (opcional)</label>
                <input className="inp" placeholder="Ej: Flujo de inicio de caja..." value={mvForm.notes} onChange={e => setMvForm(p => ({ ...p, notes: e.target.value }))} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowMovement(false)}>Cancelar</button>
                <button className="btn btn-dark" style={{ flex: 1 }} onClick={handleMovement} disabled={mvLoading}>
                  {mvLoading ? 'Registrando...' : <><Plus size={15} /> Registrar {mvForm.type === 'IN' ? 'Ingreso' : 'Egreso'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
