"use client"
/**
 * Historial por IMEI: se escanea (o escribe) el IMEI y aparece todo lo que
 * le pasó al equipo — ingreso, canje, ventas, reparaciones — y si sigue en
 * garantía. Ver utils/historialImei.ts.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { History, Loader2, PackagePlus, Repeat, ScanLine, ShieldCheck, ShieldOff, ShoppingCart, Wrench } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { limpiarImei } from '@/utils/imei'
import { armarHistorial, garantiaActual, type CanjeImei, type EventoImei, type ReparacionImei, type StockImei, type VentaImei } from '@/utils/historialImei'

const ICONO: Record<EventoImei['tipo'], typeof History> = { ingreso: PackagePlus, canje: Repeat, venta: ShoppingCart, reparacion: Wrench }
const fecha = (f: string) => new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const fechaCorta = (f: string) => f.slice(0, 10).split('-').reverse().join('/')

type Resultado = {
  imei: string
  stock: StockImei[]
  ventas: VentaImei[]
  canjes: CanjeImei[]
  reparaciones: ReparacionImei[]
  garantiaDias: number | null
}

export function HistorialClient({ isOwner, imeiInicial }: { isOwner: boolean; imeiInicial: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [texto, setTexto] = useState(imeiInicial)
  const [buscando, setBuscando] = useState(false)
  const [res, setRes] = useState<Resultado | null>(null)
  const [error, setError] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  const buscar = async (crudo: string) => {
    const imei = limpiarImei(crudo)
    if (imei.length < 5) { setError('Escaneá o escribí el IMEI (o número de serie) completo.'); return }
    setBuscando(true); setError('')
    try {
      // Equipo (sin costo para el vendedor).
      const colsStock = isOwner ? '*' : 'id,created_at,brand,model,storage,color,status,price,currency,deposit,supplier_id'
      const [{ data: stock }, { data: deps }, { data: provs }, { data: ajustes }] = await Promise.all([
        supabase.from('stock').select(colsStock).eq('imei', imei).order('created_at'),
        supabase.from('deposits').select('id,name'),
        supabase.from('suppliers').select('id,name'),
        supabase.from('settings').select('*').limit(1).maybeSingle(),
      ])
      const nombreDep = new Map((deps || []).map((d: any) => [String(d.id), d.name]))
      const nombreProv = new Map((provs || []).map((p: any) => [String(p.id), p.name]))

      // Ventas: con la garantía si la base ya la tiene.
      const colsVenta = 'id,created_at,brand,model,price,currency,seller_name,customer'
      let ventas: any[] = []
      const conGarantia = await supabase.from('sales').select(`${colsVenta},warranty_days`).eq('imei', imei).order('created_at')
      if (conGarantia.error) {
        const sin = await supabase.from('sales').select(colsVenta).eq('imei', imei).order('created_at')
        ventas = sin.data || []
      } else ventas = conGarantia.data || []

      // Entró como canje: una venta que lo tiene en sus pagos.
      const { data: conCanje } = await supabase.from('sales').select('created_at,model,customer,payments')
        .contains('payments', [{ device: { imei } }])
      const canjes: CanjeImei[] = (conCanje || []).map((v: any) => {
        const pago = (v.payments || []).find((p: any) => p?.device?.imei === imei)
        return { created_at: v.created_at, model: v.model, valor: Math.abs(Number(pago?.original_amount ?? pago?.amount) || 0), moneda: pago?.currency, cliente: v.customer?.name }
      })

      // Reparaciones: por IMEI (si la base lo tiene) y por el equipo propio.
      const ids = (stock || []).map((s: any) => s.id)
      const [porImei, porEquipo] = await Promise.all([
        supabase.from('repairs').select('id,created_at,status,issue_description,customer_name,budget').eq('device_imei', imei),
        ids.length ? supabase.from('repairs').select('id,created_at,status,issue_description,customer_name,budget').in('stock_id', ids) : Promise.resolve({ data: [] }),
      ])
      const reparaciones = [...new Map([...(porImei.data || []), ...(porEquipo.data || [])].map((r: any) => [r.id, r])).values()]

      setRes({
        imei,
        stock: (stock || []).map((s: any) => ({ ...s, deposito: nombreDep.get(String(s.deposit)) || null, proveedor: nombreProv.get(String(s.supplier_id)) || null })),
        ventas, canjes, reparaciones,
        garantiaDias: ajustes && 'garantia_dias' in ajustes ? Number((ajustes as any).garantia_dias) : null,
      })
      const url = new URL(window.location.href)
      url.searchParams.set('imei', imei)
      window.history.replaceState(null, '', url)
    } catch {
      setError('No se pudo buscar. Probá de nuevo.')
    } finally {
      setBuscando(false)
      setTexto('')
      ref.current?.focus()
    }
  }

  useEffect(() => { if (imeiInicial) buscar(imeiInicial) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const eventos = res ? armarHistorial({ ...res, verCosto: isOwner }) : []
  const equipo = res?.stock.at(-1) || null
  const titulo = equipo ? [equipo.brand, equipo.model, equipo.storage, equipo.color].filter(Boolean).join(' ')
    : res?.ventas.at(-1) ? [res.ventas.at(-1)!.brand, res.ventas.at(-1)!.model].filter(Boolean).join(' ') : ''
  const garantia = res && res.garantiaDias !== null ? garantiaActual(res.ventas, res.garantiaDias) : null
  const nada = res && eventos.length === 0

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="sh">
        <div>
          <h1 className="st">Historial por IMEI</h1>
          <div className="ss2">Escaneá un equipo y mirá todo su recorrido: de dónde vino, a quién se vendió, reparaciones y garantía.</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <label className="lbl">IMEI o número de serie</label>
        <div style={{ display: 'flex', gap: 10 }}>
          <input ref={ref} className="inp" autoFocus inputMode="text" autoComplete="off" value={texto}
            placeholder="Pistoleá o escribí el IMEI…" style={{ fontSize: 16, flex: 1 }}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); buscar(texto) } }} />
          <button className="btn btn-dark" onClick={() => buscar(texto)} disabled={buscando} aria-label="Buscar">
            {buscando ? <Loader2 size={18} className="spin" /> : <ScanLine size={18} />}
          </button>
        </div>
        {error && <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{error}</div>}
      </div>

      {nada && (
        <div className="d-empty">
          <div className="d-empty-icon"><History size={20} /></div>
          <div className="d-empty-title">No hay nada registrado con {res!.imei}</div>
          <div className="d-empty-text">Revisá el número: el IMEI tiene 15 dígitos (se ve marcando *#06# o en la caja).</div>
        </div>
      )}

      {res && !nada && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{titulo || 'Equipo'}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{res.imei}</div>
            {res.garantiaDias !== null && res.ventas.length > 0 && (
              <div style={{
                marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 'var(--r-sm)', fontSize: 13.5, fontWeight: 600,
                background: garantia?.vigente ? 'var(--green-dim)' : 'var(--surface-2)',
                color: garantia?.vigente ? 'var(--green)' : 'var(--text-2)',
              }}>
                {garantia?.vigente ? <ShieldCheck size={16} /> : <ShieldOff size={16} />}
                {!garantia ? 'Se vendió sin garantía'
                  : garantia.vigente ? `En garantía hasta el ${fechaCorta(garantia.vence)} (${garantia.faltan === 0 ? 'vence hoy' : `quedan ${garantia.faltan} días`})`
                  : `Garantía vencida el ${fechaCorta(garantia.vence)}`}
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-head"><History size={15} /><span className="panel-title">Recorrido</span></div>
            {eventos.map((e, i) => {
              const Icono = ICONO[e.tipo]
              return (
                <div key={i} className="panel-row">
                  <Icono size={16} style={{ color: 'var(--text-2)', flexShrink: 0 }} />
                  <div className="panel-main">
                    <div className="panel-strong">{e.titulo}</div>
                    {e.detalle && <div className="panel-meta">{e.detalle}</div>}
                  </div>
                  <span className="panel-time">{fecha(e.fecha)}</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
