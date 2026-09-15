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

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Nombre de relleno que llevan las ventas sin cliente identificado. Se
 * guarda para que el comprobante impreso diga algo, pero NO representa a
 * una persona: si alguien crea una ficha con ese nombre, no debe quedarse
 * con todas las ventas anónimas del local.
 */
export const CLIENTE_ANONIMO = 'Consumidor Final'

/** ¿La venta tiene un cliente identificable, o fue mostrador? */
export function ventaTieneCliente(saleCustomer: any): boolean {
  const dni = (saleCustomer?.dni || '').trim()
  if (dni) return true
  const name = (saleCustomer?.name || '').trim()
  return Boolean(name) && name.toLowerCase() !== CLIENTE_ANONIMO.toLowerCase()
}

/**
 * ¿Esta venta es de este cliente?
 *
 * El DNI manda cuando la ficha lo tiene. Sin DNI sólo queda el nombre, con
 * el riesgo de homónimos que eso implica — pero al menos las ventas de
 * mostrador dejan de atribuirse a nadie.
 */
export function ventaEsDe(
  saleCustomer: any,
  c: { dni?: string | null; name?: string | null },
): boolean {
  if (!ventaTieneCliente(saleCustomer)) return false

  const fichaDni = (c.dni || '').trim()
  if (fichaDni) return (saleCustomer?.dni || '').trim() === fichaDni

  const nombreVenta = (saleCustomer?.name || '').trim().toLowerCase()
  const nombreFicha = (c.name || '').trim().toLowerCase()
  return Boolean(nombreFicha) && nombreVenta === nombreFicha
}

export type CustomerInput = {
  name: string
  dni?: string
  phone?: string
  email?: string
  instagram?: string
}

/** Devuelve el id del cliente, creándolo o actualizándolo según corresponda. */
export async function upsertCustomer(supabase: SupabaseClient, cust: CustomerInput): Promise<string | null> {
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
