"use client"
import { useState, useMemo } from 'react';
import { Search, ShoppingCart, Plus, Building2, User as UserIcon, Printer, X, Trash2, Loader2, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Receipt } from '@/components/Receipt';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { voidSale, voidSaleSummary } from '@/utils/voidSale';
import { logAudit, describeChanges } from '@/utils/audit';
import { useConfirm } from '@/hooks/useConfirm';

interface Props {
  sales: any[];
  deposits: any[];
  realSellers: any[];
  user: any;
  shop: any;
}

export function SalesClient({ sales, deposits, realSellers, user, shop }: Props) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [q, setQ] = useState('');
  const [depFilter, setDepFilter] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [onlyDebt, setOnlyDebt] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [voidLoading, setVoidLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const isOwner = user.role === 'owner';

  // Solo consideramos ventas reales, no MOVIMIENTOS
  const validSales = useMemo(() => sales.filter(s => s.brand !== 'MOVIMIENTO'), [sales]);

  const filteredSales = useMemo(() => {
    return validSales.filter(s => {
      // Búsqueda de texto (modelo, marca, cliente, imei)
      if (q) {
        const searchStr = `${s.brand} ${s.model} ${s.customer?.name || ''} ${s.imei || ''}`.toLowerCase();
        if (!searchStr.includes(q.toLowerCase())) return false;
      }
      
      // Filtro por depósito
      if (depFilter) {
        const saleDepId = s.deposit_id ? String(s.deposit_id) : (() => {
          // Fallback a lógica anterior: depósito del vendedor
          const seller = realSellers.find(rs => rs.id === (s.seller_id || s.sellerId));
          if (seller && seller.deposit_ids && seller.deposit_ids.length > 0) {
            return String(seller.deposit_ids[0]);
          }
          return '';
        })();
        if (saleDepId !== depFilter) return false;
      }
      
      // Filtro por vendedor
      if (sellerFilter) {
        if (String(s.seller_id || s.sellerId) !== sellerFilter) return false;
      }
      
      // Filtro por moneda
      if (currencyFilter) {
        if (s.currency !== currencyFilter) return false;
      }

      // Solo las que quedaron con saldo pendiente
      if (onlyDebt && !(s.balance_due > 0)) return false;

      return true;
    });
  }, [validSales, q, depFilter, sellerFilter, currencyFilter, onlyDebt, realSellers]);

  /* Ventas que el cliente quedó debiendo. Se puede cerrar una venta cobrando
     menos, así que hace falta un lugar donde ver quién debe plata. */
  const debts = useMemo(() => {
    const rows = validSales.filter(s => s.balance_due > 0);
    const totalUSD = rows.reduce((a, s) => a + (s.currency === 'USD' ? s.balance_due : 0), 0);
    const totalARS = rows.reduce((a, s) => a + (s.currency === 'USD' ? 0 : s.balance_due), 0);
    return { count: rows.length, totalUSD, totalARS };
  }, [validSales]);

  const PAY_LABELS: Record<string, string> = {
    ars_cash: 'Efvo ARS',
    usd_cash: 'Efvo USD',
    ars_transf: 'Transf ARS',
    usd_transf: 'Transf USD',
    usdt: 'USDT',
    tradein: 'Canje'
  };

  const handleVoidSale = async () => {
    if (!selectedSale) return;
    if (!await confirm('¿Estás seguro de anular esta venta? Esta acción revertirá el stock de equipos, eliminará equipos recibidos en canje y borrará la venta del historial.')) return;
    
    setVoidLoading(true);
    try {
      const result = await voidSale(supabase, selectedSale);
      await logAudit(supabase, {
        user, action: 'venta_anulada', entity: 'sale', entityId: String(selectedSale.id),
        summary: `Anuló la venta de ${selectedSale.brand} ${selectedSale.model} (${selectedSale.customer?.name || 'sin cliente'})`,
      });
      toast.success(voidSaleSummary(result));
      result.warnings.forEach(w => toast.warning(w, { duration: 8000 }));
      setSelectedSale(null);
      router.refresh();
    } catch (e: any) {
      toast.error('Error al anular: ' + (e.message || ''));
    } finally {
      setVoidLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div className="st">Historial de Ventas</div>
          <div className="ss2">Revisá todas las operaciones y facturas</div>
        </div>
        {isOwner && (
          <Link href="/sell" className="btn btn-dark">
            <Plus size={18} /> Nueva Venta
          </Link>
        )}
      </div>

      <div className="card no-print" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="field" style={{ margin: 0, flex: 2, minWidth: 200 }}>
            <label className="lbl">Buscar</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-3)' }} />
              <input 
                className="inp" 
                style={{ paddingLeft: 36 }} 
                placeholder="Modelo, Cliente o IMEI..." 
                value={q} 
                onChange={e => setQ(e.target.value)} 
              />
            </div>
          </div>
          
          <div className="field" style={{ margin: 0, flex: 1, minWidth: 140 }}>
            <label className="lbl">Depósito</label>
            <select className="inp" value={depFilter} onChange={e => setDepFilter(e.target.value)}>
              <option value="">Todos</option>
              {deposits.map(d => (
                <option key={d.id} value={String(d.id)}>{d.name}</option>
              ))}
            </select>
          </div>
          
          <div className="field" style={{ margin: 0, flex: 1, minWidth: 140 }}>
            <label className="lbl">Vendedor</label>
            <select className="inp" value={sellerFilter} onChange={e => setSellerFilter(e.target.value)}>
              <option value="">Todos</option>
              {realSellers.map(s => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </select>
          </div>
          
          <div className="field" style={{ margin: 0, flex: 1, minWidth: 120 }}>
            <label className="lbl">Moneda</label>
            <select className="inp" value={currencyFilter} onChange={e => setCurrencyFilter(e.target.value)}>
              <option value="">Todas</option>
              <option value="USD">Dólares (USD)</option>
              <option value="ARS">Pesos (ARS)</option>
            </select>
          </div>
        </div>
      </div>

      {debts.count > 0 && (
        <div
          className="no-print"
          style={{
            display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 20, cursor: 'pointer',
            background: onlyDebt ? 'rgba(245,158,11,0.16)' : 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '12px 16px',
          }}
          onClick={() => setOnlyDebt(v => !v)}
        >
          <UserIcon size={16} color="var(--amber)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-2)' }}>
            <strong>{debts.count} {debts.count === 1 ? 'cliente quedó debiendo' : 'clientes quedaron debiendo'}</strong>
            {debts.totalUSD > 0 && <> · U$ {Math.round(debts.totalUSD).toLocaleString('es-AR')}</>}
            {debts.totalARS > 0 && <> · $ {Math.round(debts.totalARS).toLocaleString('es-AR')}</>}
            {' — '}{onlyDebt ? 'mostrando solo esas ventas, tocá para ver todas.' : 'tocá para verlas.'}
          </div>
        </div>
      )}

      <div className="card no-print" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredSales.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
            <ShoppingCart size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <div>No se encontraron ventas con los filtros actuales</div>
          </div>
        ) : (
          <div className="tw">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Equipo</th>
                  <th>Cliente</th>
                  <th>Asignación</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(sale => {
                  const dDate = new Date(sale.created_at);
                  const dateStr = dDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
                  
                  // Encontrar el depósito asignado a la venta
                  const depId = sale.deposit_id ? String(sale.deposit_id) : (() => {
                    const seller = realSellers.find(rs => rs.id === (sale.seller_id || sale.sellerId));
                    return seller?.deposit_ids?.[0] ? String(seller.deposit_ids[0]) : null;
                  })();
                  const dep = deposits.find(d => String(d.id) === depId);

                  return (
                    <tr key={sale.id} onClick={() => setSelectedSale(sale)} style={{ cursor: 'pointer' }} className="hover-row">
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{dateStr}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{sale.brand} {sale.model}</div>
                        {sale.imei && (
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                            {sale.storage} · {sale.color} · <span style={{ fontFamily: 'JetBrains Mono' }}>{sale.imei}</span>
                          </div>
                        )}
                        {sale.accessories && sale.accessories.length > 0 && (
                          <div style={{ marginTop: 4 }}>
                            {sale.accessories.map((acc: any, idx: number) => (
                              <div key={idx} style={{ fontSize: 11, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-3)' }} />
                                {acc.qty}x {acc.name}
                                {acc.is_gift && <span style={{ fontSize: 9, background: 'var(--green-dim)', color: 'var(--green)', padding: '1px 4px', borderRadius: 4 }}>REGALO</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        {(() => {
                          const ti = sale.payments?.find((p: any) => p.id === 'tradein' && p.device);
                          if (!ti) return null;
                          return (
                            <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ fontSize: 9, background: 'rgba(147,51,234,0.12)', color: 'var(--purple)', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>CANJE</span>
                              {ti.device.brand} {ti.device.model}{ti.device.storage ? ` ${ti.device.storage}` : ''}
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{sale.customer?.name || '-'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{sale.customer?.phone || sale.customer?.dni || ''}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <UserIcon size={12} style={{ color: 'var(--text-3)' }} /> 
                          {sale.seller_name || 'Desconocido'}
                        </div>
                        {dep && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                            <Building2 size={12} /> {dep.name}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--text)' }}>
                          {sale.currency === 'USD' ? 'U$' : 'ARS '} {sale.price.toLocaleString('es-AR')}
                        </div>
                        {sale.balance_due > 0 && (
                          <div style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 700, marginTop: 2 }}>
                            Debe {sale.currency === 'USD' ? 'U$' : '$'} {Math.round(sale.balance_due).toLocaleString('es-AR')}
                          </div>
                        )}
                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
                          {sale.payments?.map((p: any) => PAY_LABELS[p.id] || p.label || p.id).join(', ')}
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

      {ConfirmDialog}
      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="mo">
          <div className="mb" style={{ maxWidth: 450 }}>
            <div className="mh no-print">
              <div className="mt" style={{ fontWeight: 600 }}>{isEditing ? 'Editar Venta' : 'Detalle de Venta'}</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {!isEditing && isOwner && (
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => {
                      setEditData({
                        seller_id: selectedSale.seller_id,
                        notes: selectedSale.notes || '',
                        customer: selectedSale.customer || { name: '', dni: '', phone: '', email: '' },
                        currency: selectedSale.currency,
                        payments: (selectedSale.payments || []).map((p: any) => ({
                          ...p,
                          original_amount: p.original_amount ?? p.amount,
                          currency: p.currency || selectedSale.currency
                        }))
                      });
                      setIsEditing(true);
                    }}
                  >
                    <Edit2 size={18} /> Editar
                  </button>
                )}
                <button className="btn-ghost" onClick={() => { setSelectedSale(null); setIsEditing(false); }} style={{ padding: '6px' }}><X size={18} /></button>
              </div>
            </div>
            <div className="mbd" style={{ padding: '20px' }}>
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label className="lbl">Vendedor</label>
                    <select className="inp" value={editData.seller_id || ''} onChange={e => setEditData({...editData, seller_id: e.target.value})}>
                      {realSellers.map(rs => <option key={rs.id} value={rs.id}>{rs.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="lbl">Nombre Cliente</label>
                    <input className="inp" value={editData.customer?.name || ''} onChange={e => setEditData({...editData, customer: {...editData.customer, name: e.target.value}})} />
                  </div>
                  <div>
                    <label className="lbl">DNI / CUIT Cliente</label>
                    <input className="inp" value={editData.customer?.dni || ''} onChange={e => setEditData({...editData, customer: {...editData.customer, dni: e.target.value}})} />
                  </div>
                  <div>
                    <label className="lbl">Teléfono Cliente</label>
                    <input className="inp" value={editData.customer?.phone || ''} onChange={e => setEditData({...editData, customer: {...editData.customer, phone: e.target.value}})} />
                  </div>
                  <div>
                    <label className="lbl">Notas / Garantía</label>
                    <textarea className="inp" value={editData.notes || ''} onChange={e => setEditData({...editData, notes: e.target.value})} rows={3} style={{ resize: 'none' }} />
                  </div>
                  <div>
                    <label className="lbl">Moneda de la Venta</label>
                    <select className="inp" value={editData.currency || 'ARS'} onChange={e => setEditData({...editData, currency: e.target.value})}>
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>

                  <div>
                    <label className="lbl">Pagos (podés corregir lo realmente cobrado)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(editData.payments || []).map((p: any, i: number) => {
                        const needsRate = p.currency !== editData.currency;
                        return (
                          <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{p.label || p.id}</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <div style={{ flex: 1 }}>
                                <label className="lbl" style={{ fontSize: 10 }}>Monto cobrado</label>
                                <input
                                  className="inp"
                                  type="number"
                                  value={p.original_amount ?? ''}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setEditData((prev: any) => ({
                                      ...prev,
                                      payments: prev.payments.map((x: any, xi: number) => xi === i ? { ...x, original_amount: val } : x)
                                    }));
                                  }}
                                />
                              </div>
                              <div style={{ width: 100 }}>
                                <label className="lbl" style={{ fontSize: 10 }}>Moneda</label>
                                <select
                                  className="inp"
                                  value={p.currency || 'ARS'}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setEditData((prev: any) => ({
                                      ...prev,
                                      payments: prev.payments.map((x: any, xi: number) => xi === i ? { ...x, currency: val } : x)
                                    }));
                                  }}
                                >
                                  <option value="ARS">ARS</option>
                                  <option value="USD">USD</option>
                                </select>
                              </div>
                            </div>
                            {needsRate && (
                              <div>
                                <label className="lbl" style={{ fontSize: 10 }}>Cotización usada</label>
                                <input
                                  className="inp"
                                  type="number"
                                  value={p.exchange_rate ?? ''}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setEditData((prev: any) => ({
                                      ...prev,
                                      payments: prev.payments.map((x: any, xi: number) => xi === i ? { ...x, exchange_rate: val } : x)
                                    }));
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
                    Corregí el monto/moneda de cada pago si el vendedor cobró distinto a lo cargado — impacta directamente en la rentabilidad de esta venta.
                  </p>

                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setIsEditing(false)}>Cancelar</button>
                    <button className="btn btn-dark" style={{ flex: 1 }} disabled={editLoading} onClick={async () => {
                      try {
                        setEditLoading(true);
                        const sellerName = realSellers.find(s => s.id === editData.seller_id)?.name || selectedSale.seller_name;

                        const saleCurrency = editData.currency;
                        const finalPayments = (editData.payments || []).map((p: any) => {
                          const origAmt = p.original_amount || 0;
                          let amount = origAmt;
                          let exchange_rate = null;
                          if (p.currency !== saleCurrency) {
                            const rate = parseFloat(p.exchange_rate) || 1;
                            amount = p.currency === 'USD' ? origAmt * rate : origAmt / rate;
                            exchange_rate = rate;
                          }
                          return { ...p, original_amount: origAmt, amount, exchange_rate };
                        });
                        const newPrice = finalPayments.reduce((a: number, p: any) => a + p.amount, 0);

                        const { error } = await supabase.from('sales').update({
                          seller_id: editData.seller_id,
                          seller_name: sellerName,
                          customer: editData.customer,
                          notes: editData.notes,
                          price: newPrice,
                          currency: saleCurrency,
                          payments: finalPayments
                        }).eq('id', selectedSale.id);
                        if (error) throw error;

                        const cambios = describeChanges(
                          { precio: selectedSale.price, moneda: selectedSale.currency, vendedor: selectedSale.seller_name, cliente: selectedSale.customer?.name, garantia: selectedSale.notes },
                          { precio: newPrice, moneda: saleCurrency, vendedor: sellerName, cliente: editData.customer?.name, garantia: editData.notes },
                          { precio: 'Precio', moneda: 'Moneda', vendedor: 'Vendedor', cliente: 'Cliente', garantia: 'Garantía' },
                        );
                        if (cambios) {
                          await logAudit(supabase, {
                            user, action: 'venta_editada', entity: 'sale', entityId: String(selectedSale.id),
                            summary: `Editó la venta de ${selectedSale.brand} ${selectedSale.model} — ${cambios}`,
                          });
                        }

                        toast.success('Venta actualizada');
                        setSelectedSale({ ...selectedSale, seller_id: editData.seller_id, seller_name: sellerName, customer: editData.customer, notes: editData.notes, price: newPrice, currency: saleCurrency, payments: finalPayments });
                        setIsEditing(false);
                        router.refresh();
                      } catch(e: any) { toast.error(e.message); } finally { setEditLoading(false); }
                    }}>
                      {editLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Receipt sale={selectedSale} shop={shop} />
                  
                  {isOwner && (
                    <div className="no-print" style={{ marginTop: 20, textAlign: 'center' }}>
                      <button className="btn btn-ghost" style={{ color: 'var(--red)', fontSize: 13 }} onClick={handleVoidSale} disabled={voidLoading}>
                        {voidLoading ? <Loader2 className="spin" size={16} style={{ marginRight: 6 }} /> : <Trash2 size={16} style={{ marginRight: 6 }} />}
                        Anular Venta Permanentemente
                      </button>
                    </div>
                  )}

                  <div className="no-print" style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                    <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setSelectedSale(null)}>Cerrar</button>
                    <button className="btn btn-dark" style={{ flex: 1 }} onClick={() => window.print()}>
                      <Printer size={18} style={{ marginRight: 8 }} /> Imprimir Comprobante
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
