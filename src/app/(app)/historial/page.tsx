import { redirect } from "next/navigation"
import { getUser } from "@/utils/supabase/server"
import { esDueno } from "@/utils/permisos"
import { HistorialClient } from "./HistorialClient"

export const dynamic = 'force-dynamic'

// Dueño y vendedor: el vendedor lo usa para ver si un equipo que vuelve está
// en garantía. Sin costos para el vendedor (ver HistorialClient).
export default async function HistorialPage({ searchParams }: { searchParams: Promise<{ imei?: string }> }) {
  const user = await getUser()
  if (!user) redirect('/login')
  const [isOwner, params] = await Promise.all([esDueno(), searchParams])
  return <HistorialClient isOwner={isOwner} imeiInicial={params.imei || ''} />
}
