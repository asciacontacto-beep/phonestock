import { createClient } from '@/utils/supabase/server'
import { SalesClient } from './SalesClient'

export const dynamic = 'force-dynamic'

export default async function SalesPage() {
  const supabase = await createClient()

  // Fetch all necessary data. getUser() valida el JWT (server-side).
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: sales },
    { data: deposits },
    { data: realSellers },
    { data: currentUserProfile },
    { data: settings }
  ] = await Promise.all([
    supabase.from('sales').select('*').order('created_at', { ascending: false }),
    supabase.from('deposits').select('*').order('name'),
    supabase.from('profiles').select('*').eq('role', 'seller'),
    supabase.from('profiles').select('*').eq('id', user?.id).single(),
    supabase.from('settings').select('*').single()
  ])

  return (
    <SalesClient 
      sales={sales || []} 
      deposits={deposits || []} 
      realSellers={realSellers || []} 
      user={currentUserProfile || { id: user?.id }}
      shop={settings || {}}
    />
  )
}
