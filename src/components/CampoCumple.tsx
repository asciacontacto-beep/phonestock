"use client"
import { MESES } from '@/utils/cumpleanos'

/** Cumpleaños del cliente: día y mes (sin año). Ver utils/cumpleanos.ts. */
export function CampoCumple({ dia, mes, onChange, label = 'Cumpleaños (opcional)' }: {
  dia: number | string | null | undefined
  mes: number | string | null | undefined
  onChange: (dia: number | null, mes: number | null) => void
  label?: string
}) {
  const d = dia ? String(dia) : ''
  const m = mes ? String(mes) : ''
  return (
    <div>
      <label className="lbl">{label}</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 90px) minmax(0, 1fr)', gap: 8 }}>
        <select className="inp" aria-label="Día" value={d}
          onChange={e => onChange(e.target.value ? Number(e.target.value) : null, m ? Number(m) : null)}>
          <option value="">Día</option>
          {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
        </select>
        <select className="inp" aria-label="Mes" value={m}
          onChange={e => onChange(d ? Number(d) : null, e.target.value ? Number(e.target.value) : null)}>
          <option value="">Mes</option>
          {MESES.map((nombre, i) => <option key={nombre} value={i + 1}>{nombre[0].toUpperCase() + nombre.slice(1)}</option>)}
        </select>
      </div>
    </div>
  )
}
