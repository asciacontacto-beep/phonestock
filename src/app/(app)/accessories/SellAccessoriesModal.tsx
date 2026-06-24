"use client";
import { useState } from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

const ARS_PAY = [
  { id: 'ars_cash', label: '$ Efectivo' },
  { id: 'ars_transf', label: 'Transferencia' },
];

type CartItem = {
  id: string;
  name: string;
  qty: number;
  sale_price: number;
  cost_price: number;
};

export function SellAccessoriesModal({ accessories, onClose, onSold }: {
  accessories: any[];
  onClose: () => void;
  onSold: (updatedIds: { id: string; newStock: number }[]) => void;
}) {
  const supabase = createClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [custName, setCustName] = useState('');
  const [payMethod, setPayMethod] = useState('ars_cash');
  const [loading, setLoading] = useState(false);

  const available = accessories.filter(a => (a.currency || 'ARS') === 'ARS' && a.stock > 0);

  const addToCart = (a: any) => {
    setCart(p => {
      const ex = p.find(x => x.id === a.id);
      if (ex) {
        if (ex.qty >= a.stock) { toast.error('Sin stock suficiente'); return p; }
        return p.map(x => x.id === a.id ? { ...x, qty: x.qty + 1 } : x);
      }
      return [...p, {
        id: a.id,
        name: `${a.category}${a.compatible_model ? ' ' + a.compatible_model : ''}${a.color ? ' ' + a.color : ''}`,
        qty: 1,
        sale_price: a.sale_price || 0,
        cost_price: a.cost_price || 0,
      }];
    });
  };

  const removeOne = (id: string) => {
    setCart(p => {
      const ex = p.find(x => x.id === id);
      if (!ex) return p;
      if (ex.qty <= 1) return p.filter(x => x.id !== id);
      return p.map(x => x.id === id ? { ...x, qty: x.qty - 1 } : x);
    });
  };

  const removeItem = (id: string) => setCart(p => p.filter(x => x.id !== id));

  const total = cart.reduce((s, x) => s + x.sale_price * x.qty, 0);
  const totalCost = cart.reduce((s, x) => s + x.cost_price * x.qty, 0);

  const confirm = async () => {
    if (cart.length === 0) { toast.error('Agregá al menos un accesorio'); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      const resumen = cart.map(x => `${x.qty}x ${x.name}`).join(' · ');

      const { data: saleRow, error: sErr } = await supabase.from('sales').insert([{
        seller_id: user?.id || null,
        seller_name: user?.email || '',
        brand: 'ACCESORIOS',
        model: resumen.slice(0, 120),
        storage: '-',
        color: '-',
        imei: `ACC-${Date.now()}`,
        cost_price: totalCost,
        price: total,
        currency: 'ARS',
        payments: [{ id: payMethod, amount: total, currency: 'ARS' }],
        customer: { name: custName.trim() || 'Consumidor Final' },
        accessories: cart.map(x => ({
          id: x.id,
          name: x.name,
          qty: x.qty,
          price: x.sale_price,
          cost_price: x.cost_price,
          is_gift: false,
        })),
      }]).select();
      if (sErr) throw sErr;

      const updates: { id: string; newStock: number }[] = [];
      for (const item of cart) {
        const { error: rErr } = await supabase.rpc('decrement_accessory_stock', { acc_id: item.id, qty: item.qty });
        if (rErr) throw rErr;
        const acc = accessories.find(a => a.id === item.id);
        updates.push({ id: item.id, newStock: (acc?.stock || 0) - item.qty });
      }

      toast.success('Venta registrada');
      onSold(updates);
    } catch (e: any) {
      toast.error(e.message || 'Error al procesar venta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mo">
      <div className="mb" style={{ maxWidth: 560 }}>
        <div className="mh">
          <div className="mh-title">Vender Accesorios</div>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="mbd">
          <div className="lbl" style={{ marginBottom: 8 }}>Accesorios disponibles</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto', marginBottom: 16 }}>
            {available.length === 0 && (
              <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '12px 0' }}>No hay accesorios ARS con stock disponible.</div>
            )}
            {available.map(a => {
              const inCart = cart.find(x => x.id === a.id);
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.category}{a.compatible_model ? ' · ' + a.compatible_model : ''}{a.color ? ' · ' + a.color : ''}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Stock: {a.stock} · $ {(a.sale_price || 0).toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {inCart ? (
                      <>
                        <button className="btn-icon" onClick={() => removeOne(a.id)}><Minus size={14} /></button>
                        <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{inCart.qty}</span>
                        <button className="btn-icon" onClick={() => addToCart(a)}><Plus size={14} /></button>
                      </>
                    ) : (
                      <button className="btn btn-outline btn-sm" onClick={() => addToCart(a)}>Agregar</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {cart.length > 0 && (
            <>
              <div className="lbl" style={{ marginBottom: 8 }}>Carrito</div>
              <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {cart.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--surface-3)', borderRadius: 6 }}>
                    <div style={{ fontSize: 13 }}>{item.qty}x {item.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>$ {(item.sale_price * item.qty).toLocaleString()}</span>
                      <button className="btn-icon" onClick={() => removeItem(item.id)}><Trash2 size={13} color="var(--red)" /></button>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 12px', fontWeight: 700, fontSize: 16 }}>
                  Total: $ {total.toLocaleString()}
                </div>
              </div>

              <div className="field">
                <label className="lbl">Cliente (opcional)</label>
                <input className="inp" placeholder="Consumidor Final" value={custName} onChange={e => setCustName(e.target.value)} />
              </div>

              <div className="field">
                <label className="lbl">Forma de Pago</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {ARS_PAY.map(m => (
                    <button key={m.id} className={`btn btn-sm ${payMethod === m.id ? 'btn-dark' : 'btn-outline'}`} onClick={() => setPayMethod(m.id)}>{m.label}</button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-dark btn-lg" style={{ flex: 1 }} onClick={confirm} disabled={loading || cart.length === 0}>
            {loading ? 'Procesando...' : `Confirmar Venta · $ ${total.toLocaleString()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
