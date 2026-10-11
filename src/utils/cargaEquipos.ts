/**
 * Ingreso de varias unidades a la vez (Ingresar equipo).
 *
 * Antes: el IMEI sólo se podía cargar con cantidad 1, y el precio y el
 * costo se pedían dos veces (paso 1 y cada variante del paso 2), ganando
 * siempre el segundo sin que se entendiera por qué.
 *
 * Ahora: precio y costo se cargan una vez (paso 1); una variante usa otros
 * sólo si se lo pide explícitamente (precioPropio). Y cada unidad tiene su
 * IMEI.
 */

import { limpiarImei } from './imei'

export type VarianteCarga = {
  qty: number | string
  imeis?: string[]
  /** La variante tiene su propio precio/costo (si no, los del paso 1). */
  precioPropio?: boolean
  price?: string
  costPrice?: string
}

export const cantidad = (v: VarianteCarga) => Math.max(0, Math.floor(Number(v.qty) || 0))

/** El IMEI de la unidad k de la variante (o null si no se cargó). */
export function imeiDeUnidad(v: VarianteCarga, k: number): string | null {
  return limpiarImei(v.imeis?.[k]) || null
}

/** Todos los IMEI cargados en la carga, para controlar repetidos. */
export function imeisDeLaCarga(variantes: VarianteCarga[]): string[] {
  return variantes.flatMap(v =>
    Array.from({ length: cantidad(v) }, (_, k) => imeiDeUnidad(v, k)).filter((x): x is string => !!x))
}

const numero = (s: string | undefined) => {
  const n = parseFloat(String(s ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Precio de venta de la variante: el propio si lo tiene, si no el del paso 1. */
export function precioDeVariante(v: VarianteCarga, base: string): number | null {
  return (v.precioPropio ? numero(v.price) : null) ?? numero(base)
}

/** Costo de la variante: el propio si lo tiene, si no el del paso 1. */
export function costoDeVariante(v: VarianteCarga, base: string): number | null {
  return (v.precioPropio ? numero(v.costPrice) : null) ?? numero(base)
}
