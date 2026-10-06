import { createClient, getUser, getProfile } from "@/utils/supabase/server"
import { CashiersClient } from "./CashiersClient"
import { soloDueno } from "@/utils/permisos"
import { traerTodo } from '@/utils/supabase/todo'

export const dynamic = 'force-dynamic'

export default async function CashiersPage() {
  await soloDueno()
  const supabase = await createClient()

  const user = await getUser()
  const profileData = user ? await getProfile(user.id) : null
  const orgId = profileData?.org_id

  // Filtrado por negocio acá además de en la base: ver sales/page.tsx.
  const vendedores = orgId
    ? supabase.from('profiles').select('*').eq('role', 'seller').eq('org_id', orgId)
    : Promise.resolve({ data: [] as any[] })

  const [
    { data: salesData },
    { data: realSellersData },
    { data: depositsData },
    { data: transfersData },
    { data: movementsData },
    cuentasRes,
    { data: cierresData },
  ] = await Promise.all([
    traerTodo(() => supabase.from('sales').select('*').order('created_at', { ascending: false }).order('id')),
    vendedores,
    supabase.from('deposits').select('*').order('name'),
    traerTodo(() => supabase.from('cash_transfers').select('*').order('created_at', { ascending: false }).order('id')),
    traerTodo(() => supabase.from('cash_movements').select('*').order('created_at', { ascending: false }).order('id')),
    // Sin la migración de cuentas estas dos tablas no existen: vuelven con
    // error y se muestran vacías.
    supabase.from('accounts').select('id,name,kind,currency,active').order('name'),
    supabase.from('cash_closures').select('*').order('created_at', { ascending: false }).limit(30),
  ])

  const isSuperAdmin = user?.email === 'asciacontacto@gmail.com'
  const mergedUser = {
    ...profileData,
    id: user?.id,
    email: user?.email,
    name: profileData?.name || (isSuperAdmin ? 'Administrador' : user?.email),
    role: isSuperAdmin ? 'owner' : (profileData?.role || 'seller'),
    initials: profileData?.initials || (isSuperAdmin ? 'AD' : 'U'),
    color: profileData?.color || (isSuperAdmin ? '#f59e0b' : '#ccc'),
    deposit_ids: profileData?.deposit_ids || [],
  }

  return (
    <CashiersClient
      sales={salesData || []}
      user={mergedUser}
      realSellers={realSellersData || []}
      deposits={depositsData || []}
      transfers={transfersData || []}
      movements={movementsData || []}
      cuentas={cuentasRes.error ? [] : (cuentasRes.data || [])}
      cierres={cierresData || []}
    />
  )
}
