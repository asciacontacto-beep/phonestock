import { getUser } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { StockClient } from "./StockClient"

export default async function StockPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  // Data (stock, deposits) is fetched client-side for instant navigation
  return <StockClient />
}
