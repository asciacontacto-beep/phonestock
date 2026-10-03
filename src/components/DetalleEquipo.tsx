"use client"
import { useEffect, useState } from 'react'
import { X, ShoppingCart, Edit2, Trash2, Copy, Check, Store, Wrench, Receipt, Truck, CalendarDays, MapPin, BatteryMedium, Hash, StickyNote } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import { tieneAlmacenamiento } from '@/constants/data'

export interface EquipoDetalle {
  id: string | number
  brand?: string | null
  model?: string | null
  storage?: string | null
  color?: string | null
  imei?: string | null
  condition?: string | null
  status?: string | null
  battery?: number | string | null
  price?: number | null
  cost_price?: number | null
  currency?: string | null
  notes?: string | null
  created_at?: string | null
  in_catalog?: boolean | null
  supplier_id?: string | number | null
}

interface VentaDelEquipo { id: string | number; created_at: string; price: number; currency: string; customer?: { name?: string } | null; seller_name?: string | null }
interface ReparacionDelEquipo { id: string; created_at: string; status: string; issue_description?: string | null; cost?: number | null }

const ESTADO: Record<string, { l: string; c: string }> = {
  available: { l: 'En stock', c: 'b-green' },
  sold: { l: 'Vendido', c: 'b-amber' },
  in_repair: { l: 'En reparación', c: 'b-neu' },
}

function dias(desde?: string | null): number | null {
  if (!desde) return null
  const ms = Date.now() - new Date(desde).getTime()
  return Number.isFinite(ms) && ms >= 0 ? Math.floor(ms / 86_400_000) : null
}

const sim = (m?: string | null) => (m === 'USD' ? 'U$' : '$')
const num = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })

/**
 * Ficha del equipo al lado de la lista de Inventario: todo lo que se sabe
 * de él sin abrir otra pantalla. En el celular sube como una hoja.
 */
