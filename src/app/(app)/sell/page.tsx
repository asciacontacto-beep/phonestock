import { createClient, getUser, getProfile } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { SellClient } from "./SellClient"

export const dynamic = 'force-dynamic'

export default async function SellPage() {
  const user = await getUser()
  if (!user) redirect("/login")
  
  const isSuperAdmin = user.email === 'asciacontacto@gmail.com'
  const profile = await getProfile(user.id)
  const isOwner = isSuperAdmin || profile?.role === 'owner'

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <SellClient isOwner={isOwner} assignedDeposits={profile?.deposit_ids || []} sellerName={profile?.name || null} />
    </Suspense>
  )
}
