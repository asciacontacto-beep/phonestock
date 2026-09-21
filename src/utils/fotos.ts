/**
 * Fotos de los equipos del catálogo.
 *
 * Una foto de un teléfono actual pesa 3-8 MB. Subida así, cien equipos con
 * tres fotos llenan un plan gratis de Supabase. Por eso se comprime en el
 * navegador ANTES de subir, y se guardan dos tamaños:
 *
 *   * grande: 1600 px de lado máximo. Es lo que se ve al abrir la foto;
 *     alcanza para una pantalla de teléfono con zoom y sigue viéndose nítida.
 *   * miniatura: 480 px. Es la que carga la grilla de la vidriera, que así
 *     abre rápido con datos móviles.
 *
 * WebP porque, a la misma calidad visible, pesa bastante menos que JPEG.
 * Safari viejo no sabe generar WebP: en ese caso sale JPEG.
 *
 * Los archivos van a Supabase Storage, no a la base: en `stock.photos` sólo
 * se guarda la ruta de cada uno.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export const BUCKET_FOTOS = 'catalogo'
export const MAX_FOTOS = 4

const GRANDE = { lado: 1600, calidad: 0.82 }
const MINI = { lado: 480, calidad: 0.74 }
/** El depósito rechaza más de 1 MB; se deja margen. */
const TOPE_BYTES = 900 * 1024

/** Medidas finales conservando la proporción. Nunca agranda. */
export function medidas(ancho: number, alto: number, lado: number): { ancho: number; alto: number } {
  const mayor = Math.max(ancho, alto)
  if (mayor <= lado) return { ancho, alto }
  const f = lado / mayor
  return { ancho: Math.round(ancho * f), alto: Math.round(alto * f) }
}

/** `org/42/abc.webp` → `org/42/abc-mini.webp` */
export function rutaMiniatura(ruta: string): string {
  return ruta.replace(/(\.[a-z0-9]+)$/i, '-mini$1')
}

/**
 * URL pública de una foto.
 *
 * Va DIRECTO a Supabase y no por el desvío `/sb` de la app: las imágenes
 * las sirve la CDN de Supabase y no gastan el ancho de banda de Vercel. Una
 * etiqueta <img> a otro dominio no la bloquea Safari (lo que bloquea son las
 * peticiones con sesión, ver utils/supabase/env.ts).
 */
export function urlFoto(ruta: string, mini = false): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  const r = mini ? rutaMiniatura(ruta) : ruta
  return `${base}/storage/v1/object/public/${BUCKET_FOTOS}/${r.split('/').map(encodeURIComponent).join('/')}`
}

/* ── Sólo navegador ──────────────────────────────────────────────────── */

function cargarImagen(archivo: File): Promise<HTMLImageElement> {
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    // Los navegadores actuales aplican la rotación EXIF al decodificar, así
    // que una foto vertical del teléfono no sale acostada.
    img.onload = () => { URL.revokeObjectURL(url); ok(img) }
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('No se pudo leer la imagen. Probá con una foto JPG o PNG.')) }
    img.src = url
  })
}

function aBlob(lienzo: HTMLCanvasElement, tipo: string, calidad: number): Promise<Blob | null> {
  return new Promise(ok => lienzo.toBlob(ok, tipo, calidad))
}

async function reducir(img: HTMLImageElement, lado: number, calidad: number): Promise<Blob> {
  const { ancho, alto } = medidas(img.naturalWidth, img.naturalHeight, lado)
  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new Error('El navegador no permite procesar imágenes.')
  // Fondo blanco: un PNG con transparencia pasado a JPEG quedaría negro.
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, ancho, alto)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, ancho, alto)

  let q = calidad
  for (let intento = 0; intento < 4; intento++) {
    let blob = await aBlob(lienzo, 'image/webp', q)
    // Safari viejo ignora el WebP y devuelve PNG, que pesa una barbaridad.
    if (!blob || blob.type !== 'image/webp') blob = await aBlob(lienzo, 'image/jpeg', q)
    if (!blob) throw new Error('No se pudo comprimir la imagen.')
    if (blob.size <= TOPE_BYTES) return blob
    q -= 0.1
  }
  throw new Error('La foto quedó demasiado pesada. Probá con otra.')
}

export type FotoComprimida = { grande: Blob; mini: Blob; extension: 'webp' | 'jpg' }

export async function comprimir(archivo: File): Promise<FotoComprimida> {
  const img = await cargarImagen(archivo)
  const grande = await reducir(img, GRANDE.lado, GRANDE.calidad)
  const mini = await reducir(img, MINI.lado, MINI.calidad)
  return { grande, mini, extension: grande.type === 'image/webp' ? 'webp' : 'jpg' }
}

/** Comprime y sube una foto. Devuelve la ruta a guardar en `stock.photos`. */
export async function subirFoto(
  supabase: SupabaseClient,
  orgId: string,
  stockId: string | number,
  archivo: File,
): Promise<string> {
  const { grande, mini, extension } = await comprimir(archivo)
  const ruta = `${orgId}/${stockId}/${crypto.randomUUID()}.${extension}`
  // El nombre nunca se reusa, así que se puede cachear para siempre.
  const opciones = { cacheControl: '31536000', upsert: false }

  const a = await supabase.storage.from(BUCKET_FOTOS).upload(ruta, grande, { ...opciones, contentType: grande.type })
  if (a.error) throw a.error
  const b = await supabase.storage.from(BUCKET_FOTOS).upload(rutaMiniatura(ruta), mini, { ...opciones, contentType: mini.type })
  if (b.error) {
    await supabase.storage.from(BUCKET_FOTOS).remove([ruta])
    throw b.error
  }
  return ruta
}

/** Borra los archivos (grande y miniatura). No toca la tabla. */
export async function borrarFotos(supabase: SupabaseClient, rutas: string[]): Promise<void> {
  if (rutas.length === 0) return
  const todas = rutas.flatMap(r => [r, rutaMiniatura(r)])
  const { error } = await supabase.storage.from(BUCKET_FOTOS).remove(todas)
  if (error) throw error
}
