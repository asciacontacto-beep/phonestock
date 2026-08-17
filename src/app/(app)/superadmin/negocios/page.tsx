import { getUser } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { NegociosClient } from "./NegociosClient"

export const dynamic = 'force-dynamic'

export default async function NegociosPage() {
  const user = await getUser()
  if (user?.email !== 'asciacontacto@gmail.com') redirect('/dashboard')
  return <NegociosClient />
}
