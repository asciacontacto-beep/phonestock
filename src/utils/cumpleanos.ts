/**
 * Cumpleaños de los clientes: avisar cuando se acerca y saludar con un
 * descuento.
 *
 * Se guarda día y mes (sin año: mucha gente no lo da y no hace falta).
 */

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function cumpleValido(dia: unknown, mes: unknown): { dia: number; mes: number } | null {
  const d = Math.floor(Number(dia)), m = Math.floor(Number(mes))
  if (!(m >= 1 && m <= 12)) return null
  const tope = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]
  return d >= 1 && d <= tope ? { dia: d, mes: m } : null
}

/** "14 de marzo" */
export function textoCumple(dia: number, mes: number): string {
  return `${dia} de ${MESES[mes - 1]}`
}

const esBisiesto = (a: number) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0

/** Días hasta el próximo cumpleaños (0 = hoy). El 29/2 se festeja el 28/2 en años no bisiestos. */
export function diasHastaCumple(dia: number, mes: number, hoy: Date): number {
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const fecha = (anio: number) => {
    const d = mes === 2 && dia === 29 && !esBisiesto(anio) ? 28 : dia
    return new Date(anio, mes - 1, d)
  }
  let prox = fecha(base.getFullYear())
  if (prox < base) prox = fecha(base.getFullYear() + 1)
  return Math.round((prox.getTime() - base.getTime()) / 86_400_000)
}

export type ClienteConCumple = { id: string | number; name: string; phone?: string | null; birth_day?: number | null; birth_month?: number | null }

/** Los que cumplen dentro de `dias` días (hoy incluido), el más cercano primero. */
export function proximosCumples<T extends ClienteConCumple>(clientes: T[], hoy: Date, dias = 7): (T & { faltan: number })[] {
  return clientes
    .filter(c => cumpleValido(c.birth_day, c.birth_month))
    .map(c => ({ ...c, faltan: diasHastaCumple(Number(c.birth_day), Number(c.birth_month), hoy) }))
    .filter(c => c.faltan <= dias)
    .sort((a, b) => a.faltan - b.faltan || a.name.localeCompare(b.name))
}

export function cuandoCumple(faltan: number): string {
  return faltan === 0 ? 'hoy' : faltan === 1 ? 'mañana' : `en ${faltan} días`
}

/** Mensaje de saludo con el descuento. */
export function mensajeCumple(nombre: string, negocio: string, descuento: number, faltan: number): string {
  const primerNombre = (nombre || '').trim().split(/\s+/)[0] || ''
  const saludo = faltan === 0 ? `¡Feliz cumpleaños${primerNombre ? `, ${primerNombre}` : ''}! 🎉` : `¡Hola${primerNombre ? ` ${primerNombre}` : ''}! Se viene tu cumple 🎉`
  const regalo = descuento > 0
    ? ` Para festejarlo, en ${negocio || 'el local'} tenés un ${descuento}% de descuento en tu próxima compra.`
    : ` Te mandamos un saludo grande desde ${negocio || 'el local'}.`
  return `${saludo}${regalo}`
}

/**
 * Teléfono argentino para wa.me: 549 + característica + número, sin 0 ni 15.
 * null si no se puede armar con seguridad (el link se abre sin número).
 */
export function telefonoWhatsApp(raw: string | null | undefined): string | null {
  let d = String(raw || '').replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('54')) d = d.slice(2)
  if (d.startsWith('9') && d.length === 11) d = d.slice(1)
  if (d.startsWith('0')) d = d.slice(1)
  // Característica + 15 + número (ej. 2262 15 559559): se saca el 15.
  if (d.length === 12) {
    for (const largo of [2, 3, 4]) {
      if (d.slice(largo, largo + 2) === '15') { d = d.slice(0, largo) + d.slice(largo + 2); break }
    }
  }
  return d.length === 10 ? `549${d}` : null
}

export function linkWhatsApp(telefono: string | null | undefined, texto: string): string {
  const t = telefonoWhatsApp(telefono)
  return `https://wa.me/${t || ''}?text=${encodeURIComponent(texto)}`
}
