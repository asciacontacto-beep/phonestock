"use client"
/**
 * Ajustes → Socios: quiénes son los dueños del local y qué porcentaje de la
 * ganancia le toca a cada uno. Con esto, Mes a mes muestra el reparto de
 * cada mes y Cajas deja marcar los retiros de cada socio. Ver utils/socios.
 */
import { useEffect, useState } from 'react'
import { Users, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import { sociosValidos, errorDeSocios } from '@/utils/socios'

type Fila = { id: string; nombre: string; pct: string }
const nuevoId = () => (globalThis.crypto?.randomUUID?.() || `s-${Date.now()}-${Math.round(Math.random() * 1e6)}`)

export function SociosCard({ orgId }: { orgId: string | null | undefined }) {
  const supabase = createClient()
  const [filas, setFilas] = useState<Fila[]>([])
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'sin-migracion'>('cargando')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!orgId) return
    supabase.from('settings').select('socios').eq('org_id', orgId).limit(1).maybeSingle()
      .then(({ data, error }) => {
        if (error) { setEstado('sin-migracion'); return }
        setFilas(sociosValidos(data?.socios).map(s => ({ id: s.id, nombre: s.nombre, pct: String(s.pct) })))
        setEstado('listo')
      })
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  const cambiar = (i: number, k: 'nombre' | 'pct', v: string) => setFilas(f => f.map((x, j) => j === i ? { ...x, [k]: v } : x))
  const agregar = () => setFilas(f => {
    // Al sumar uno, se propone el reparto en partes iguales.
    const n = f.length + 1
    const parte = String(Math.round(100 / n * 100) / 100)
    return [...f.map(x => ({ ...x, pct: parte })), { id: nuevoId(), nombre: '', pct: parte }]
  })
  const quitar = (i: number) => setFilas(f => f.filter((_, j) => j !== i))
  const total = Math.round(filas.reduce((a, f) => a + (Number(f.pct) || 0), 0) * 100) / 100

  const guardar = async () => {
    const error = errorDeSocios(filas)
    if (error) { toast.error(error); return }
    setGuardando(true)
    const socios = filas.map(f => ({ id: f.id, nombre: f.nombre.trim(), pct: Number(f.pct) }))
    const { error: e } = await supabase.from('settings').update({ socios }).eq('org_id', orgId)
    setGuardando(false)
    if (e) { toast.error('No se pudo guardar: ' + e.message); return }
    toast.success(socios.length ? 'Socios guardados' : 'Se quitaron los socios')
  }

  return (
    <div className="card">
      <div className="lbl" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Users size={15} /> Socios
      </div>
      <p className="soc-intro">
        Si el local es de más de una persona, cargá a cada socio con su parte de la ganancia. En <strong>Mes a mes</strong> vas
        a ver cuánto le toca a cada uno por mes, y en <strong>Cajas</strong> podés marcar los retiros de cada socio para
        descontarlos.
      </p>

      {estado === 'cargando' ? (
        <div className="soc-vacio"><Loader2 size={16} className="spin" /> Cargando…</div>
      ) : estado === 'sin-migracion' ? (
        <div className="cfg-aviso">Esta función todavía no está activa en tu cuenta. Escribinos por WhatsApp y la activamos.</div>
      ) : (
        <>
          {filas.length === 0 ? (
            <div className="soc-vacio">Sin socios cargados: toda la ganancia es del local.</div>
          ) : (
            <div className="soc-lista">
              {filas.map((f, i) => (
                <div key={f.id} className="soc-fila">
                  <input className="inp" placeholder={`Socio ${i + 1}`} value={f.nombre} onChange={e => cambiar(i, 'nombre', e.target.value)} aria-label="Nombre del socio" />
                  <div className="soc-pct">
                    <input className="inp" type="text" inputMode="decimal" value={f.pct} onChange={e => cambiar(i, 'pct', e.target.value.replace(/[^0-9.]/g, ''))} aria-label="Porcentaje" />
                    <span>%</span>
                  </div>
                  <button className="btn-icon" aria-label="Quitar socio" onClick={() => quitar(i)}><Trash2 size={15} color="var(--red)" /></button>
                </div>
              ))}
              <div className={`soc-total ${total === 100 ? 'ok' : 'mal'}`}>Total {total.toLocaleString('es-AR')}%{total !== 100 ? ' · tiene que sumar 100' : ''}</div>
            </div>
          )}
          <div className="soc-acciones">
            <button className="btn btn-outline btn-sm" onClick={agregar}><Plus size={14} /> Agregar socio</button>
            <button className="btn btn-dark btn-sm" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar socios'}</button>
          </div>
        </>
      )}
    </div>
  )
}
