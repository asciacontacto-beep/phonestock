import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { supabaseEnv } from '@/utils/supabase/env'
import { nombreEquipo } from '@/utils/catalogo'
import { urlFoto } from '@/utils/fotos'
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

const COLS = 'id,brand,model,storage,color,condition,battery,price,currency,created_at,fotos'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ e?: string | string[] }>
}

const idEquipo = (e: string | string[] | undefined) => {
  const v = Array.isArray(e) ? e[0] : e
  return v && /^[0-9a-f-]{1,40}$/i.test(v) ? v : null
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const id = idEquipo((await searchParams).e)
  const tienda = await traerTienda(slug)
  if (!tienda) return { title: 'Catálogo no encontrado' }

  /* El link de la ficha de un equipo se manda por WhatsApp: la vista previa
     tiene que mostrar ESE equipo, con su foto y su precio. */
  if (id) {
    const { data } = await clienteAnonimo()
      .from('catalogo_equipos').select(COLS).eq('slug', slug).eq('id', id).maybeSingle()
    const e = data as unknown as EquipoVidriera | null
    if (e) {
      const nombre = nombreEquipo(e)
      const precio = e.price ? `${e.currency === 'USD' ? 'U$' : '$'} ${e.price.toLocaleString('es-AR')}` : ''
      const titulo = `${nombre}${precio ? ` · ${precio}` : ''}`
      const descripcion = `Disponible en ${tienda.nombre}. Consultá por WhatsApp.`
      const foto = e.fotos?.[0]
      return {
        title: `${titulo} · ${tienda.nombre}`,
        description: descripcion,
        openGraph: {
          title: titulo,
          description: descripcion,
          ...(foto ? { images: [{ url: urlFoto(foto), alt: nombre }] } : {}),
        },
        robots: { index: true, follow: true },
      }
    }
  }

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

export default async function CatalogoPage({ params, searchParams }: Props) {
  const { slug } = await params
  const id = idEquipo((await searchParams).e)

  const [tienda, { data: equipos }] = await Promise.all([
    traerTienda(slug),
    clienteAnonimo().from('catalogo_equipos')
      .select(COLS)
      .eq('slug', slug)
      .order('created_at', { ascending: false }),
  ])

  /* Sin tienda, 404 de verdad. Un catálogo apagado no debe decir "existe
     pero está apagado": eso confirma que el local usa el sistema. */
  if (!tienda) notFound()

  return (
    <CatalogoClient
      tienda={tienda}
      equipos={(equipos || []) as unknown as EquipoVidriera[]}
      equipoInicial={id}
    />
  )
}
