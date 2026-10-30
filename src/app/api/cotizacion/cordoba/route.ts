import { NextResponse } from 'next/server'
import { leerBlueCordoba } from '@/utils/cotizacion'

/**
 * Dólar blue en Córdoba (infodolar.com, punta venta). Lo pide el servidor:
 * la página no se puede leer desde el navegador y no tiene API. Se guarda
 * 5 minutos para no pedirla en cada venta.
 */
const PAGINA = 'https://www.infodolar.com/cotizacion-dolar-provincia-cordoba.aspx'

export async function GET() {
  try {
    const r = await fetch(PAGINA, { next: { revalidate: 300 } })
    if (!r.ok) return NextResponse.json({ error: `infodolar respondió ${r.status}` }, { status: 502 })
    const blue = leerBlueCordoba(await r.text())
    if (!blue) return NextResponse.json({ error: 'No se encontró el blue de Córdoba en infodolar' }, { status: 502 })
    return NextResponse.json({ ...blue, fuente: 'infodolar' }, { headers: { 'Cache-Control': 'private, max-age=60' } })
  } catch {
    return NextResponse.json({ error: 'No se pudo leer infodolar' }, { status: 502 })
  }
}
