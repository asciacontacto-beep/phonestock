import { createClient } from "@/utils/supabase/server"
import { ScanClient } from "./ScanClient"
import { esDueno } from "@/utils/permisos"

export const dynamic = 'force-dynamic'

export default async function ScanPage() {
  const supabase = await createClient()

  const [{ data: depositsData }, isOwner] = await Promise.all([
    supabase.from('deposits').select('*').order('name'),
    esDueno(),
  ])

  return <ScanClient initialDeposits={depositsData || []} isOwner={isOwner} />
}
