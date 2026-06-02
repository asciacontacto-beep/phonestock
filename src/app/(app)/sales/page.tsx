import { createClient } from '@/utils/supabase/server'
import { SalesClient } from './SalesClient'

export default async function SalesPage() {
  const supabase = await createClient()

  // Fetch all necessary data
  const { data: { session } } = await supabase.auth.getSession()
  
  const [
    { data: sales },
    { data: deposits },
    { data: realSellers },
    { data: currentUserProfile }
  ] = await Promise.all([
    supabase.from('sales').select('*').order('created_at', { ascending: false }),
    supabase.from('deposits').select('*').order('name'),
    supabase.from('profiles').select('*').eq('role', 'seller'),
    supabase.from('profiles').select('*').eq('id', session?.user?.id).single()
  ])

  return (
    <SalesClient 
      sales={sales || []} 
      deposits={deposits || []} 
      realSellers={realSellers || []} 
      user={currentUserProfile || { id: session?.user?.id }} 
    />
  )
}
