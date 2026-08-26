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
    '/((?!sb/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
