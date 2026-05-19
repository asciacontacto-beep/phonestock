import { getUser, getProfile } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { SellClient } from "./SellClient"

export default async function SellPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const isSuperAdmin = user.email === 'asciacontacto@gmail.com'
  const profile = await getProfile(user.id)

  const mergedUser = {
    ...profile,
    id: user.id,
    email: user.email,
    name: profile?.name || (isSuperAdmin ? 'Administrador' : user.email),
  }

  // Pass user info — data (stock, deposits, settings) is fetched client-side
  return <SellClient user={mergedUser} />
}
