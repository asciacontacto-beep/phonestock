/**
 * Códigos de barras de las cajas (UPC / EAN) y su equipo.
 *
 * Lo que hacía fallar al lector:
 *   * Muchas pistolas leen el UPC de Apple (12 dígitos) como EAN-13, con un
 *     0 adelante: 195949820908 ↔ 0195949820908. Nunca coincidía.
 *   * Sólo se buscaba en una tabla fija de 159 códigos; los que el local ya
 *     había cargado a mano (product_catalog) no se miraban.
 *   * La tabla fija tiene los colores en inglés ("Black") y la app en
 *     castellano ("Negro"): el color quedaba mal.
 *
 * Acá: se normaliza el código, se busca en la tabla fija y en el catálogo
 * aprendido, y se traduce lo encontrado a los nombres de la app.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { EAN_DB, MODELS, COLORS, almacenamientosDe } from '../constants/data'

/** Sólo dígitos, si el código es numérico (con espacios o guiones). */
function digitos(raw: string): string | null {
  const s = String(raw || '').trim()
  return /^[\d\s-]+$/.test(s) ? s.replace(/\D/g, '') : null
}

/**
 * Las formas en que puede venir el mismo código: UPC-A (12), EAN-13 con 0
 * adelante (13) y GTIN-14 (14). La primera es la canónica (para guardar).
 */
export function variantesDeCodigo(raw: string): string[] {
  const d = digitos(raw)
  if (!d) return String(raw || '').trim() ? [String(raw).trim()] : []
  let upc = d
  if (d.length === 14 && d.startsWith('00')) upc = d.slice(2)
  else if (d.length === 13 && d.startsWith('0')) upc = d.slice(1)
  const out = [upc, `0${upc}`, `00${upc}`, d]
  return [...new Set(out)].filter(x => x.length >= 8)
}

/** El código como se guarda en el catálogo (12 dígitos si es un UPC). */
export function codigoCanonico(raw: string): string {
  return variantesDeCodigo(raw)[0] || String(raw || '').trim()
}

/** ¿Es un número de 15 dígitos válido como IMEI (dígito verificador Luhn)? */
export function esImei(raw: string): boolean {
  const d = digitos(String(raw || '').replace(/^\s*imei[\w\s/]*?[:\s]\s*/i, ''))
  if (!d || d.length !== 15) return false
  let suma = 0
  for (let i = 0; i < 15; i++) {
    let n = Number(d[14 - i])
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9 }
    suma += n
  }
  return suma % 10 === 0
}

/* ── Nombres de la tabla fija → nombres de la app ───────────────────── */

const COLORES_ES: Record<string, string[]> = {
  'black': ['Negro'], 'white': ['Blanco'], 'yellow': ['Amarillo'], 'blue': ['Azul'],
  'pink': ['Rosa'], 'green': ['Verde'], 'purple': ['Morado'], '(product)red': ['Rojo'], 'red': ['Rojo'],
  'midnight': ['Medianoche'], 'starlight': ['Blanco Estrella', 'Blanco Estelar'],
  'gold': ['Oro'], 'silver': ['Plata'], 'graphite': ['Grafito'],
  'space black': ['Negro Espacial'], 'space gray': ['Gris Espacial'], 'deep purple': ['Morado Oscuro'],
  'sierra blue': ['Azul Sierra'], 'alpine green': ['Verde Alpino'], 'pacific blue': ['Azul Pacífico'],
  'midnight green': ['Verde Medianoche'], 'teal': ['Verde Azulado (Teal)'], 'ultramarine': ['Azul Ultramar'],
  'black titanium': ['Titanio Negro'], 'white titanium': ['Titanio Blanco'],
  'blue titanium': ['Titanio Azul'], 'natural titanium': ['Titanio Natural'], 'desert titanium': ['Titanio Desierto'],
}

export function modeloDeLaApp(brand: string, model: string): string {
  const lista = MODELS[brand] || []
  if (lista.includes(model)) return model
  const traducido = model
    .replace(/\((\d)(st|nd|rd|th) Gen\)/i, (_, n) => `(${n}${n === '1' ? 'ra' : n === '2' ? 'da' : n === '3' ? 'ra' : 'ta'} Gen)`)
  return lista.includes(traducido) ? traducido : model
}

/** El color en el nombre que usa la app para ese modelo. */
export function colorDeLaApp(model: string, color: string | null | undefined): string {
  const opciones = COLORS[model] || []
  const c = String(color || '').trim()
  if (!c) return opciones[0] || ''
  if (opciones.includes(c)) return c
  const candidatos = COLORES_ES[c.toLowerCase()] || []
  return candidatos.find(x => opciones.includes(x)) || candidatos[0] || c
}

export type EquipoDeCodigo = { brand: string; model: string; storage: string; color: string; codigo: string }

/** Traduce una fila (tabla fija o catálogo) a lo que la app entiende. */
export function equipoParaLaApp(fila: { brand?: string | null; model?: string | null; storage?: string | null; color?: string | null }, codigo: string): EquipoDeCodigo | null {
  if (!fila?.brand || !fila?.model) return null
  const model = modeloDeLaApp(fila.brand, fila.model)
  const memorias = almacenamientosDe(model)
  const storage = fila.storage && (memorias.length === 0 || memorias.includes(fila.storage)) ? fila.storage : (memorias[0] || fila.storage || '')
  return { brand: fila.brand, model, storage, color: colorDeLaApp(model, fila.color), codigo }
}

/** Busca el código en la tabla fija y en lo que ya se aprendió (product_catalog). */
export async function buscarEquipoPorCodigo(supabase: SupabaseClient, raw: string): Promise<EquipoDeCodigo | null> {
  const variantes = variantesDeCodigo(raw)
  if (variantes.length === 0) return null
  for (const v of variantes) {
    if (EAN_DB[v]) return equipoParaLaApp(EAN_DB[v], v)
  }
  const { data } = await supabase.from('product_catalog').select('upc,brand,model,storage,color').in('upc', variantes).limit(1)
  const fila = data?.[0] as { upc: string; brand: string; model: string; storage?: string; color?: string } | undefined
  return fila ? equipoParaLaApp(fila, fila.upc) : null
}
