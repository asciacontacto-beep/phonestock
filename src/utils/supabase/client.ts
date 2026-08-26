import { createBrowserClient } from '@supabase/ssr'
import { supabaseEnv, supabaseBrowserUrl, supabaseStorageKey } from './env'

export function createClient() {
  const { anonKey } = supabaseEnv()
  // Mismo origen (ver env.ts): Safari bloquea las peticiones entre sitios.
  return createBrowserClient(supabaseBrowserUrl(), anonKey, {
    auth: { storageKey: supabaseStorageKey() },
  })
}
