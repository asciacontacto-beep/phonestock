import { NextResponse } from 'next/server'

/**
 * La versión publicada ahora mismo. La app abierta en una pestaña la compara
 * con la suya (ver components/AvisoVersionNueva.tsx): los locales dejan
 * Stackr abierto todo el día y no veían los cambios hasta recargar.
 */
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json(
    { version: process.env.NEXT_PUBLIC_BUILD_ID || '' },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
