"use server"

import { createClient } from "@supabase/supabase-js"

/**
 * Confirma el email de una cuenta que no se confirmó, para que pueda entrar.
 *
 * Antes alcanzaba con mandar un email: cualquiera, sin sesión, podía
 * confirmar cualquier cuenta (registrarse con un email ajeno y activarlo) y
 * averiguar qué emails estaban registrados. Ahora hay que probar la
 * contraseña: el servidor intenta el ingreso y sólo sigue si Supabase
 * contesta "email no confirmado", que lo dice recién después de validar la
 * contraseña. Con contraseña equivocada, la respuesta es la misma que en un
 * ingreso fallido: no dice si el email existe.
 */
export async function confirmUserEmail(email: string, password: string) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!serviceRoleKey || !supabaseUrl || !anonKey) {
    return { error: "Server misconfigured" }
  }
  const limpio = String(email || "").trim().toLowerCase()
  if (!limpio || !password) return { error: "Email o contraseña incorrectos." }

  const anon = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  const { error: loginErr } = await anon.auth.signInWithPassword({ email: limpio, password })
  if (!loginErr) return { success: true, alreadyConfirmed: true }
  if (!loginErr.message.toLowerCase().includes("email not confirmed")) {
    return { error: "Email o contraseña incorrectos." }
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // listUsers pagina: con más de una página, la cuenta buscada puede no
  // estar en la primera.
  for (let page = 1; page <= 50; page++) {
    const { data, error: listErr } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
    if (listErr) return { error: "No se pudo confirmar la cuenta." }
    const user = data.users.find(u => u.email?.toLowerCase() === limpio)
    if (user) {
      if (user.email_confirmed_at) return { success: true, alreadyConfirmed: true }
      const { error: updateErr } = await adminClient.auth.admin.updateUserById(user.id, { email_confirm: true })
      if (updateErr) return { error: "No se pudo confirmar la cuenta." }
      return { success: true }
    }
    if (data.users.length < 1000) break
  }
  return { error: "No se pudo confirmar la cuenta." }
}
