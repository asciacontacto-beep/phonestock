"use client"
import { useState, useMemo } from 'react';
import { Search, ShoppingCart, Plus, Building2, User as UserIcon, Printer, X } from 'lucide-react';
import Link from 'next/link';
import { Receipt } from '@/components/Receipt';

interface Props {
  sales: any[];
  deposits: any[];
  realSellers: any[];
  user: any;
  shop: any;
}

export function SalesClient({ sales, deposits, realSellers, user, shop }: Props) {
  const [q, setQ] = useState('');
  const [depFilter, setDepFilter] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [selectedSale, setSelectedSale] = useState<any>(null);

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
      
      return true;
    });
  }, [validSales, q, depFilter, sellerFilter, currencyFilter, realSellers]);

  const PAY_LABELS: Record<string, string> = {
    ars_cash: 'Efvo ARS',
    usd_cash: 'Efvo USD',
    ars_transf: 'Transf ARS',
    usd_transf: 'Transf USD',
    usdt: 'USDT',
    tradein: 'Canje'
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
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

      <div className="card" style={{ marginBottom: 20 }}>
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

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
                          {sale.currency === 'USD' ? 'U$' : 'ARS'} {sale.price.toLocaleString('es-AR')}
                        </div>
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

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="mo">
          <div className="mb" style={{ maxWidth: 450 }}>
            <div className="mh no-print">
              <div className="mt">Detalle de Venta</div>
              <button className="btn-ghost" onClick={() => setSelectedSale(null)}><X size={18} /></button>
            </div>
            <div className="mbd" style={{ padding: '20px' }}>
              <Receipt sale={selectedSale} shop={shop} />
              <div className="no-print" style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setSelectedSale(null)}>Cerrar</button>
                <button className="btn btn-dark" style={{ flex: 1 }} onClick={() => window.print()}>
                  <Printer size={18} style={{ marginRight: 8 }} /> Imprimir Comprobante
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
