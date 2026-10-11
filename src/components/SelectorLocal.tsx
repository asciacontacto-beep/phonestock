"use client"
import { Store } from 'lucide-react'
import { nombreGeneral, type Deposito, type Local } from '@/utils/locales'

/**
 * Elegir de qué local ver los números. Sólo aparece si hay más de un local.
 * "General" excluye los locales marcados con cuentas aparte.
 */
export function SelectorLocal({ depositos, valor, onChange }: {
  depositos: Deposito[]
  valor: Local
  onChange: (l: Local) => void
}) {
  if (depositos.length < 2) return null
  return (
    <label className="selector-local">
      <Store size={14} aria-hidden />
      <select className="inp" value={valor} onChange={e => onChange(e.target.value)} aria-label="Ver los números de">
        <option value="general">{nombreGeneral(depositos)}</option>
        {depositos.map(d => (
          <option key={String(d.id)} value={String(d.id)}>{d.name}{d.cuentas_aparte ? ' (cuentas aparte)' : ''}</option>
        ))}
      </select>
    </label>
  )
}
