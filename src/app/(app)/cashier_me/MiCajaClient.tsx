"use client"
import { useMemo, useState } from 'react'
import { Lock, Loader2, CheckCircle2, AlertTriangle, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { esperadoDelTurno, inicioDelTurno, claveDeCaja, type Cierre, type EfectivoTurno } from '@/utils/cierreCaja'

interface Venta {
  id: string | number
  created_at: string
  brand?: string | null
  payments?: { id?: string; amount?: number; original_amount?: number; currency?: string | null }[]
}

const ETIQUETA: Record<string, string> = {
  ars_cash: 'Efectivo ARS', usd_cash: 'Efectivo USD', ars_transf: 'Transferencia ARS',
  usd_transf: 'Transferencia USD', usdt: 'USDT', tarjeta: 'Tarjeta / financiera',
}

/** Comienzo del día local, como instante ISO. */
function inicioDeHoy(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function MiCajaClient({ user, ventas, cierres, hayCierres, ciegas }: {
  user: { id: string; name: string; depositId: string | null }
  ventas: Venta[]
  cierres: Cierre[]
  hayCierres: boolean
  ciegas: boolean
}) {
  const supabase = createClient()
  const router = useRouter()
  const [ars, setArs] = useState('')
  const [usd, setUsd] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [resultado, setResultado] = useState<{ esperado: EfectivoTurno; declarado: EfectivoTurno } | 'enviado' | null>(null)

  const desde = useMemo(() => inicioDelTurno(cierres, user.id, inicioDeHoy()), [cierres, user.id])
  const delTurno = useMemo(
    () => ventas.filter(v => Date.parse(v.created_at) > Date.parse(desde) && String(v.brand || '').toUpperCase() !== 'MOVIMIENTO'),
    [ventas, desde],
  )

  /* Sin cierre a ciegas, el vendedor ve lo que cobró en el turno. */
  const totales = useMemo(() => {
    if (ciegas) return null
    const t: Record<string, number> = {}
    for (const v of ventas) {
      if (!(Date.parse(v.created_at) > Date.parse(desde))) continue
      for (const p of v.payments || []) {
        const k = claveDeCaja(p)
        t[k] = (t[k] || 0) + (Number(p.original_amount ?? p.amount) || 0)
      }
    }
    return t
  }, [ventas, desde, ciegas])

  const cerrar = async () => {
    const declarado = { ars: parseFloat(ars) || 0, usd: parseFloat(usd) || 0 }
    if (ars === '' && usd === '') { toast.error('Contá el efectivo y cargalo (poné 0 si no hay)'); return }
    setGuardando(true)
    const ahora = new Date().toISOString()
    if (hayCierres) {
      const { error } = await supabase.from('cash_closures').insert({
        user_name: user.name,
        deposit_id: user.depositId,
        desde,
        declared_ars: declarado.ars,
        declared_usd: declarado.usd,
        notes: notas.trim() || null,
      })
      if (error) { setGuardando(false); toast.error('No se pudo guardar el cierre: ' + error.message); return }
    }
    setGuardando(false)
    if (ciegas) {
      setResultado('enviado')
    } else {
      // Sin cierre a ciegas: el vendedor ve la diferencia en el momento.
      const esperado = esperadoDelTurno(ventas.map(v => ({ ...v, seller_id: user.id })), user.id, desde, ahora)
      setResultado({ esperado, declarado })
    }
    if (!hayCierres) toast.warning('El cierre no quedó guardado: falta aplicar la migración de cierres de turno.', { duration: 8000 })
    router.refresh()
  }

  const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <div className="sh" style={{ marginBottom: 16 }}>
        <div>
          <div className="st">Mi caja</div>
          <div className="helper-text">
            Turno desde las {hora(desde)} · {delTurno.length} {delTurno.length === 1 ? 'venta' : 'ventas'}
          </div>
        </div>
      </div>

      {totales && Object.keys(totales).some(k => totales[k] !== 0) && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="sl" style={{ marginBottom: 12 }}>Cobrado en el turno</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            {Object.entries(totales).filter(([k, v]) => v !== 0 && ETIQUETA[k]).map(([k, v]) => (
              <div key={k} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{ETIQUETA[k]}</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
                  {k.startsWith('usd') || k === 'usdt' ? 'U$' : '$'} {v.toLocaleString('es-AR')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {resultado === null && (
        <div className="card">
          <div className="lbl" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Lock size={15} /> Cerrar turno
          </div>
          {ciegas ? (
            <div style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 16, background: 'var(--surface-2)', padding: 12, borderRadius: 10 }}>
              <EyeOff size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>Cierre a ciegas: contá los billetes y cargá lo que hay. El sistema no te muestra cuánto espera; el dueño ve si cuadra.</span>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 16 }}>
              Contá el efectivo del cajón y cargalo. Al cerrar ves si coincide con lo cobrado.
            </div>
          )}
          <div className="row">
            <div className="col field">
              <label className="lbl">Efectivo en pesos</label>
              <input className="inp" type="number" min="0" inputMode="decimal" value={ars} onChange={e => setArs(e.target.value)} placeholder="$ 0" />
            </div>
            <div className="col field">
              <label className="lbl">Efectivo en dólares</label>
              <input className="inp" type="number" min="0" inputMode="decimal" value={usd} onChange={e => setUsd(e.target.value)} placeholder="U$ 0" />
            </div>
          </div>
          <div className="field">
            <label className="lbl">Notas (opcional)</label>
            <input className="inp" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Ej: retiré $20.000 para el delivery" />
          </div>
          <button className="btn btn-dark btn-lg" style={{ width: '100%' }} onClick={cerrar} disabled={guardando}>
            {guardando ? <Loader2 className="spin" size={18} /> : 'Cerrar turno'}
          </button>
        </div>
      )}

      {resultado === 'enviado' && (
        <div className="card" style={{ textAlign: 'center', padding: 28 }}>
          <CheckCircle2 size={30} color="var(--green)" style={{ marginBottom: 10 }} />
          <div style={{ fontWeight: 700, fontSize: 16 }}>Cierre enviado</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6 }}>El dueño ve si cuadra. Podés seguir vendiendo: arranca un turno nuevo.</div>
          <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => { setResultado(null); setArs(''); setUsd(''); setNotas('') }}>Listo</button>
        </div>
      )}

      {resultado && resultado !== 'enviado' && (() => {
        const dif = { ars: resultado.declarado.ars - resultado.esperado.ars, usd: resultado.declarado.usd - resultado.esperado.usd }
        const cuadra = Math.abs(dif.ars) < 1 && Math.abs(dif.usd) < 0.01
        return (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, color: cuadra ? 'var(--green)' : 'var(--red)', marginBottom: 12 }}>
              {cuadra ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />} {cuadra ? 'La caja cuadra' : 'Hay diferencia'}
            </div>
            <div className="plata">
              <div className="plata-fila"><span>Esperado en pesos</span><span>$ {resultado.esperado.ars.toLocaleString('es-AR')}</span></div>
              <div className="plata-fila"><span>Contaste</span><span>$ {resultado.declarado.ars.toLocaleString('es-AR')}</span></div>
              <div className="plata-fila"><span>Esperado en dólares</span><span>U$ {resultado.esperado.usd.toLocaleString('es-AR')}</span></div>
              <div className="plata-fila"><span>Contaste</span><span>U$ {resultado.declarado.usd.toLocaleString('es-AR')}</span></div>
              {!cuadra && (
                <div className="plata-fila plata-total" style={{ color: 'var(--red)' }}>
                  <span>Diferencia</span>
                  <span>{dif.ars !== 0 ? `$ ${dif.ars.toLocaleString('es-AR')}` : ''}{dif.ars !== 0 && dif.usd !== 0 ? ' · ' : ''}{dif.usd !== 0 ? `U$ ${dif.usd.toLocaleString('es-AR')}` : ''}</span>
                </div>
              )}
            </div>
            <button className="btn btn-dark" style={{ width: '100%', marginTop: 16 }} onClick={() => { setResultado(null); setArs(''); setUsd(''); setNotas('') }}>Listo</button>
          </div>
        )
      })()}
    </div>
  )
}
