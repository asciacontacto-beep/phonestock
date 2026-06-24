import { createClient } from "@/utils/supabase/server"
import { UsersClient } from "./UsersClient"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  const orgId = currentUserProfile?.org_id

  // Filter profiles by the current user's org_id to ensure tenant isolation
  const query = supabase.from('profiles').select('*').order('name')
  
  if (orgId) {
    query.eq('org_id', orgId)
  }

  const [{ data: usersData }, { data: depositsData }] = await Promise.all([
    query,
    supabase.from('deposits').select('*').order('name'),
  ])

  return <UsersClient initialUsers={usersData || []} deposits={depositsData || []} currentOrgId={orgId} />
}
