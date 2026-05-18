import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { SuperAdminClient } from "./SuperAdminClient"

export default async function SuperAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user?.email !== 'asciacontacto@gmail.com') {
    redirect('/dashboard')
  }

  return <SuperAdminClient />
}
