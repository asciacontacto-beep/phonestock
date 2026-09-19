"use client"
import { useEffect, useState } from 'react'
import { AlertTriangle, Clock } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { estadoDeCuenta, type ResultadoCuenta } from '@/utils/suscripcion'

/**
 * Aviso del estado de la cuenta, arriba de todo.
 *
 * Se muestra sólo cuando hay algo que decir: con licencia de por vida, o con
 * la suscripción al día y lejos del vencimiento, no aparece nada. La idea es
 * que el local se entere ANTES de quedarse sin cargar ventas, no el día que
 * deja de poder trabajar.
 */
export function AvisoDeCuenta({ orgId }: { orgId: string | null }) {
  const [cuenta, setCuenta] = useState<ResultadoCuenta | null>(null)

  useEffect(() => {
    if (!orgId) return
    const supabase = createClient()
    supabase.from('organizations')
      .select('plan,trial_expires_at,paid_until')
      .eq('id', orgId)
      .maybeSingle()
      .then(({ data }) => {
        // Sin la columna `plan` (migración sin correr) no se molesta a nadie.
        if (data) setCuenta(estadoDeCuenta(data, new Date().toLocaleDateString('en-CA')))
      })
  }, [orgId])

  if (!cuenta?.avisar || !cuenta.mensaje) return null

  const grave = cuenta.estado === 'solo_lectura'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      padding: '10px 18px', fontSize: 13, lineHeight: 1.5,
      background: grave ? 'var(--red-dim)' : 'var(--amber-dim)',
      color: grave ? '#991b1b' : '#92400e',
      borderBottom: `1px solid ${grave ? 'rgba(220,38,38,.2)' : 'rgba(217,119,6,.2)'}`,
    }}>
      {grave ? <AlertTriangle size={15} style={{ flexShrink: 0 }} /> : <Clock size={15} style={{ flexShrink: 0 }} />}
      <span style={{ flex: 1, minWidth: 200 }}>{cuenta.mensaje}</span>
      <a
        className="btn btn-sm"
        href={`https://wa.me/?text=${encodeURIComponent('Hola, quiero renovar mi cuenta de Stackr.')}`}
        target="_blank" rel="noopener noreferrer"
        style={{
          background: grave ? '#991b1b' : '#92400e', color: '#fff',
          padding: '5px 12px', fontSize: 12, fontWeight: 600, textDecoration: 'none', borderRadius: 8,
        }}
      >
        {grave ? 'Renovar' : 'Renovar ahora'}
      </a>
    </div>
  )
}
