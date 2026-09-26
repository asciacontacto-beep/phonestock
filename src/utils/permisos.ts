import { redirect } from 'next/navigation'
import { getUser, getProfile } from '@/utils/supabase/server'

const SUPERADMIN = 'asciacontacto@gmail.com'

/**
 * Pantallas del dueño.
 *
 * El menú del vendedor no las muestra, pero se abrían igual escribiendo la
 * dirección: Historial de ventas, Clientes, Cajas… con costos y ganancias a
 * la vista. Un vendedor que entra acá vuelve a Vender.
 */
export async function soloDueno(): Promise<void> {
  const user = await getUser()
  if (!user) redirect('/login')
  if (user.email === SUPERADMIN) return
  const perfil = await getProfile(user.id)
  if (perfil?.role !== 'owner') redirect('/sell')
}
