"use client"
import { useState } from 'react';
import { PAY } from '@/constants/data';
import { Lock, AlertTriangle, CheckCircle2, Wallet, ArrowRightLeft, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function CashiersClient({ sales, user, realSellers }: { sales: any[], user: any, realSellers: any[] }) {
  const [showClose, setShowClose] = useState(false);
  const [showExchange, setShowExchange] = useState(false);
  const [exLoading, setExLoading] = useState(false);
  const [exForm, setExForm] = useState({
    fromCur: 'ARS',
    fromAmt: '',
    toCur: 'USD',
    toAmt: ''
  });
  const supabase = createClient();
  const router = useRouter();
  const [declared, setDeclared] = useState<Record<string, string>>({ ars_cash: '', usd_cash: '' });
  const [closureResult, setClosureResult] = useState<any>(null);

  const sls = user.role === 'owner'
    ? (() => {
        const sellersMap = new Map<string, any>();
        realSellers.forEach(s => sellersMap.set(s.id, s));
        sales.forEach(v => {
          const sid = v.seller_id || v.sellerId || 'unknown';
          if (!sellersMap.has(sid)) {
            sellersMap.set(sid, { 
              id: sid, 
              name: v.seller_name || 'Vendedor Desconocido', 
              initials: (v.seller_name || 'U').substring(0, 2).toUpperCase(), 
              color: '#666' 
            });
          }
        });
        if (!sellersMap.has(user.id)) {
          sellersMap.set(user.id, { ...user, name: user.name + ' (Admin)' });
        }
        return Array.from(sellersMap.values());
      })()
    : [user];
  
  const handleClose = () => {
    const mySales = sales.filter(v => (v.seller_id || v.sellerId || 'unknown') === user.id);
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
        usd: (parseFloat(declared.usd_cash) || 0) - expected.usd_cash
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
        seller_id: user.id,
        seller_name: user.name,
        brand: 'MOVIMIENTO',
        model: 'CAMBIO DE DIVISA',
        storage: '-', color: '-', imei: `EXC-${Date.now()}`,
        cost_price: 0,
        price: 0, currency: 'USD',
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
    } catch (e: any) {
      toast.error('Error al registrar movimiento');
    } finally {
      setExLoading(false);
    }
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div className="st">{user.role === 'owner' ? 'Control de Cajas' : 'Mi Terminal de Caja'}</div>
          <div className="ss2">Resumen de operaciones y cierre de turno</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-outline" onClick={() => setShowExchange(true)}>
            <ArrowRightLeft size={18} /> Cambio de Divisa
          </button>
          {user.role === 'seller' && (
            <button className="btn btn-dark" onClick={() => setShowClose(true)}>
              <Lock size={18} /> Cerrar Turno
            </button>
          )}
        </div>
      </div>

      {user.role === 'owner' && (() => {
        const totals: Record<string, number> = {};
        PAY.forEach(p => { totals[p.id] = 0; });
        sales.forEach(v => {
          if (v.payments && Array.isArray(v.payments)) {
            v.payments.forEach((p: any) => { totals[p.id] = (totals[p.id] || 0) + (p.original_amount ?? p.amount); });
          }
        });
        return (
          <div className="card" style={{ marginBottom: 24, padding: 20 }}>
            <div className="sl" style={{ marginBottom: 16 }}>Resumen General de Caja — {sales.length} ventas totales</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {[
                { id: 'ars_cash', l: 'Efectivo ARS', p: 'ARS' },
                { id: 'usd_cash', l: 'Dólar Billete', p: 'U$' },
                { id: 'ars_transf', l: 'Transf. ARS', p: 'ARS' },
                { id: 'usd_transf', l: 'Transf. USD', p: 'U$' },
                { id: 'usdt', l: 'USDT', p: 'U$' },
              ].map(it => totals[it.id] > 0 ? (
                <div key={it.id} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{it.l}</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 16 }}>{it.p} {totals[it.id].toLocaleString('es-AR')}</div>
                </div>
              ) : null)}
            </div>
          </div>
        );
      })()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {sls.map(s => {
          const mySales = sales.filter(v => (v.seller_id || v.sellerId || 'unknown') === s.id);
          const t: Record<string, number> = {};
          PAY.forEach(p => { t[p.id] = 0; });
          mySales.forEach(v => {
            if (v.payments && Array.isArray(v.payments)) {
              v.payments.forEach((p: any) => { t[p.id] = (t[p.id] || 0) + (p.original_amount ?? p.amount); });
            }
          });
          return (
            <div key={s.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="u-row" style={{ padding: 20, background: 'var(--surface-3)', border: 'none', borderRadius: 0, borderBottom: '1px solid var(--border)' }}>
                <div className="av" style={{ background: s.color, color: '#000', width: 40, height: 40, fontSize: 14 }}>{s.initials}</div>
                <div className="col">
                  <div className="u-name" style={{ fontSize: 16 }}>{s.name}</div>
                  <div className="u-role" style={{ fontSize: 12 }}>{mySales.length} operaciones</div>
                </div>
              </div>
              <div style={{ padding: 24 }}>
                {mySales.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
                    <Wallet size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                    <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 8, fontSize: 15 }}>Caja sin movimientos</div>
                    <div style={{ fontSize: 13, maxWidth: 220, margin: '0 auto' }}>Aún no hay ventas registradas.</div>
                  </div>
                ) : (
                  <>
                    <div className="sl" style={{ marginBottom: 16 }}>Desglose de Ingresos</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[
                        { id: 'ars_cash', l: 'Efectivo ARS', p: 'ARS' },
                        { id: 'usd_cash', l: 'Dólar Billete', p: 'U$' },
                        { id: 'ars_transf', l: 'Transferencia ARS', p: 'ARS' },
                        { id: 'usd_transf', l: 'Transferencia USD', p: 'U$' },
                        { id: 'usdt', l: 'Cripto USDT', p: 'U$' }
                      ].map(it => {
                        const amount = t[it.id] || 0;
                        if (amount === 0) return null;
                        return (
                          <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 8 }}>
                            <span style={{ color: 'var(--text-2)', fontSize: 13, fontWeight: 500 }}>{it.l}</span>
                            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{it.p} {amount.toLocaleString('es-AR')}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
                <input className="inp" type="number" placeholder="Ingrese monto..." value={declared.ars_cash} onChange={e => setDeclared({...declared, ars_cash: e.target.value})} />
              </div>
              <div className="field">
                <label className="lbl">Total Efectivo Dólares (U$)</label>
                <input className="inp" type="number" placeholder="Ingrese monto..." value={declared.usd_cash} onChange={e => setDeclared({...declared, usd_cash: e.target.value})} />
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
                <div className="receipt-row">                 <span>Esperado Pesos:</span><span>ARS {closureResult.expected.ars_cash.toLocaleString('es-AR')}</span></div>
                <div className="receipt-row">                 <span>Declarado Pesos:</span><span>ARS {closureResult.declared.ars_cash.toLocaleString('es-AR')}</span></div>
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
      {/* Change Currency Modal */}
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
    </div>
  );
}
