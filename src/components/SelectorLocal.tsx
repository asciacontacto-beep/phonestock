"use client"
import { Store } from 'lucide-react'
import { opcionesDeLocal, type Deposito, type Local } from '@/utils/locales'

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
        {opcionesDeLocal(depositos).map(o => <option key={o.valor} value={o.valor}>{o.nombre}</option>)}
      </select>
    </label>
  )
}
