import { createClient } from "@/utils/supabase/server"
import { ScanClient } from "./ScanClient"

export const dynamic = 'force-dynamic'

export default async function ScanPage() {
  const supabase = await createClient()

  const { data: depositsData } = await supabase.from('deposits').select('*').order('name')

  return <ScanClient initialDeposits={depositsData || []} />
}
