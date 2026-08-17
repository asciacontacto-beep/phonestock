import { getUser } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { SeguimientoClient } from "./SeguimientoClient"

export const dynamic = 'force-dynamic'

export default async function SeguimientoPage() {
  const user = await getUser()
  if (user?.email !== 'asciacontacto@gmail.com') redirect('/dashboard')
  return <SeguimientoClient />
}
