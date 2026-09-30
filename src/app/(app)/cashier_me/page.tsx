import { redirect } from 'next/navigation'
import { createClient, getUser, getProfile } from '@/utils/supabase/server'
import { configuracionDelLocal } from '@/utils/configuracion'
import { MiCajaClient } from './MiCajaClient'

export const dynamic = 'force-dynamic'

/**
 * Mi caja: el turno del vendedor y su cierre.
 *
 * El dueño tiene Cajas, con todo el negocio. Antes esta dirección lo
 * mandaba ahí también al vendedor, que rebotaba a Vender: el vendedor no
 * tenía dónde cerrar su turno.
 *
 * Con el cierre a ciegas, al navegador del vendedor no se le mandan los
 * pagos de sus ventas, sólo cuántas hizo: lo esperado no está en la página
 * ni en sus datos. Lo calcula el dueño al mirar el cierre.
 */
function haceHoras(horas: number): string {
  return new Date(Date.now() - horas * 3600 * 1000).toISOString()
}

export default async function MiCajaPage() {
  const user = await getUser()
  if (!user) redirect('/login')
  const profile = await getProfile(user.id)
  if (user.email === 'asciacontacto@gmail.com' || profile?.role === 'owner') redirect('/cashiers')

  const supabase = await createClient()
  // Sin la migración la columna no existe: vuelve con error y el cierre es el de siempre.
  const { data: settings } = await configuracionDelLocal(supabase, profile?.org_id, 'cierre_a_ciegas')
  const ciegas = Boolean(settings?.cierre_a_ciegas)

  // Las últimas 48 horas alcanzan para cualquier turno; el cliente recorta
  // desde el último cierre o el comienzo del día.
  const desde = haceHoras(48)
  const [{ data: ventas }, cierres] = await Promise.all([
    supabase.from('sales')
      .select(ciegas ? 'id,created_at,brand' : 'id,created_at,brand,payments')
      .eq('seller_id', user.id)
      .gte('created_at', desde)
      .order('created_at', { ascending: false }),
    supabase.from('cash_closures')
      .select('id,created_at,user_id,desde,declared_ars,declared_usd')
      .eq('user_id', user.id)
      .gte('created_at', desde)
      .order('created_at', { ascending: false }),
  ])

  return (
    <MiCajaClient
      user={{ id: user.id, name: profile?.name || user.email || 'Vendedor', depositId: profile?.deposit_ids?.[0] ?? null }}
      ventas={(ventas || []) as never[]}
      cierres={(cierres.data || []) as never[]}
      hayCierres={!cierres.error}
      ciegas={ciegas}
    />
  )
}
