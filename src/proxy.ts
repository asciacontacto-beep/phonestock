import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // `sb/` queda afuera a propósito: es el desvío hacia Supabase (ver
    // next.config.ts). Si pasara por acá, la petición de login no traería
    // sesión todavía y terminaría redirigida al login: nadie podría entrar.
    // `api/v1/` también: la API se autentica con su propia clave y nunca trae
    // sesión, así que el middleware la mandaría al login en cada pedido.
    '/((?!sb/|api/v1|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
