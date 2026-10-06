import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Recibe los errores que ve la app en el navegador y los guarda en
 * `app_errors` (ver supabase/migrations/20261006_registro_de_errores.sql).
 *
 * Acepta pedidos sin sesión: los errores del ingreso (por ejemplo en un
 * Safari viejo) son de los más valiosos. Por eso se recorta todo, se limita
 * cuántos llegan por IP y nunca se devuelve nada que sirva para otra cosa.
 * Nunca falla hacia el navegador: si no se puede guardar, queda en los logs
 * del servidor (Vercel) y listo.
 */

const MAX_POR_MINUTO = 30
const porIp = new Map<string, { n: number; desde: number }>()

function demasiados(ip: string): boolean {
  const ahora = Date.now()
  const r = porIp.get(ip)
  if (!r || ahora - r.desde > 60_000) { porIp.set(ip, { n: 1, desde: ahora }); return false }
  r.n++
  if (porIp.size > 5000) porIp.clear()
  return r.n > MAX_POR_MINUTO
}

const corto = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : null)
const TIPOS = new Set(['error', 'promesa', 'pantalla', 'consulta'])

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (demasiados(ip)) return new NextResponse(null, { status: 204 })

  let cuerpo: Record<string, unknown>
  try {
    const texto = await req.text()
    if (texto.length > 20_000) return new NextResponse(null, { status: 204 })
    cuerpo = JSON.parse(texto)
  } catch {
    return new NextResponse(null, { status: 204 })
  }

  const mensaje = corto(cuerpo.message, 1000)
  if (!mensaje) return new NextResponse(null, { status: 204 })

  const fila: Record<string, unknown> = {
    kind: TIPOS.has(String(cuerpo.kind)) ? String(cuerpo.kind) : 'error',
    message: mensaje,
    stack: corto(cuerpo.stack, 4000),
    path: corto(cuerpo.path, 300),
    user_agent: corto(req.headers.get('user-agent'), 400),
    release: corto(cuerpo.release, 40),
  }

  try {
    // Quién lo vio: se toma de la sesión, no de lo que mande el navegador.
    const cookieStore = await cookies()
    const sesion = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
    )
    const { data: { user } } = await sesion.auth.getUser()

    const clave = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!clave) throw new Error('sin clave de servicio')
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, clave, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    if (user) {
      fila.user_id = user.id
      const { data: perfil } = await admin.from('profiles').select('org_id, role').eq('id', user.id).maybeSingle()
      fila.org_id = perfil?.org_id ?? null
      fila.role = perfil?.role ?? null
    }
    const { error } = await admin.from('app_errors').insert(fila)
    if (error) throw error
  } catch (e) {
    // Sin la tabla todavía (falta la migración) o sin base: al log.
    console.error('[app-error]', JSON.stringify({ ...fila, guardado: false, motivo: (e as { message?: string })?.message || String(e) }))
  }
  return new NextResponse(null, { status: 204 })
}