export function DetalleEquipo({
  item, deposito, isOwner, exchangeRate, proveedor, onClose, onVender, onEditar, onEliminar,
}: {
  item: EquipoDetalle
  deposito?: { name: string; color?: string | null } | null
  isOwner?: boolean
  exchangeRate: number
  proveedor?: string | null
  onClose: () => void
  onVender: () => void
  onEditar: () => void
  onEliminar: () => void
}) {
  const supabase = createClient()
  const [copiado, setCopiado] = useState(false)
  const [venta, setVenta] = useState<VentaDelEquipo | null>(null)
  const [reparaciones, setReparaciones] = useState<ReparacionDelEquipo[]>([])

  /* Historial: la venta (por IMEI) y las veces que fue al taller. Sólo el
     dueño ve la venta: tiene el precio y el cliente. */
  useEffect(() => {
    // El panel se monta de nuevo con cada equipo (key): arranca vacío.
    let vivo = true
    if (isOwner && item.imei && item.status === 'sold') {
      supabase.from('sales').select('id,created_at,price,currency,customer,seller_name')
        .eq('imei', item.imei).neq('brand', 'MOVIMIENTO').order('created_at', { ascending: false }).limit(1)
        .then(({ data }) => { if (vivo && data?.[0]) setVenta(data[0] as VentaDelEquipo) })
    }
    supabase.from('repairs').select('id,created_at,status,issue_description,cost')
      .eq('stock_id', item.id).order('created_at', { ascending: false }).limit(5)
      .then(({ data, error }) => { if (vivo && !error) setReparaciones((data || []) as ReparacionDelEquipo[]) })
    return () => { vivo = false }
  }, [item.id, item.imei, item.status, isOwner]) // eslint-disable-line react-hooks/exhaustive-deps

  const precio = Number(item.price) || 0
  const costo = item.cost_price != null ? Number(item.cost_price) : null
  const margen = isOwner && costo != null && costo > 0 && precio > 0 ? precio - costo : null
  const margenPct = margen != null && precio > 0 ? (margen / precio) * 100 : null
  const enPesos = item.currency === 'USD' && exchangeRate > 0 ? precio * exchangeRate : null
  const d = item.status === 'available' ? dias(item.created_at) : null
  const bateria = item.battery != null && String(item.battery).trim() !== '' ? parseFloat(String(item.battery)) : null
  const estado = ESTADO[item.status || ''] || { l: item.status || '—', c: 'b-neu' }

  const copiarImei = async () => {
    if (!item.imei) return
    try { await navigator.clipboard.writeText(item.imei); setCopiado(true); setTimeout(() => setCopiado(false), 1500) }
    catch { toast.error('No se pudo copiar') }
  }

  const fila = (icono: React.ReactNode, etiqueta: string, valor: React.ReactNode) => (
    <div className="eq-fila">
      <span className="eq-fila-k">{icono}{etiqueta}</span>
      <span className="eq-fila-v">{valor}</span>
    </div>
  )

  return (
    <aside className="eq-panel" aria-label={`Detalle de ${item.model}`}>
      <div className="eq-head">
        <div style={{ minWidth: 0 }}>
          <div className="eq-marca">{item.brand}</div>
          <div className="eq-modelo">{item.model}</div>
          <div className="eq-sub">
            {[tieneAlmacenamiento(item.storage) ? item.storage : null, item.color].filter(Boolean).join(' · ')}
          </div>
        </div>
        <button className="btn-icon" onClick={onClose} aria-label="Cerrar detalle"><X size={18} /></button>
      </div>

      <div className="eq-badges">
        <span className={`badge ${estado.c}`}>{estado.l}</span>
        <span className={`badge ${item.condition === 'new' ? 'b-green' : 'b-neu'}`}>{item.condition === 'new' ? 'Sellado' : 'Usado'}</span>
        {item.in_catalog && <span className="badge b-neu"><Store size={11} /> En catálogo</span>}
        {d != null && (
          <span className="badge" style={d >= 90 ? { color: 'var(--red)' } : d >= 60 ? { color: 'var(--amber)' } : undefined}>
            {d === 0 ? 'Ingresó hoy' : `${d} ${d === 1 ? 'día' : 'días'} en stock`}
          </span>
        )}
      </div>

      <div className="eq-precio">
        <div className="eq-precio-v">{sim(item.currency)} {num(precio)}</div>
        {enPesos != null && <div className="eq-precio-sub">≈ $ {Math.round(enPesos).toLocaleString('es-AR')} al dólar de {num(exchangeRate)}</div>}
        {isOwner && (
          <div className="eq-kpis">
            <div><span>Costo</span><strong>{costo != null && costo > 0 ? `${sim(item.currency)} ${num(costo)}` : '—'}</strong></div>
            <div><span>Margen</span><strong style={{ color: margen == null ? undefined : margen < 0 ? 'var(--red)' : 'var(--green)' }}>
              {margen != null ? `${sim(item.currency)} ${num(margen)}` : '—'}
            </strong></div>
            <div><span>% sobre precio</span><strong>{margenPct != null ? `${margenPct.toFixed(0)}%` : '—'}</strong></div>
          </div>
        )}
        {isOwner && (costo == null || costo === 0) && (
          <div className="eq-aviso">Falta el costo: sin él no se puede saber cuánto deja este equipo.</div>
        )}
      </div>

      <div className="eq-ficha">
        {item.imei && fila(<Hash size={13} />, 'IMEI / Serie', (
          <button className="eq-imei" onClick={copiarImei} title="Copiar">
            {item.imei} {copiado ? <Check size={12} /> : <Copy size={12} />}
          </button>
        ))}
        {item.condition !== 'new' && fila(<BatteryMedium size={13} />, 'Batería', bateria != null ? (
          <span className="eq-bat">
            <span className="eq-bat-bar"><span style={{ width: `${Math.max(0, Math.min(100, bateria))}%`, background: bateria >= 85 ? 'var(--green)' : bateria >= 78 ? 'var(--amber)' : 'var(--red)' }} /></span>
            {bateria}%
          </span>
        ) : '—')}
        {fila(<MapPin size={13} />, 'Depósito', deposito ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: deposito.color || 'var(--text-3)' }} />{deposito.name}
          </span>
        ) : '—')}
        {item.created_at && fila(<CalendarDays size={13} />, 'Ingresó', new Date(item.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }))}
        {isOwner && proveedor && fila(<Truck size={13} />, 'Proveedor', proveedor)}
      </div>

      {item.notes && (
        <div className="eq-notas"><StickyNote size={13} /> {item.notes}</div>
      )}

      {(venta || reparaciones.length > 0) && (
        <div className="eq-historial">
          <div className="eq-titulo">Historial</div>
          {venta && (
            <div className="eq-evento">
              <Receipt size={14} />
              <div>
                <div>Vendido a <strong>{venta.customer?.name || 'cliente sin nombre'}</strong> por {sim(venta.currency)} {num(Number(venta.price) || 0)}</div>
                <div className="eq-evento-sub">{new Date(venta.created_at).toLocaleDateString('es-AR')}{venta.seller_name ? ` · ${venta.seller_name}` : ''}</div>
              </div>
            </div>
          )}
          {reparaciones.map(r => (
            <div key={r.id} className="eq-evento">
              <Wrench size={14} />
              <div>
                <div>{r.issue_description || 'Reparación'} <span className="eq-evento-sub">· {r.status.toLowerCase()}</span></div>
                <div className="eq-evento-sub">
                  {new Date(r.created_at).toLocaleDateString('es-AR')}
                  {isOwner && r.cost ? ` · costo $ ${Number(r.cost).toLocaleString('es-AR')}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="eq-acciones">
        {item.status === 'available' && (
          <button className="btn btn-dark" style={{ flex: 1 }} onClick={onVender}><ShoppingCart size={15} /> Vender</button>
        )}
        <button className="btn btn-outline" style={{ flex: item.status === 'available' ? '0 0 auto' : 1 }} onClick={onEditar}><Edit2 size={15} /> Editar</button>
        <button className="btn btn-outline" style={{ color: 'var(--red)' }} aria-label="Eliminar equipo" onClick={onEliminar}><Trash2 size={15} /></button>
      </div>
    </aside>
  )
}
