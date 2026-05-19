import { createClient, getUser } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { SuperAdminClient } from "./SuperAdminClient"

export default async function SuperAdminPage() {
  const supabase = await createClient()
  const user = await getUser()

  if (user?.email !== 'asciacontacto@gmail.com') {
    redirect('/dashboard')
  }

  return <SuperAdminClient />
}
