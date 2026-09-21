"use client"
import { useRef, useState } from 'react'
import { Camera, X, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import { MAX_FOTOS, subirFoto, borrarFotos, urlFoto } from '@/utils/fotos'

/**
 * Las fotos de un equipo: miniaturas, agregar y sacar.
 *
 * La primera es la portada en la vidriera; tocar otra la pasa adelante.
 * Se sube en el orden elegido y la tabla se actualiza una sola vez al final,
 * así una foto que falla no deja la lista a medias.
 */
export function FotosEquipo({
  orgId, stockId, fotos, onChange,
}: {
  orgId: string
  stockId: string | number
  fotos: string[]
  onChange: (fotos: string[]) => void
}) {
  const supabase = createClient()
  const input = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(0)

  const guardar = async (nuevas: string[]) => {
    const { error } = await supabase.from('stock').update({ photos: nuevas }).eq('id', stockId)
    if (error) throw error
    onChange(nuevas)
  }

  const agregar = async (archivos: FileList | null) => {
    if (!archivos || archivos.length === 0) return
    const lugar = MAX_FOTOS - fotos.length
    const elegidos = Array.from(archivos).slice(0, lugar)
    if (archivos.length > lugar) toast.info(`Máximo ${MAX_FOTOS} fotos por equipo: se suben ${lugar}.`)

    setSubiendo(elegidos.length)
    const subidas: string[] = []
    for (const f of elegidos) {
      try {
        subidas.push(await subirFoto(supabase, orgId, stockId, f))
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'No se pudo subir la foto')
      }
      setSubiendo(n => n - 1)
    }
    if (subidas.length === 0) return

    try {
      await guardar([...fotos, ...subidas])
    } catch (e) {
      // Sin la fila actualizada, los archivos quedarían huérfanos ocupando lugar.
      await borrarFotos(supabase, subidas).catch(() => {})
      toast.error(e instanceof Error ? e.message : 'No se pudieron guardar las fotos')
    }
  }

  const sacar = async (ruta: string) => {
    try {
      await guardar(fotos.filter(r => r !== ruta))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo sacar la foto')
      return
    }
    // Si falla el borrado del archivo, la foto igual ya no se muestra.
    borrarFotos(supabase, [ruta]).catch(() => {})
  }

  const portada = async (ruta: string) => {
    if (fotos[0] === ruta) return
    try {
      await guardar([ruta, ...fotos.filter(r => r !== ruta)])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cambiar la portada')
    }
  }

  const caja: React.CSSProperties = {
    width: 44, height: 44, borderRadius: 9, flexShrink: 0, position: 'relative',
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {fotos.map((ruta, i) => (
        <div key={ruta} style={caja}>
          <button
            onClick={() => portada(ruta)}
            title={i === 0 ? 'Portada' : 'Poner de portada'}
            style={{
              ...caja, padding: 0, border: 'none', cursor: i === 0 ? 'default' : 'pointer', overflow: 'hidden',
              outline: i === 0 ? '2px solid var(--text)' : '1px solid var(--border)', outlineOffset: i === 0 ? 1 : 0,
              background: 'var(--surface-3)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlFoto(ruta, true)} alt="" loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </button>
          <button
            onClick={() => sacar(ruta)}
            aria-label="Sacar foto"
            style={{
              position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%',
              border: 'none', background: 'var(--text)', color: 'var(--bg)', cursor: 'pointer',
              display: 'grid', placeItems: 'center', padding: 0,
            }}
          >
            <X size={11} />
          </button>
        </div>
      ))}

      {Array.from({ length: subiendo }).map((_, i) => (
        <div key={`s${i}`} style={{ ...caja, display: 'grid', placeItems: 'center', border: '1px dashed var(--border-lg)' }}>
          <Loader2 size={16} className="spin" color="var(--text-3)" />
        </div>
      ))}

      {/* Sin fotos, el botón dice qué hace y cuántas entran: un ícono de
          cámara solo no se entiende como "podés subir tres". */}
      {fotos.length === 0 && subiendo === 0 ? (
        <button
          onClick={() => input.current?.click()}
          className="btn btn-outline btn-sm"
          style={{ borderStyle: 'dashed', height: 44, gap: 7 }}
        >
          <Camera size={15} /> Agregar fotos
          <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>· 0/{MAX_FOTOS}</span>
        </button>
      ) : (
        <>
          {fotos.length + subiendo < MAX_FOTOS && (
            <button
              onClick={() => input.current?.click()}
              disabled={subiendo > 0}
              title={`Agregar fotos (hasta ${MAX_FOTOS})`}
              aria-label="Agregar fotos"
              style={{
                ...caja, display: 'grid', placeItems: 'center', cursor: 'pointer',
                background: 'transparent', border: '1px dashed var(--border-lg)', color: 'var(--text-3)',
              }}
            >
              <Plus size={17} />
            </button>
          )}
          <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace', marginLeft: 2 }}>
            {fotos.length + subiendo}/{MAX_FOTOS}
          </span>
        </>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={e => { agregar(e.target.files); e.target.value = '' }}
      />
    </div>
  )
}
