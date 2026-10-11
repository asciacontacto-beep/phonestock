/**
 * Estadística chica para el Análisis del negocio.
 *
 * Todo se compara contra la historia del propio local, con medidas que un
 * dato raro no tuerce (mediana y percentiles, no promedio), y una baja de
 * ventas sólo se anuncia si no se explica por azar.
 */

/** Percentil p (0..1) con interpolación lineal. null si no hay datos. */
export function percentil(valores: number[], p: number): number | null {
  const v = valores.filter(Number.isFinite).sort((a, b) => a - b)
  if (v.length === 0) return null
  if (v.length === 1) return v[0]
  const pos = Math.min(1, Math.max(0, p)) * (v.length - 1)
  const i = Math.floor(pos)
  const f = pos - i
  return i + 1 < v.length ? v[i] + (v[i + 1] - v[i]) * f : v[i]
}

export const mediana = (valores: number[]) => percentil(valores, 0.5)

const logFact = (() => {
  const cache = [0]
  return (n: number) => {
    for (let i = cache.length; i <= n; i++) cache[i] = cache[i - 1] + Math.log(i)
    return cache[n]
  }
})()

/**
 * ¿Es casualidad que de n ventas, `a` cayeran en un período y n-a en otro
 * de igual largo? Test binomial exacto a dos colas con p = 0,5 (equivale a
 * comparar dos conteos de Poisson). Devuelve el p-valor: chico = no es azar.
 */
export function pValorBinomial(a: number, b: number): number {
  const n = a + b
  if (n === 0) return 1
  const prob = (k: number) => Math.exp(logFact(n) - logFact(k) - logFact(n - k) - n * Math.LN2)
  const pa = prob(a)
  let p = 0
  for (let k = 0; k <= n; k++) {
    const pk = prob(k)
    if (pk <= pa * (1 + 1e-9)) p += pk
  }
  return Math.min(1, p)
}

/** Probabilidad acumulada de la normal estándar (aproximación de Abramowitz-Stegun, error < 1e-7). */
export function normalAcumulada(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2)
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2)
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2
}

/**
 * ¿Las ventas se reparten parejo entre los días, o hay días que venden más
 * de verdad? Test chi-cuadrado de bondad de ajuste contra un reparto
 * parejo. Devuelve el p-valor (chico = la diferencia no es azar), con la
 * aproximación de Wilson-Hilferty, de sobra precisa para decidir.
 */
export function pValorParejo(conteos: number[]): number {
  const k = conteos.length
  const n = conteos.reduce((a, b) => a + b, 0)
  if (k < 2 || n === 0) return 1
  const e = n / k
  const x2 = conteos.reduce((a, o) => a + (o - e) ** 2 / e, 0)
  const df = k - 1
  const z = (Math.cbrt(x2 / df) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df))
  return Math.min(1, Math.max(0, 1 - normalAcumulada(z)))
}

/** Cuánto se puede confiar según la cantidad de casos. */
export type Confianza = 'alta' | 'media' | 'baja'
export function confianzaPorCasos(n: number, alta = 30, media = 10): Confianza {
  return n >= alta ? 'alta' : n >= media ? 'media' : 'baja'
}

/** Días enteros entre dos fechas (b - a). */
export function diasEntre(a: string | Date, b: string | Date): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

/** "Apple iPhone 13 128GB" agrupa igual aunque se haya escrito "iphone 13 " o "128 GB". */
export function claveModelo(e: { brand?: string | null; model?: string | null; storage?: string | null }, conCapacidad = true): string {
  const limpio = (s?: string | null) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim()
  const cap = limpio(e.storage).replace(/\s/g, '')
  return [limpio(e.brand), limpio(e.model), conCapacidad && cap && cap !== '-' ? cap : ''].filter(Boolean).join('|')
}

export function nombreModelo(e: { brand?: string | null; model?: string | null; storage?: string | null }, conCapacidad = true): string {
  return [e.brand, e.model, conCapacidad && e.storage && e.storage !== '-' ? e.storage : '']
    .map(s => String(s || '').trim()).filter(Boolean).join(' ')
}
