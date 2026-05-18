import { createClient } from "@/utils/supabase/server"
import { UsersClient } from "./UsersClient"

export default async function UsersPage() {
  const supabase = await createClient()

  const { data: usersData } = await supabase.from('profiles').select('*').order('name')

  return <UsersClient initialUsers={usersData || []} />
}
