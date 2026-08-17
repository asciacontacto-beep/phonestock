import { getUser } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { CobrosClient } from "./CobrosClient"

export const dynamic = 'force-dynamic'

export default async function CobrosPage() {
  const user = await getUser()
  if (user?.email !== 'asciacontacto@gmail.com') redirect('/dashboard')
  return <CobrosClient />
}
