/**
 * Valores de toma: cuánto paga el local por un equipo usado que entra en
 * parte de pago, según modelo, capacidad y batería.
 *
 * Sin una tabla, cada vendedor tasa a ojo y el mismo iPhone entra a precios
 * distintos según quién atienda. Con la tabla, la pantalla de canje propone
 * el valor y el vendedor lo puede cambiar.
 *
 * Los tramos de batería son "desde X%": el que aplica es el más alto que el
 * equipo alcanza. Una fila sin capacidad vale para cualquier capacidad del
 * modelo, pero una con la capacidad exacta le gana.
 */

export interface ValorToma {
  id?: string
  model: string
  storage?: string | null
  battery_min: number
  value: number
  currency: 'ARS' | 'USD'
}

const normalizar = (s: string | null | undefined) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ')

/** El valor que corresponde a un equipo, o `null` si la tabla no lo cubre. */
export function valorSugerido(
  tabla: ValorToma[],
  equipo: { model: string; storage?: string | null; battery?: number | string | null },
): ValorToma | null {
  const modelo = normalizar(equipo.model)
  const capacidad = normalizar(equipo.storage)
  const bateria = Number(equipo.battery)
  // Sin batería cargada se toma el tramo más bajo: no se presume una batería buena.
  const bat = Number.isFinite(bateria) && String(equipo.battery ?? '').trim() !== '' ? bateria : -1

  const delModelo = tabla.filter(v => normalizar(v.model) === modelo)
  const exactos = delModelo.filter(v => capacidad && normalizar(v.storage) === capacidad)
  const genericos = delModelo.filter(v => !normalizar(v.storage))
  const candidatos = exactos.length > 0 ? exactos : genericos
  if (candidatos.length === 0) return null

  const ordenados = [...candidatos].sort((a, b) => b.battery_min - a.battery_min)
  return ordenados.find(v => bat >= v.battery_min) || ordenados[ordenados.length - 1]
}

/** Texto del tramo para mostrar: "batería 85% o más". */
export function describirTramo(v: Pick<ValorToma, 'battery_min'>): string {
  return v.battery_min > 0 ? `batería ${v.battery_min}% o más` : 'cualquier batería'
}
