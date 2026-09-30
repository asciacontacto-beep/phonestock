"use client"
import { useEffect, useMemo, useState } from 'react'
import { Smartphone, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import { MODELS, STORAGES } from '@/constants/data'
import { describirTramo, type ValorToma } from '@/utils/valoresToma'
import { AVISO_MIGRACION_CUENTAS } from '@/utils/cuentasDb'

/**
 * Tabla de valores de toma: cuánto se paga por un usado según modelo,
 * capacidad y batería. La pantalla de canje propone el valor; el vendedor
 * lo puede cambiar.
 */
export function ValoresTomaCard() {
  const supabase = createClient()
  const [filas, setFilas] = useState<ValorToma[]>([])
  const [disponible, setDisponible] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ model: 'iPhone 13', storage: '', battery_min: '0', value: '', currency: 'USD' as 'USD' | 'ARS' })

  useEffect(() => {
    supabase.from('tradein_values').select('*').order('model').order('battery_min', { ascending: false }).then(({ data, error }) => {
      if (error) setDisponible(false)
      setFilas((data || []) as ValorToma[])
      setLoading(false)
    })
  }, [supabase])

  const modelos = useMemo(() => (MODELS['Apple'] || []).filter(m => m.startsWith('iPhone')), [])

  const agregar = async () => {
    const value = parseFloat(form.value)
    if (!form.model.trim()) { toast.error('Elegí el modelo'); return }
    if (!(value >= 0) || form.value === '') { toast.error('Poné el valor de toma'); return }
    setSaving(true)
    const { data, error } = await supabase.from('tradein_values').insert({
      model: form.model.trim(),
      storage: form.storage || null,
      battery_min: Math.min(100, Math.max(0, parseInt(form.battery_min) || 0)),
      value,
      currency: form.currency,
    }).select().single()
    setSaving(false)
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Ya hay un valor para ese modelo, capacidad y tramo de batería.' : error.message)
      return
    }
    setFilas(f => [...f, data as ValorToma].sort((a, b) => a.model.localeCompare(b.model) || b.battery_min - a.battery_min))
    setForm(f => ({ ...f, value: '' }))
    toast.success('Valor agregado')
  }

  const borrar = async (fila: ValorToma) => {
    const { error } = await supabase.from('tradein_values').delete().eq('id', fila.id)
    if (error) { toast.error(error.message); return }
    setFilas(f => f.filter(x => x.id !== fila.id))
  }

  return (
    <div className="card">
      <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Smartphone size={15} /> Valores de toma
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 14 }}>
        Cuánto pagás por un usado que entra en parte de pago, según modelo, capacidad y batería.
        Al tomar un equipo, la venta te propone este valor. Cada fila es un tramo «desde X% de batería»;
        sin capacidad, vale para todas las del modelo.
      </div>

      {loading ? <Loader2 className="spin" size={16} /> : !disponible ? (
        <div className="cfg-aviso">{AVISO_MIGRACION_CUENTAS}</div>
      ) : (
        <>
          {filas.length === 0 ? (
            <div className="cfg-vacio">
              Todavía no cargaste valores. Ejemplo: iPhone 13 · 128GB · batería 85% o más → U$ 300;
              iPhone 13 · 128GB · cualquier batería → U$ 250.
            </div>
          ) : (
            <div className="tw" style={{ marginBottom: 14 }}>
              <table className="table" style={{ fontSize: 13 }}>
                <thead><tr><th>Modelo</th><th>Capacidad</th><th>Batería</th><th style={{ textAlign: 'right' }}>Valor</th><th /></tr></thead>
                <tbody>
                  {filas.map(f => (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 600 }}>{f.model}</td>
                      <td>{f.storage || <span style={{ color: 'var(--text-3)' }}>todas</span>}</td>
                      <td>{describirTramo(f)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono' }}>{f.currency === 'USD' ? 'U$' : '$'} {Number(f.value).toLocaleString('es-AR')}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => borrar(f)} title="Eliminar"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="cfg-alta">
            <div style={{ flex: '2 1 150px' }}>
              <label className="lbl">Modelo</label>
              <input className="inp" list="toma-modelos" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
              <datalist id="toma-modelos">{modelos.map(m => <option key={m} value={m} />)}</datalist>
            </div>
            <div style={{ flex: '1 1 100px' }}>
              <label className="lbl">Capacidad</label>
              <select className="inp" value={form.storage} onChange={e => setForm(f => ({ ...f, storage: e.target.value }))}>
                <option value="">Todas</option>
                {STORAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 90px' }}>
              <label className="lbl">Batería desde %</label>
              <input className="inp" type="number" min="0" max="100" value={form.battery_min} onChange={e => setForm(f => ({ ...f, battery_min: e.target.value }))} />
            </div>
            <div style={{ flex: '1 1 90px' }}>
              <label className="lbl">Valor</label>
              <input className="inp" type="number" min="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && agregar()} />
            </div>
            <div style={{ flex: '0 1 80px' }}>
              <label className="lbl">Moneda</label>
              <select className="inp" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value as 'USD' | 'ARS' }))}>
                <option value="USD">USD</option><option value="ARS">ARS</option>
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
