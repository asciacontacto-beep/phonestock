/**
 * Guardar el cliente de una venta o reparación sin generar duplicados.
 *
 * Antes cada pantalla buscaba con `.eq('name', ...).single()`. `single()`
 * devuelve null cuando hay MÁS de una fila, no sólo cuando no hay ninguna:
 * al segundo homónimo el sistema dejaba de encontrar al cliente y creaba uno
 * nuevo cada vez, acumulando "Juan Pérez" repetidos.
 *
 * Ahora se busca primero por DNI (que identifica de verdad) y recién después
 * por nombre, tomando el más reciente en lugar de fallar ante un empate.
 */

export type CustomerInput = {
  name: string
  dni?: string
  phone?: string
  email?: string
  instagram?: string
}

/** Devuelve el id del cliente, creándolo o actualizándolo según corresponda. */
export async function upsertCustomer(supabase: any, cust: CustomerInput): Promise<string | null> {
  const name = (cust.name || '').trim()
  if (!name) return null

  const dni = (cust.dni || '').trim()
  let existing: { id: string } | null = null

  if (dni) {
    const { data } = await supabase.from('customers').select('id').eq('dni', dni).limit(1).maybeSingle()
    existing = data || null
  }

  if (!existing) {
    // Sin DNI sólo queda el nombre. Se toma el más recientemente usado para
    // que, si ya hay homónimos, al menos no se siga sumando uno nuevo.
    const { data } = await supabase
      .from('customers')
      .select('id')
      .ilike('name', name)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    existing = data || null
  }

  const payload: Record<string, any> = {
    name,
    phone: cust.phone?.trim() || null,
    email: cust.email?.trim() || null,
    instagram: cust.instagram?.trim() || null,
    updated_at: new Date().toISOString(),
  }
  if (dni) payload.dni = dni

  if (existing) {
    await supabase.from('customers').update(payload).eq('id', existing.id)
    return existing.id
  }

  const { data: created, error } = await supabase.from('customers').insert([payload]).select('id').single()
  if (error) throw error
  return created?.id || null
}
