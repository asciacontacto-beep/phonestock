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

/**
 * Devuelve el DNI sólo si de verdad identifica a alguien.
 *
 * El campo es libre y se llena con rellenos: "-", ".", "0", "s/n". El código
 * los tomaba como documento válido, con una consecuencia fea: la primera
 * venta creaba una ficha con DNI "-", y cada venta siguiente con el mismo
 * relleno ENCONTRABA esa ficha y le pisaba el nombre. Cuatro clientes
 * distintos terminaban siendo una sola ficha, con el nombre del último y
 * las cuatro compras encima.
 *
 * Un DNI argentino tiene 7 u 8 dígitos y un pasaporte al menos 6
 * caracteres; menos que eso no alcanza para afirmar que dos ventas son de
 * la misma persona.
 */
export function dniIdentificable(dni?: string | null): string {
  const limpio = (dni || '').replace(/[^0-9A-Za-z]/g, '')
  return limpio.length >= 6 ? limpio : ''
}

/** ¿La venta tiene un cliente identificable, o fue mostrador? */
export function ventaTieneCliente(saleCustomer: any): boolean {
  if (dniIdentificable(saleCustomer?.dni)) return true
  const name = (saleCustomer?.name || '').trim()
  return Boolean(name) && name.toLowerCase() !== CLIENTE_ANONIMO.toLowerCase()
}

/**
 * ¿Esta venta es de este cliente?
 *
 * El documento decide SÓLO cuando los dos lados lo tienen. La mayoría de los
 * locales no piden DNI, y exigirlo rompía un caso normal: si a un cliente le
 * tomaron el documento una vez y después le vendieron sin pedírselo, esa
 * segunda venta quedaba sin dueño — la ficha tenía DNI, la venta no.
 *
 * Cuando los dos lo tienen, manda: es lo único que separa a dos homónimos de
 * verdad. Si falta de un lado, se empareja por nombre.
 */
export function ventaEsDe(
  saleCustomer: any,
  c: { dni?: string | null; name?: string | null },
): boolean {
  if (!ventaTieneCliente(saleCustomer)) return false

  // Normalizados de los dos lados: "30.111.222" y "30111222" son la misma
  // persona, y un "-" no empareja con nada.
  const dniVenta = dniIdentificable(saleCustomer?.dni)
  const dniFicha = dniIdentificable(c.dni)
  if (dniVenta && dniFicha) return dniVenta === dniFicha

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

  const dniCrudo = (cust.dni || '').trim()
  // Sólo se usa como identificador si realmente lo es: ver dniIdentificable.
  const dni = dniIdentificable(dniCrudo) ? dniCrudo : ''
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
