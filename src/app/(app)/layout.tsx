import { getUser, getProfile } from "@/utils/supabase/server"
import { AppShell } from "@/components/AppShell"
import { redirect } from "next/navigation"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getProfile(user.id)

  return <AppShell user={user} profile={profile}>{children}</AppShell>
}
