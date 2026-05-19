import { getUser } from "@/utils/supabase/server"
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

  // Profile is fetched client-side in AppShell to avoid blocking every navigation
  return <AppShell user={user}>{children}</AppShell>
}
