import { createClient } from "@/utils/supabase/server"
import { UsersClient } from "./UsersClient"

export default async function UsersPage() {
  const supabase = await createClient()

  const [{ data: usersData }, { data: depositsData }] = await Promise.all([
    supabase.from('profiles').select('*').order('name'),
    supabase.from('deposits').select('*').order('name'),
  ])

  return <UsersClient initialUsers={usersData || []} deposits={depositsData || []} />
}
