/**
 * Reparto de la ganancia entre socios.
 *
 * Muchos locales son de dos (o más) socios que se dividen la ganancia del
 * mes. Se cargan en Ajustes → Socios con su porcentaje; los retiros de cada
 * uno se anotan en Cajas como un egreso marcado con el socio. En Mes a mes
 * se ve, para cada mes: la ganancia neta, cuánto le toca a cada socio,
 * cuánto retiró y cuánto le queda por retirar.
 *
 * Todo en dólares, como el resto de los reportes. Los retiros en pesos se
 * pasan con la cotización general del local.
 */

export interface Socio {
  id: string
  nombre: string
  /** Porcentaje de la ganancia: 50 = la mitad. */
  pct: number
}

export interface RetiroSocio {
  socio_id: string | null
  amount: number | string
  currency?: string | null
  created_at: string
}

export interface RepartoSocio {
  socio: Socio
  /** Lo que le corresponde de la ganancia neta del mes. */
  toca: number
  /** Lo que ya retiró ese mes. */
  retiro: number
  /** Lo que le falta retirar (negativo: retiró de más). */
  queda: number
}

/** Los socios guardados, limpios: sin nombre o sin porcentaje no cuentan. */
export function sociosValidos(v: unknown): Socio[] {
  if (!Array.isArray(v)) return []
  return v
    .map(x => x as Partial<Socio>)
    .filter(x => x && typeof x.id === 'string' && String(x.nombre || '').trim() && Number(x.pct) > 0)
    .map(x => ({ id: String(x.id), nombre: String(x.nombre).trim(), pct: Number(x.pct) }))
}

/** null si está bien; si no, qué corregir. */
export function errorDeSocios(socios: { nombre: string; pct: number | string }[]): string | null {
  if (socios.length === 0) return null
  if (socios.some(s => !String(s.nombre).trim())) return 'Poné el nombre de cada socio'
  if (socios.some(s => !(Number(s.pct) > 0))) return 'Cada socio tiene que tener un porcentaje'
  const total = Math.round(socios.reduce((a, s) => a + Number(s.pct), 0) * 100) / 100
  if (total !== 100) return `Los porcentajes tienen que sumar 100 (ahora suman ${total.toLocaleString('es-AR')})`
  return null
}

export function retiroEnDolares(r: RetiroSocio, cotizacion: number): number {
  const monto = Number(r.amount) || 0
  return r.currency === 'USD' ? monto : monto / (cotizacion || 1)
}

/**
 * El reparto de un mes. Si la ganancia neta es negativa, a cada uno le
 * "toca" su parte de la pérdida (negativo): así se ve claro que ese mes no
 * hubo para repartir.
 */
export function repartoDelMes(
  gananciaNeta: number,
  socios: Socio[],
  retiros: RetiroSocio[],
  mes: { desde: Date; hasta: Date },
  cotizacion: number,
): RepartoSocio[] {
  const delMes = retiros.filter(r => {
    const t = new Date(r.created_at).getTime()
    return t >= mes.desde.getTime() && t < mes.hasta.getTime()
  })
  return socios.map(socio => {
    const toca = gananciaNeta * socio.pct / 100
    const retiro = delMes.filter(r => r.socio_id === socio.id).reduce((a, r) => a + retiroEnDolares(r, cotizacion), 0)
    return { socio, toca, retiro, queda: toca - retiro }
  })
}
