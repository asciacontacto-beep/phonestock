import { createClient, getUser } from "@/utils/supabase/server"
import { StockClient } from "./StockClient"

export default async function StockPage() {
  const supabase = await createClient()

  // 1. Obtener la sesión actual para saber de qué organización es el stock
  const user = await getUser()

  // 2. Fetch directo en el servidor (Súper Rápido, no expone credenciales al cliente)
  const [
    { data: stockData },
    { data: depositsData }
  ] = await Promise.all([
    supabase
      .from('stock')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('deposits')
      .select('*')
      .order('name')
  ])

  return (
    <StockClient 
      initialStock={stockData || []} 
      deposits={depositsData || []} 
    />
  )
}
