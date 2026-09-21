"use client"
import { useEffect, useMemo, useState } from 'react'
import { Store, Copy, ExternalLink, Search, Check } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import { aSlug, slugDisponible, nombreEquipo, type EquipoStock } from '@/utils/catalogo'
import { borrarFotos } from '@/utils/fotos'
import { FotosEquipo } from './FotosEquipo'

type Org = { id: string; name: string; catalog_slug: string | null; catalog_enabled: boolean } | null

const CONDICION: Record<string, string> = { new: 'Nuevo', used: 'Usado', refurbished: 'Reacondicionado' }
const money = (n: number | null | undefined, m: string | null | undefined) =>
  n == null ? '—' : `${m === 'USD' ? 'U$' : '$'} ${n.toLocaleString('es-AR')}`

/**
 * El catálogo, desde adentro.
 *
 * Antes esto estaba partido en dos lugares: el link en Ajustes y los
 * equipos en Inventario. Nadie arma una vidriera saltando entre dos
 * pantallas — acá se ve el link, el estado y la lista completa con un
 * interruptor por equipo, en el mismo lugar.
 */
export function CatalogoAdminClient({
  org, stockInicial, nombreLocal,
}: {
  org: Org
  stockInicial: EquipoStock[]
  nombreLocal: string
}) {
  const supabase = createClient()
  const [stock, setStock] = useState(stockInicial)
  const [slug, setSlug] = useState(org?.catalog_slug || aSlug(nombreLocal))
  const [activo, setActivo] = useState(Boolean(org?.catalog_enabled))
  const [guardando, setGuardando] = useState(false)
  const [q, setQ] = useState('')
  const [soloPublicados, setSoloPublicados] = useState(false)

  const publicados = stock.filter(e => e.in_catalog).length

  // Un equipo vendido no vuelve a la vidriera: sus fotos sólo ocupan lugar.
  // Se limpian al entrar acá, sin esperar ni avisar.
  useEffect(() => {
    let cancelado = false
    ;(async () => {
      const { data } = await supabase.from('stock')
        .select('id,photos')
        .neq('status', 'available')
        .neq('photos', '{}')
        .limit(50)
      for (const e of data || []) {
        if (cancelado) return
        const fotos = (e.photos || []) as string[]
        if (fotos.length === 0) continue
        const { error } = await supabase.from('stock').update({ photos: [] }).eq('id', e.id)
        if (!error) await borrarFotos(supabase, fotos).catch(() => {})
      }
    })()
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cambiarFotos = (id: EquipoStock['id'], fotos: string[]) =>
    setStock(p => p.map(x => x.id === id ? { ...x, photos: fotos } : x))

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase()
    return stock.filter(e => {
      if (soloPublicados && !e.in_catalog) return false
      if (!t) return true
      return nombreEquipo(e).toLowerCase().includes(t)
    })
  }, [stock, q, soloPublicados])

  const url = typeof window !== 'undefined' ? `${window.location.origin}/c/${slug}` : `/c/${slug}`

  const alternarEquipo = async (e: EquipoStock) => {
    const nuevo = !e.in_catalog
    // Se cambia en pantalla primero: marcar veinte equipos esperando al
    // servidor en cada uno es lo que hace que nadie arme el catálogo.
    setStock(p => p.map(x => x.id === e.id ? { ...x, in_catalog: nuevo } : x))
    const { error } = await supabase.from('stock').update({ in_catalog: nuevo }).eq('id', e.id)
    if (error) {
      setStock(p => p.map(x => x.id === e.id ? { ...x, in_catalog: !nuevo } : x))
      toast.error(error.message)
    }
  }

  const todos = async (publicar: boolean) => {
    const ids = visibles.filter(e => Boolean(e.in_catalog) !== publicar).map(e => e.id)
    if (ids.length === 0) return
    setStock(p => p.map(x => ids.includes(x.id) ? { ...x, in_catalog: publicar } : x))
    const { error } = await supabase.from('stock').update({ in_catalog: publicar }).in('id', ids)
    if (error) { toast.error(error.message); return }
    toast.success(publicar ? `${ids.length} equipos publicados` : `${ids.length} equipos sacados`)
  }

  const guardarLink = async (nuevoActivo: boolean) => {
    if (!org) return
    const v = slugDisponible(slug, [])
    if (!v.ok) { toast.error(v.error); return }

    setGuardando(true)
    const { error } = await supabase.from('organizations')
      .update({ catalog_slug: v.slug, catalog_enabled: nuevoActivo }).eq('id', org.id)
    setGuardando(false)

    if (error) {
      toast.error(/duplicate|unique/i.test(error.message)
        ? 'Ese link ya lo usa otro local. Probá con otro.'
        : error.message)
      return
    }
    setSlug(v.slug)
    setActivo(nuevoActivo)
    toast.success(nuevoActivo ? 'Catálogo publicado' : 'Catálogo apagado')
  }

  return (
    <div className="page">
      <div className="sh" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="st">Catálogo</h1>
          <div className="ss2">Un link con los equipos que elijas, para compartir con tus clientes</div>
        </div>
        {activo && slug && (
          <a className="btn btn-outline" href={url} target="_blank" rel="noreferrer">
            <ExternalLink size={15} /> Ver el catálogo
          </a>
        )}
      </div>

      {/* ── El link ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 280px' }}>
            <label className="lbl">Tu link</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                /c/
              </span>
              <input
                className="inp"
                value={slug}
                placeholder="mi-local"
                onChange={e => setSlug(e.target.value)}
                onBlur={e => setSlug(aSlug(e.target.value))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {activo && (
              <button className="btn btn-outline"
                onClick={() => { navigator.clipboard?.writeText(url); toast.success('Link copiado') }}>
                <Copy size={15} /> Copiar
              </button>
            )}
            <button
              className={activo ? 'btn btn-outline' : 'btn btn-dark'}
              onClick={() => guardarLink(!activo)}
              disabled={guardando}
            >
              {guardando ? 'Guardando…' : activo ? 'Apagar' : 'Publicar catálogo'}
            </button>
          </div>
        </div>

        <div style={{
          marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)',
          fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.55,
        }}>
          {activo
            ? <>Está publicado en <strong style={{ color: 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace' }}>{url}</strong> · {publicados} {publicados === 1 ? 'equipo visible' : 'equipos visibles'}</>
            : <>Todavía no está publicado. Cuando lo prendas, cualquiera con el link va a ver los equipos que marques acá abajo — con precio, sin el IMEI ni lo que te costó.</>}
        </div>
      </div>

      {/* ── Los equipos ── */}
      <div className="search-bar no-print" style={{ marginBottom: 14 }}>
        <Search size={16} color="var(--text-3)" />
        <input
          className="search-input"
          placeholder="Buscar modelo, color…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <button className={`btn-pill ${soloPublicados ? 'active' : ''}`} onClick={() => setSoloPublicados(v => !v)}>
          Sólo publicados
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button className="btn btn-outline btn-sm" onClick={() => todos(true)}>
          <Store size={14} /> Publicar los {visibles.length} de la lista
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => todos(false)}>Sacar todos</button>
      </div>

      {visibles.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-3)', padding: 60 }}>
          {stock.length === 0
            ? 'No tenés equipos disponibles para publicar.'
            : 'Ningún equipo coincide con la búsqueda.'}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {visibles.map((e, i) => (
            <div
              key={String(e.id)}
              style={{
                borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                padding: '12px 18px',
                display: 'flex', alignItems: 'center', gap: '10px 14px', flexWrap: 'wrap',
              }}
            >
            <button
              onClick={() => alternarEquipo(e)}
              style={{
                flex: '1 1 220px', minWidth: 0, textAlign: 'left', background: 'transparent',
                border: 'none', padding: 0, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 14,
              }}
            >
              <span style={{
                width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                display: 'grid', placeItems: 'center',
                background: e.in_catalog ? 'var(--text)' : 'transparent',
                border: e.in_catalog ? 'none' : '1.5px solid var(--border-lg)',
                color: 'var(--bg)',
                transition: 'background .16s var(--ease), border-color .16s var(--ease)',
              }}>
                {e.in_catalog && <Check size={14} />}
              </span>

              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 600, fontSize: 13.5 }}>
                  {[e.brand, e.model].filter(Boolean).join(' ')}
                </span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
                  {[e.storage, e.color, CONDICION[e.condition || ''] || e.condition].filter(Boolean).join(' · ')}
                </span>
              </span>

              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, flexShrink: 0 }}>
                {money(e.price, e.currency)}
              </span>
            </button>
            {org && e.id != null && (
              <FotosEquipo
                orgId={org.id}
                stockId={e.id}
                fotos={(e.photos as string[] | undefined) || []}
                onChange={f => cambiarFotos(e.id, f)}
              />
            )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
