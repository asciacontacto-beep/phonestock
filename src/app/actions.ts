"use server"

import { createClient } from "@supabase/supabase-js"

export async function confirmUserEmail(email: string) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceRoleKey || !supabaseUrl) {
    return { error: "Server misconfigured" }
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { data: { users }, error: listErr } = await adminClient.auth.admin.listUsers()
  if (listErr) return { error: listErr.message }

  const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) return { error: "Usuario no encontrado" }

  if (user.email_confirmed_at) return { success: true, alreadyConfirmed: true }

  const { error: updateErr } = await adminClient.auth.admin.updateUserById(user.id, {
    email_confirm: true
  })

  if (updateErr) return { error: updateErr.message }

  return { success: true }
}
