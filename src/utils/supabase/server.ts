import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { supabaseEnv, supabaseStorageKey } from './env'

export const createClient = cache(async () => {
  const cookieStore = await cookies()
  const { url, anonKey } = supabaseEnv()

  return createServerClient(
    url,
    anonKey,
    {
      // Fija, para coincidir con el navegador, que ve otro host por el proxy.
      auth: { storageKey: supabaseStorageKey() },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
})

export const getUser = cache(async () => {
  const supabase = await createClient()
  // getUser() valida el JWT contra el servidor de auth de Supabase.
  // getSession() sólo lee la cookie sin verificarla: no usar en el servidor.
  const { data: { user } } = await supabase.auth.getUser()
  return user || null
})

export const getProfile = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return profile
})
