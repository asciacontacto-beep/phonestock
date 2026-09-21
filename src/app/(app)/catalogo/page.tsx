import { createClient, getUser, getProfile } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { CatalogoAdminClient } from "./CatalogoAdminClient"
import type { EquipoStock } from "@/utils/catalogo"

export const dynamic = 'force-dynamic'

export default async function CatalogoPage() {
  const user = await getUser()
  if (!user) redirect("/login")

  const profile = await getProfile(user.id)
  const supabase = await createClient()

  const COLS = 'id,brand,model,storage,color,condition,battery,price,currency,status,in_catalog'
  const traerStock = (cols: string) => supabase.from('stock')
    .select(cols)
    .eq('status', 'available')
    .order('created_at', { ascending: false })

  const [{ data: org }, primero, { data: settings }] = await Promise.all([
    profile?.org_id
      ? supabase.from('organizations').select('id,name,catalog_slug,catalog_enabled').eq('id', profile.org_id).maybeSingle()
      : Promise.resolve({ data: null }),
    traerStock(`${COLS},photos`),
    supabase.from('settings').select('shop_name').maybeSingle(),
  ])
  // Sin la migración de fotos corrida, la columna no existe: se muestra la
  // lista igual, sin fotos, en vez de una pantalla vacía.
  const { data: stock } = primero.error ? await traerStock(COLS) : primero

  return (
    <CatalogoAdminClient
      org={org || null}
      stockInicial={(stock || []) as unknown as EquipoStock[]}
      nombreLocal={settings?.shop_name || org?.name || ''}
    />
  )
}
