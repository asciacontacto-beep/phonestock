"use client"
import { useMemo, useState } from 'react'
import { Wallet, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { registrarCobro, eliminarCobro } from '@/utils/cobros'
import {
  saldoDeVenta, saldoPorMoneda, construirMovimientos,
  type Cobro, type Id, type Moneda, type VentaConDeuda,
} from '@/utils/cuentaCorriente'
import { estadoDeCuota, type CuotaPlan } from '@/utils/cuotas'

/** Una cuota tal como vuelve de la base. */
type CuotaGuardada = CuotaPlan & { id: Id; sale_id: Id }

const METODOS = [
  { id: 'ars_cash', label: 'Efectivo ARS', moneda: 'ARS' },
  { id: 'usd_cash', label: 'Efectivo USD', moneda: 'USD' },
  { id: 'ars_transf', label: 'Transferencia ARS', moneda: 'ARS' },
  { id: 'usd_transf', label: 'Transferencia USD', moneda: 'USD' },
  { id: 'usdt', label: 'USDT', moneda: 'USD' },
]

const money = (n: number, m: Moneda) =>
  `${m === 'USD' ? 'U$' : '$'} ${Math.abs(n).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`

const hoyISO = () => new Date().toLocaleDateString('en-CA')

/** Una caja / depósito donde puede entrar la plata del cobro. */
type Caja = { id: string; name: string }

export function CuentaCorriente({
  customer, sales, payments, installments, deposits, exchangeRate, userId,
}: {
  customer: { id: Id; name: string }
  /** Las ventas de este cliente, ya emparejadas por quien llama. */
  sales: VentaConDeuda[]
  payments: Cobro[]
  installments: CuotaGuardada[]
  deposits: Caja[]
  exchangeRate: number
  userId: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [cobrando, setCobrando] = useState<VentaConDeuda | 'cuenta' | null>(null)
  const [cuotaElegida, setCuotaElegida] = useState<CuotaGuardada | null>(null)
  const [loading, setLoading] = useState(false)

  const misCobros = useMemo(
    () => payments.filter(p => String(p.customer_id) === String(customer.id)),
    [payments, customer.id],
  )

  const saldo = useMemo(() => saldoPorMoneda(sales, misCobros), [sales, misCobros])

  /* Las ventas que todavía deben algo, de la más vieja a la más nueva: si
     el cliente trae plata, lo primero que uno quiere cobrar es lo más viejo. */
  const deudas = useMemo(
    () => sales
      .filter(s => saldoDeVenta(s, misCobros) > 0)
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))),
    [sales, misCobros],
  )

  const monedasConMovimiento = (['USD', 'ARS'] as Moneda[])
    .filter(m => saldo[m] !== 0 || construirMovimientos(sales, misCobros, m).length > 0)

  const borrar = async (cobro: Cobro & { id: Id }) => {
    const venta = sales.find(s => String(s.id) === String(cobro.sale_id)) || null
    setLoading(true)
    const r = await eliminarCobro(
      supabase, cobro, venta,
      misCobros.filter(c => String(c.id) !== String(cobro.id)),
    )
    setLoading(false)
    if (!r.ok) { toast.error(r.error); return }
    toast.success('Cobro eliminado y deuda recalculada')
    router.refresh()
  }

  return (
    <>
      <div className="sl" style={{ marginBottom: 12, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>
          <Wallet size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
          CUENTA CORRIENTE
        </span>
        <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => setCobrando('cuenta')}>
          <Plus size={13} /> Cobro a cuenta
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        {(['USD', 'ARS'] as Moneda[]).map(m => (
          <div key={m} className="card" style={{ flex: 1, padding: 12, background: 'var(--surface-3)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {saldo[m] < 0 ? `A favor ${m}` : `Debe ${m}`}
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 17,
              color: saldo[m] > 0 ? 'var(--red)' : saldo[m] < 0 ? 'var(--green)' : 'var(--text-3)',
            }}>
              {money(saldo[m], m)}
            </div>
          </div>
        ))}
      </div>

      {deudas.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {deudas.map(v => {
            const pendiente = saldoDeVenta(v, misCobros)
            const moneda: Moneda = v.currency === 'USD' ? 'USD' : 'ARS'
            const cuotas = installments
              .filter(c => String(c.sale_id) === String(v.id))
              .sort((a, b) => a.number - b.number)

            return (
              <div key={v.id} className="card" style={{ padding: 12, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{v.brand} {v.model}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {new Date(v.created_at || '').toLocaleDateString('es-AR')} · debe {money(pendiente, moneda)}
                      {cuotas.length > 0 && ` · plan de ${cuotas.length} cuotas`}
                    </div>
                  </div>
                  {cuotas.length === 0 && (
                    <button className="btn btn-dark" style={{ padding: '6px 12px', fontSize: 12, flexShrink: 0 }}
                      onClick={() => { setCuotaElegida(null); setCobrando(v) }}>
                      Cobrar
                    </button>
                  )}
                </div>

                {cuotas.length > 0 && (
                  <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                    {cuotas.map(c => {
                      const cobrosDeLaCuota = misCobros.filter(p => String(p.installment_id) === String(c.id))
                      const est = estadoDeCuota(c, cobrosDeLaCuota, hoyISO())
                      return (
                        <div key={String(c.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '5px 0' }}>
                          <div style={{ fontSize: 12, minWidth: 0 }}>
                            <span style={{ color: 'var(--text-3)' }}>Cuota {c.number}/{cuotas.length} · </span>
                            {c.due_date.split('-').reverse().join('/')}
                            {est.estado === 'paid' && <span className="badge b-green" style={{ marginLeft: 6, fontSize: 10 }}>Pagada</span>}
                            {est.vencida && <span className="badge b-red" style={{ marginLeft: 6, fontSize: 10 }}>Vencida hace {est.diasDeAtraso} d</span>}
                            {est.estado === 'partial' && !est.vencida && <span className="badge b-neu" style={{ marginLeft: 6, fontSize: 10 }}>Parcial</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>{money(est.resta || c.amount, moneda)}</span>
                            {est.estado !== 'paid' && (
                              <button className="btn btn-dark" style={{ padding: '4px 10px', fontSize: 11 }}
                                onClick={() => { setCuotaElegida(c); setCobrando(v) }}>
                                Cobrar
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {monedasConMovimiento.map(m => {
        const movs = construirMovimientos(sales, misCobros, m)
        if (movs.length === 0) return null
        return (
          <div key={m} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6, fontWeight: 600 }}>MOVIMIENTOS {m}</div>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--text-3)', fontSize: 10 }}>
                  <th style={{ textAlign: 'left', padding: '4px 0' }}>Fecha</th>
                  <th style={{ textAlign: 'left' }}>Concepto</th>
                  <th style={{ textAlign: 'right' }}>Debe</th>
                  <th style={{ textAlign: 'right' }}>Haber</th>
                  <th style={{ textAlign: 'right' }}>Saldo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {movs.map((mv, i) => {
                  const cobro = mv.cobroId ? misCobros.find(c => String(c.id) === String(mv.cobroId)) : null
                  return (
                    <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 0', whiteSpace: 'nowrap' }}>{mv.fecha.split('-').reverse().slice(0, 2).join('/')}</td>
                      <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mv.concepto}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono' }}>{mv.debe ? money(mv.debe, m) : '—'}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', color: 'var(--green)' }}>{mv.haber ? money(mv.haber, m) : '—'}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{money(mv.saldo, m)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {cobro && (
                          <button className="btn-icon" style={{ color: 'var(--red)' }} disabled={loading}
                            onClick={() => borrar(cobro as Cobro & { id: Id })} title="Eliminar cobro">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}

      {cobrando && (
        <ModalCobro
          venta={cobrando === 'cuenta' ? null : cobrando}
          cuota={cuotaElegida}
          cobrosPrevios={misCobros}
          customer={customer}
          deposits={deposits}
          exchangeRate={exchangeRate}
          userId={userId}
          onClose={() => { setCobrando(null); setCuotaElegida(null) }}
          onDone={() => { setCobrando(null); setCuotaElegida(null); router.refresh() }}
        />
      )}
    </>
  )
}

function ModalCobro({
  venta, cuota, cobrosPrevios, customer, deposits, exchangeRate, userId, onClose, onDone,
}: {
  venta: VentaConDeuda | null
  cuota: CuotaGuardada | null
  cobrosPrevios: Cobro[]
  customer: { id: Id; name: string }
  deposits: Caja[]
  exchangeRate: number
  userId: string
  onClose: () => void
  onDone: () => void
}) {
  const supabase = createClient()
  const monedaVenta: Moneda = venta ? (venta.currency === 'USD' ? 'USD' : 'ARS') : 'ARS'
  const saldoVenta = venta ? saldoDeVenta(venta, cobrosPrevios) : 0
  /* Cobrando una cuota, lo que se propone es lo que falta de ESA cuota, no
     toda la deuda: el cliente vino a pagar la cuota de este mes. */
  const restaCuota = cuota
    ? estadoDeCuota(cuota, cobrosPrevios.filter(p => String(p.installment_id) === String(cuota.id)), hoyISO()).resta
    : 0
  const pendiente = cuota ? restaCuota : saldoVenta

  const [metodo, setMetodo] = useState(monedaVenta === 'USD' ? 'usd_cash' : 'ars_cash')
  const [monto, setMonto] = useState(venta ? String(pendiente) : '')
  const [cotizacion, setCotizacion] = useState(String(exchangeRate || ''))
  const [fecha, setFecha] = useState(hoyISO())
  const [depositId, setDepositId] = useState(deposits[0]?.id ? String(deposits[0].id) : '')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)

  const moneda = (METODOS.find(m => m.id === metodo)?.moneda || 'ARS') as Moneda
  const necesitaCotizacion = Boolean(venta) && moneda !== monedaVenta

  const guardar = async () => {
    setLoading(true)
    const r = await registrarCobro(supabase, {
      customerId: customer.id,
      customerName: customer.name,
      venta,
      installmentId: cuota?.id ?? null,
      cobrosPrevios,
      monto: parseFloat(monto) || 0,
      moneda,
      cotizacion: necesitaCotizacion ? (parseFloat(cotizacion) || null) : null,
      metodo,
      depositId: depositId || null,
      fecha,
      hoy: hoyISO(),
      notas,
      userId,
    })
    setLoading(false)
    if (!r.ok) { toast.error(r.error); return }
    toast.success(
      r.saldoNuevo && r.saldoNuevo > 0
        ? `Cobro registrado · queda debiendo ${money(r.saldoNuevo, monedaVenta)}`
        : 'Cobro registrado',
    )
    onDone()
  }

  return (
    <div className="mo" style={{ zIndex: 300 }} onClick={onClose}>
      <div className="mb" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div className="mh-title">{cuota ? `Cobrar cuota ${cuota.number}` : venta ? 'Cobrar saldo' : 'Cobro a cuenta'}</div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {venta && (
            <div className="card" style={{ padding: 12, background: 'var(--surface-3)' }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{venta.brand} {venta.model}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                {cuota
                  ? `Cuota ${cuota.number} · vence ${cuota.due_date.split('-').reverse().join('/')} · falta ${money(restaCuota, monedaVenta)}`
                  : `Saldo pendiente: ${money(pendiente, monedaVenta)}`}
              </div>
            </div>
          )}

          <div>
            <label className="lbl">Medio de pago</label>
            <select className="inp" value={metodo} onChange={e => setMetodo(e.target.value)}>
              {METODOS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>

          <div>
            <label className="lbl">Monto ({moneda})</label>
            <input className="inp" type="number" value={monto} onChange={e => setMonto(e.target.value)} autoFocus />
          </div>

          {necesitaCotizacion && (
            <div>
              <label className="lbl">Cotización del día</label>
              <input className="inp" type="number" value={cotizacion} onChange={e => setCotizacion(e.target.value)} />
              <div className="helper-text" style={{ fontSize: 11 }}>
                La venta es en {monedaVenta} y estás cobrando en {moneda}. La cotización queda guardada
                en el cobro, así el saldo histórico no cambia cuando actualices el dólar.
              </div>
            </div>
          )}

          <div>
            <label className="lbl">Fecha del cobro</label>
            <input className="inp" type="date" value={fecha} max={hoyISO()} onChange={e => setFecha(e.target.value)} />
            <div className="helper-text" style={{ fontSize: 11 }}>
              La plata entra a la caja con esta fecha, no con la de la venta.
            </div>
          </div>

          <div>
            <label className="lbl">Caja donde entra</label>
            <select className="inp" value={depositId} onChange={e => setDepositId(e.target.value)}>
              <option value="">Elegí una caja</option>
              {deposits.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label className="lbl">Nota (opcional)</label>
            <input className="inp" value={notas} onChange={e => setNotas(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button className="btn btn-dark" style={{ flex: 1 }} onClick={guardar} disabled={loading}>
              {loading ? 'Guardando...' : 'Registrar cobro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
