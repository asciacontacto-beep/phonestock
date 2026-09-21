import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { supabaseEnv } from '@/utils/supabase/env'
import { CatalogoClient, type EquipoVidriera } from './CatalogoClient'

export const dynamic = 'force-dynamic'

/**
 * El catálogo público de un local.
 *
 * Esta página NO tiene sesión: la abre cualquiera desde Instagram o desde un
 * mensaje. Por eso usa un cliente anónimo y lee sólo las dos vistas
 * preparadas para esto, que exponen una lista corta de columnas. El costo,
 * el proveedor y el IMEI no llegan hasta acá: no salen de la base.
 */
function clienteAnonimo() {
  const { url, anonKey } = supabaseEnv()
  return createClient(url, anonKey, { auth: { persistSession: false } })
}

async function traerTienda(slug: string) {
  const { data } = await clienteAnonimo()
    .from('catalogo_tienda')
    .select('slug,nombre,telefono,instagram,direccion')
    .eq('slug', slug)
    .maybeSingle()
  return data
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const tienda = await traerTienda(slug)
  if (!tienda) return { title: 'Catálogo no encontrado' }

  /* El título es el del LOCAL, no el nuestro: el link se comparte como la
     vidriera de esa tienda. */
  const titulo = `${tienda.nombre} · Equipos disponibles`
  return {
    title: titulo,
    description: `Mirá los equipos disponibles en ${tienda.nombre} y consultá por WhatsApp.`,
    openGraph: { title: titulo, description: `Equipos disponibles en ${tienda.nombre}.` },
    robots: { index: true, follow: true },
  }
}

export default async function CatalogoPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const sb = clienteAnonimo()

  const COLS = 'id,brand,model,storage,color,condition,battery,price,currency,created_at'
  const traerEquipos = (cols: string) => sb.from('catalogo_equipos')
    .select(cols)
    .eq('slug', slug)
    .order('created_at', { ascending: false })

  const [tienda, primero] = await Promise.all([
    traerTienda(slug),
    traerEquipos(`${COLS},fotos`),
  ])
  // Si la vista todavía no tiene fotos (migración sin correr), la vidriera
  // sale igual, sin fotos.
  const { data: equipos } = primero.error ? await traerEquipos(COLS) : primero

  /* Sin tienda, 404 de verdad. Un catálogo apagado no debe decir "existe
     pero está apagado": eso confirma que el local usa el sistema. */
  if (!tienda) notFound()

  return <CatalogoClient tienda={tienda} equipos={(equipos || []) as unknown as EquipoVidriera[]} />
}
