import { getUser } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { AgendaClient } from "./AgendaClient"

export const dynamic = 'force-dynamic'

export default async function AgendaPage() {
  const user = await getUser()
  if (user?.email !== 'asciacontacto@gmail.com') redirect('/dashboard')
  return <AgendaClient />
}
