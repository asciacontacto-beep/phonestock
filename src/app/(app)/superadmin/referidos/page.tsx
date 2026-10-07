import { getUser } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { ReferidosClient } from "./ReferidosClient"

export const dynamic = 'force-dynamic'

export default async function ReferidosPage() {
  const user = await getUser()
  if (user?.email !== 'asciacontacto@gmail.com') redirect('/dashboard')
  return <ReferidosClient />
}
