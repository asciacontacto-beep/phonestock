"use client"
import { useEffect, useState } from 'react'
import { Landmark, Plus, Loader2, RotateCcw, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import { NOMBRE_TIPO, type Cuenta, type TipoCuenta } from '@/utils/cuentas'
import { cargarCuentas, AVISO_MIGRACION_CUENTAS } from '@/utils/cuentasDb'

/**
 * Cuentas del local: dónde entra la plata que no es efectivo.
 *
 * Con una sola cuenta por moneda la venta no pregunta nada. Con más de una,
 * al cobrar por transferencia el vendedor elige a cuál entró.
 */
export function CuentasCard({ onChange }: { onChange?: (cuentas: Cuenta[]) => void }) {
  const supabase = createClient()
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [disponible, setDisponible] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<{ name: string; kind: TipoCuenta; currency: 'ARS' | 'USD' }>({ name: '', kind: 'banco', currency: 'ARS' })

  useEffect(() => {
    cargarCuentas(supabase).then(r => {
      setCuentas(r.cuentas)
      setDisponible(r.disponible)
      setLoading(false)
      onChange?.(r.cuentas)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const actualizar = (lista: Cuenta[]) => { setCuentas(lista); onChange?.(lista) }

  const agregar = async () => {
    if (!form.name.trim()) { toast.error('Poné el nombre de la cuenta'); return }
    setSaving(true)
    const { data, error } = await supabase.from('accounts')
      .insert({ name: form.name.trim(), kind: form.kind, currency: form.currency })
      .select('id,name,kind,currency,active').single()
    setSaving(false)
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Ya tenés una cuenta con ese nombre en esa moneda.' : error.message)
      return
    }
    actualizar([...cuentas, data as Cuenta].sort((a, b) => a.name.localeCompare(b.name)))
    setForm(f => ({ ...f, name: '' }))
    toast.success('Cuenta agregada')
  }

  /* Una cuenta con ventas no se borra: se da de baja. Las ventas viejas
     siguen mostrando su nombre (va guardado en el pago). */
  const cambiarActiva = async (c: Cuenta, active: boolean) => {
    const { error } = await supabase.from('accounts').update({ active }).eq('id', c.id)
    if (error) { toast.error(error.message); return }
    actualizar(cuentas.map(x => x.id === c.id ? { ...x, active } : x))
    toast.success(active ? 'Cuenta reactivada' : 'Cuenta dada de baja')
  }

  return (
    <div className="card">
      <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Landmark size={15} /> Cuentas
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 14 }}>
        Dónde entra la plata que no es efectivo: tu banco, Mercado Pago o la cuenta de una financiera.
        Si tenés más de una en la misma moneda, al cobrar por transferencia se elige a cuál entró.
      </div>

      {loading ? <Loader2 className="spin" size={16} /> : !disponible ? (
        <div className="cfg-aviso">{AVISO_MIGRACION_CUENTAS}</div>
      ) : (
        <>
          {cuentas.length === 0 ? (
            <div className="cfg-vacio">
              Todavía no cargaste ninguna cuenta. Sin cuentas, las transferencias se registran como hasta ahora,
              sin decir a dónde entraron.
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
                Ejemplos: Galicia (banco, ARS) — Mercado Pago (billetera, ARS) — Financiera X (financiera, ARS)
              </div>
            </div>
          ) : (
            <div className="cfg-lista">
              {cuentas.map(c => (
                <div key={c.id} className="cfg-fila" data-baja={c.active === false}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {NOMBRE_TIPO[c.kind] || c.kind} · {c.currency}{c.active === false ? ' · dada de baja' : ''}
                    </div>
                  </div>
                  {c.active === false ? (
                    <button className="btn btn-outline btn-sm" onClick={() => cambiarActiva(c, true)}><RotateCcw size={13} /> Reactivar</button>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => cambiarActiva(c, false)} title="Deja de ofrecerse al cobrar; las ventas viejas no cambian">
                      <EyeOff size={13} /> Dar de baja
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="cfg-alta">
            <div style={{ flex: '2 1 160px' }}>
              <label className="lbl">Nombre</label>
              <input className="inp" placeholder="Ej: Galicia, Mercado Pago" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && agregar()} />
            </div>
            <div style={{ flex: '1.5 1 140px' }}>
              <label className="lbl">Tipo</label>
              <select className="inp" value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value as TipoCuenta }))}>
                {(Object.keys(NOMBRE_TIPO) as TipoCuenta[]).map(k => <option key={k} value={k}>{NOMBRE_TIPO[k]}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 90px' }}>
              <label className="lbl">Moneda</label>
              <select className="inp" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value as 'ARS' | 'USD' }))}>
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <button className="btn btn-dark" style={{ height: 42 }} onClick={agregar} disabled={saving}>
              {saving ? <Loader2 className="spin" size={15} /> : <Plus size={15} />} Agregar
            </button>
          </div>
        </>
      )}
    </div>
  )
}
