import { getUser } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { ErroresClient } from "./ErroresClient"

export const dynamic = 'force-dynamic'

export default async function ErroresPage() {
  const user = await getUser()
  if (user?.email !== 'asciacontacto@gmail.com') redirect('/dashboard')
  return <ErroresClient />
}
