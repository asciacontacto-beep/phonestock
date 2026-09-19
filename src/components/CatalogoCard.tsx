"use client"
import { useEffect, useState } from 'react'
import { Store, Copy, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import { aSlug, slugDisponible } from '@/utils/catalogo'

/**
 * El catálogo público del local, desde Ajustes.
 *
 * Dos interruptores separados a propósito: prender el catálogo no publica
 * ningún equipo. Cada uno se elige en Inventario, de a uno. Publicar el
 * inventario entero por prender una opción sería sacarle a la competencia
 * la lista completa de lo que tiene y a cuánto.
 *
 * Que el link esté libre no se consulta antes: un local no puede leer las
 * filas de otro, así que la lista de links tomados no está a su alcance. Se
 * intenta guardar y se traduce el choque del índice único, que es la única
 * fuente de verdad.
 */
export function CatalogoCard({ orgId, shopName }: { orgId: string | null; shopName?: string | null }) {
  const supabase = createClient()
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [activo, setActivo] = useState(false)
  const [slug, setSlug] = useState('')
  const [publicados, setPublicados] = useState(0)

  useEffect(() => {
    if (!orgId) { setCargando(false); return }
    Promise.all([
      supabase.from('organizations').select('catalog_slug,catalog_enabled').eq('id', orgId).maybeSingle(),
      supabase.from('stock').select('id', { count: 'exact', head: true }).eq('in_catalog', true).eq('status', 'available'),
    ]).then(([{ data }, { count }]) => {
      if (data) {
        setActivo(Boolean(data.catalog_enabled))
        setSlug(data.catalog_slug || aSlug(shopName || ''))
      }
      setPublicados(count || 0)
      setCargando(false)
    })
  }, [orgId, shopName, supabase])

  const url = typeof window !== 'undefined' ? `${window.location.origin}/c/${slug}` : `/c/${slug}`

  const guardar = async (nuevoActivo: boolean) => {
    if (!orgId) return

    const v = slugDisponible(slug, [])
    if (!v.ok) { toast.error(v.error); return }

    setGuardando(true)
    const { error } = await supabase
      .from('organizations')
      .update({ catalog_slug: v.slug, catalog_enabled: nuevoActivo })
      .eq('id', orgId)
    setGuardando(false)

    if (error) {
      // El índice único es la única fuente de verdad sobre si está libre.
      toast.error(/duplicate|unique/i.test(error.message)
        ? 'Ese link ya lo está usando otro local. Probá con otro.'
        : error.message)
      return
    }
    setSlug(v.slug)
    setActivo(nuevoActivo)
    toast.success(nuevoActivo ? 'Catálogo publicado' : 'Catálogo apagado')
  }

  if (cargando) {
    return <div className="card"><Loader2 className="spin" size={16} /></div>
  }

  return (
    <div className="card">
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        <Store size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
        Catálogo público
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.55, marginBottom: 16 }}>
        Un link con los equipos que vos elijas, para poner en la bio de Instagram o mandar por
        WhatsApp. El que entra ve el equipo, el precio y un botón para escribirte. No ve el IMEI
        ni lo que te costó.
      </div>

      <div className="field">
        <label className="lbl">Tu link</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>
            /c/
          </span>
          <input
            className="inp"
            style={{ flex: 1, minWidth: 160 }}
            value={slug}
            placeholder="mi-local"
            onChange={e => setSlug(e.target.value)}
            onBlur={e => setSlug(aSlug(e.target.value))}
          />
        </div>
      </div>

      {activo && slug && (
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 12px', marginBottom: 14,
        }}>
          <span style={{ flex: 1, minWidth: 180, fontSize: 12.5, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-2)', wordBreak: 'break-all' }}>
            {url}
          </span>
          <button className="btn btn-outline" style={{ padding: '6px 11px', fontSize: 12 }}
            onClick={() => { navigator.clipboard?.writeText(url); toast.success('Link copiado') }}>
            <Copy size={13} /> Copiar
          </button>
          <a className="btn btn-outline" style={{ padding: '6px 11px', fontSize: 12 }}
            href={url} target="_blank" rel="noreferrer">
            <ExternalLink size={13} /> Ver
          </a>
        </div>
      )}

      <div style={{
        fontSize: 12.5, color: publicados === 0 ? 'var(--amber)' : 'var(--text-3)',
        lineHeight: 1.5, marginBottom: 16,
      }}>
        {publicados === 0
          ? 'Todavía no marcaste ningún equipo para el catálogo. Prender esto no publica nada: elegí los equipos uno por uno desde Inventario.'
          : `${publicados} ${publicados === 1 ? 'equipo marcado' : 'equipos marcados'} para el catálogo. Se publican sólo los que están disponibles.`}
      </div>

      <button
        className={activo ? 'btn btn-outline' : 'btn btn-dark'}
        onClick={() => guardar(!activo)}
        disabled={guardando}
      >
        {guardando ? 'Guardando…' : activo ? 'Apagar el catálogo' : 'Publicar catálogo'}
      </button>
    </div>
  )
}
