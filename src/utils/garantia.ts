/**
 * El texto de garantía del comprobante.
 *
 * Cada venta guarda sus días de garantía (`warranty_days`, se eligen al
 * vender; por defecto los del local, Ajustes → Negocio). El comprobante
 * imprimía otra cosa: el texto fijo del diseño del recibo ("90 días por
 * fallas de fábrica") o las notas de la venta. Un local con 45 días de
 * garantía entregaba tickets que decían 90.
 *
 * Ahora el número sale de la venta y el resto del texto del recibo se
 * respeta: "90 días por fallas de fábrica" con 45 días → "45 días por
 * fallas de fábrica".
 */

const DIAS_AL_PRINCIPIO = /^\s*\d+\s*d[ií]as?\b/i

export function textoGarantia(dias: number | null | undefined, textoDelRecibo?: string | null): string {
  const texto = String(textoDelRecibo || '').trim()
  if (dias === null || dias === undefined || !Number.isFinite(Number(dias))) return texto
  const n = Math.max(0, Math.round(Number(dias)))
  if (n === 0) return 'Sin garantía'
  const plazo = n === 1 ? '1 día' : `${n} días`
  if (!texto) return plazo
  if (DIAS_AL_PRINCIPIO.test(texto)) return texto.replace(DIAS_AL_PRINCIPIO, plazo)
  return `${plazo} · ${texto}`
}

/** Qué decir de una venta: sus días si los tiene; si no (ventas viejas), sus notas o el texto del recibo. */
export function garantiaDeLaVenta(
  venta: { warranty_days?: number | null; notes?: string | null },
  textoDelRecibo?: string | null,
  diasDelLocal?: number | null,
): string {
  if (venta.warranty_days !== null && venta.warranty_days !== undefined) return textoGarantia(venta.warranty_days, textoDelRecibo)
  // Antes de que existieran los días por venta, la garantía se escribía en las notas.
  const notas = String(venta.notes || '').trim()
  if (notas) return notas
  return diasDelLocal !== null && diasDelLocal !== undefined ? textoGarantia(diasDelLocal, textoDelRecibo) : String(textoDelRecibo || '')
}

/** Las opciones del selector de garantía, con la del local siempre incluida. */
export function opcionesDeGarantia(diasDelLocal: number, actual?: number | null): number[] {
  const base = [0, 15, 30, 45, 60, 90, 180, 365, diasDelLocal]
  if (actual !== null && actual !== undefined && Number.isFinite(actual)) base.push(actual)
  return [...new Set(base.map(d => Math.max(0, Math.round(d))))].sort((a, b) => a - b)
}

export function nombreGarantia(dias: number): string {
  return dias === 0 ? 'Sin garantía' : dias === 365 ? '1 año' : dias === 1 ? '1 día' : `${dias} días`
}
