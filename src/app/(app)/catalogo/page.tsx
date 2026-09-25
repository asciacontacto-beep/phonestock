import { createClient, getUser, getProfile } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { CatalogoAdminClient } from "./CatalogoAdminClient"
import { configuracionDelLocal } from '@/utils/configuracion'
import type { EquipoStock } from "@/utils/catalogo"

export const dynamic = 'force-dynamic'

export default async function CatalogoPage() {
  const user = await getUser()
  if (!user) redirect("/login")

  const profile = await getProfile(user.id)
  const supabase = await createClient()

  const [{ data: org }, { data: stock }, { data: settings }] = await Promise.all([
    profile?.org_id
      ? supabase.from('organizations').select('id,name,catalog_slug,catalog_enabled').eq('id', profile.org_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('stock')
      .select('id,brand,model,storage,color,condition,battery,price,currency,status,in_catalog,photos')
      .eq('status', 'available')
      .order('created_at', { ascending: false }),
    configuracionDelLocal(supabase, profile?.org_id, 'shop_name'),
  ])

  return (
    <CatalogoAdminClient
      org={org || null}
      stockInicial={(stock || []) as unknown as EquipoStock[]}
      nombreLocal={settings?.shop_name || org?.name || ''}
    />
  )
}
