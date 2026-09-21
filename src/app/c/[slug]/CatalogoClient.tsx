"use client"
import { useEffect, useMemo, useState } from 'react'
import { mensajeWhatsApp, nombreEquipo, type EquipoStock } from '@/utils/catalogo'
import { urlFoto } from '@/utils/fotos'
import s from './catalogo.module.css'

export type EquipoVidriera = EquipoStock & { fotos?: string[] | null }

type Tienda = {
  slug: string
  nombre: string
  telefono: string | null
  instagram: string | null
  direccion: string | null
}

const CONDICION: Record<string, string> = {
  new: 'Nuevo',
  used: 'Usado',
  refurbished: 'Reacondicionado',
}

const money = (n: number | null, moneda: string | null) =>
  n == null ? '' : `${moneda === 'USD' ? 'U$' : '$'} ${n.toLocaleString('es-AR')}`

/**
 * La vidriera.
 *
 * Es la cara del LOCAL, no la nuestra: su nombre arriba, su contacto, sus
 * equipos. Stackr aparece una sola vez, abajo y en chico.
 *
 * El buscador y los filtros son en el navegador, sin pedirle nada al
 * servidor: un catálogo tiene decenas de equipos, no miles, y que filtre al
 * instante es lo que hace que se recorra en vez de abandonarse.
 */
/**
 * Las fotos de una tarjeta: se deslizan con el dedo, y tocarlas abre la
 * grande. Carga la miniatura; la grande sólo si la abren.
 */
function Fotos({ fotos, nombre, onAbrir }: { fotos: string[]; nombre: string; onAbrir: (i: number) => void }) {
  const [actual, setActual] = useState(0)
  return (
    <div className={s.fotos}>
      <div
        className={s.fotosTira}
        onScroll={e => {
          const t = e.currentTarget
          setActual(Math.round(t.scrollLeft / t.clientWidth))
        }}
      >
        {fotos.map((ruta, i) => (
          <button key={ruta} className={s.fotoBoton} onClick={() => onAbrir(i)} aria-label={`Ver foto ${i + 1} de ${nombre}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlFoto(ruta, true)} alt={i === 0 ? nombre : ''} loading={i === 0 ? 'eager' : 'lazy'} className={s.foto} />
          </button>
        ))}
      </div>
      {fotos.length > 1 && (
        <div className={s.puntos} aria-hidden>
          {fotos.map((r, i) => <span key={r} className={`${s.puntoFoto} ${i === actual ? s.puntoFotoOn : ''}`} />)}
        </div>
      )}
    </div>
  )
}

function Visor({ fotos, inicio, nombre, onCerrar }: { fotos: string[]; inicio: number; nombre: string; onCerrar: () => void }) {
  const [actual, setActual] = useState(inicio)

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', tecla)
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', tecla); document.body.style.overflow = antes }
  }, [onCerrar])

  return (
    <div className={s.visor} role="dialog" aria-modal="true" aria-label={nombre} onClick={onCerrar}>
      <div className={s.visorArriba}>
        <span>{nombre}</span>
        <span>{fotos.length > 1 ? `${actual + 1} / ${fotos.length}` : ''}</span>
      </div>
      <div
        className={s.visorTira}
        ref={el => { if (el && el.dataset.listo !== '1') { el.scrollLeft = inicio * el.clientWidth; el.dataset.listo = '1' } }}
        onScroll={e => { const t = e.currentTarget; setActual(Math.round(t.scrollLeft / t.clientWidth)) }}
      >
        {fotos.map((ruta, i) => (
          <div key={ruta} className={s.visorPagina}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlFoto(ruta)} alt={`${nombre}, foto ${i + 1}`} className={s.visorFoto} onClick={e => e.stopPropagation()} />
          </div>
        ))}
      </div>
      <button className={s.visorCerrar} onClick={onCerrar} aria-label="Cerrar">✕</button>
    </div>
  )
}

export function CatalogoClient({ tienda, equipos }: { tienda: Tienda; equipos: EquipoVidriera[] }) {
  const [q, setQ] = useState('')
  const [marca, setMarca] = useState('todas')
  const [visor, setVisor] = useState<{ fotos: string[]; inicio: number; nombre: string } | null>(null)

  /* Si ningún equipo tiene fotos, las tarjetas quedan como antes. Si
     algunos sí, los que no llevan un lugar vacío para que la grilla no
     quede despareja. */
  const hayFotos = equipos.some(e => (e.fotos || []).length > 0)

  const marcas = useMemo(
    () => [...new Set(equipos.map(e => e.brand).filter(Boolean))] as string[],
    [equipos],
  )

  const visibles = useMemo(() => {
    const texto = q.trim().toLowerCase()
    return equipos.filter(e => {
      if (marca !== 'todas' && e.brand !== marca) return false
      if (!texto) return true
      return nombreEquipo(e).toLowerCase().includes(texto)
    })
  }, [equipos, q, marca])

  return (
    <div className={s.root}>
      <header className={s.cabecera}>
        <div className={`${s.ancho} ${s.cabeceraDentro}`}>
          <h1 className={s.nombre}>{tienda.nombre}</h1>
          <div className={s.contacto}>
            {tienda.direccion && <span>{tienda.direccion}</span>}
            {tienda.instagram && (() => {
              /* El campo se guarda a veces con arroba y a veces sin ella.
                 Se saca siempre y se pone una sola, si no queda "@@local". */
              const usuario = tienda.instagram.replace(/^@+/, '')
              return (
                <a href={`https://instagram.com/${usuario}`} target="_blank" rel="noreferrer">
                  @{usuario}
                </a>
              )
            })()}
          </div>
          <div className={s.cantidad}>
            {equipos.length > 0 && <span className={s.punto} />}
            {equipos.length === 0
              ? 'Sin equipos publicados por ahora'
              : `${equipos.length} ${equipos.length === 1 ? 'equipo disponible ahora' : 'equipos disponibles ahora'}`}
          </div>
        </div>
      </header>

      {equipos.length > 0 && (
        <div className={s.ancho}>
          <div className={s.filtros}>
            <div className={s.buscadorCaja}>
              <input
                className={s.buscador}
                placeholder="Buscar modelo, color…"
                value={q}
                onChange={e => setQ(e.target.value)}
              />
            </div>
            {marcas.length > 1 && (
              <div className={s.marcas}>
                <button
                  className={`${s.chip} ${marca === 'todas' ? s.chipOn : ''}`}
                  onClick={() => setMarca('todas')}
                >Todas</button>
                {marcas.map(m => (
                  <button
                    key={m}
                    className={`${s.chip} ${marca === m ? s.chipOn : ''}`}
                    onClick={() => setMarca(m)}
                  >{m}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <main className={s.ancho}>
        {visibles.length === 0 ? (
          <div className={s.vacio}>
            {equipos.length === 0
              ? 'Este local todavía no publicó equipos. Volvé en un rato.'
              : 'No encontramos equipos con esa búsqueda.'}
          </div>
        ) : (
          <div className={s.grilla}>
            {visibles.map((e, i) => {
              const wa = mensajeWhatsApp(tienda.telefono, e)
              return (
                <article
                  className={s.tarjeta}
                  key={String(e.id)}
                  /* Escalonadas, y con tope: con cincuenta equipos, el
                     último no puede tardar cinco segundos en aparecer. */
                  style={{ animationDelay: `${Math.min(i, 12) * 0.035}s` }}
                >
                  {hayFotos && ((e.fotos || []).length > 0 ? (
                    <Fotos
                      fotos={e.fotos || []}
                      nombre={nombreEquipo(e)}
                      onAbrir={i => setVisor({ fotos: e.fotos || [], inicio: i, nombre: nombreEquipo(e) })}
                    />
                  ) : (
                    <div className={`${s.fotos} ${s.sinFoto}`} aria-hidden>
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                        <rect x="6" y="2" width="12" height="20" rx="3" /><path d="M11 18h2" />
                      </svg>
                    </div>
                  ))}

                  <div className={s.equipoTitulo}>
                    {[e.brand, e.model].filter(Boolean).join(' ')}
                  </div>

                  <div className={s.specs}>
                    {e.storage && <span className={s.spec}>{e.storage}</span>}
                    {e.color && <span className={s.spec}>{e.color}</span>}
                    {e.condition && (
                      <span className={`${s.spec} ${e.condition === 'new' ? s.specNuevo : ''}`}>
                        {CONDICION[e.condition] || e.condition}
                      </span>
                    )}
                    {e.battery && <span className={s.spec}>Batería {String(e.battery).replace('%', '')}%</span>}
                  </div>

                  <div className={s.pie2}>
                    <div className={s.precio}>{money(e.price ?? null, e.currency ?? null)}</div>
                  </div>

                  {wa ? (
                    <a className={s.consultar} href={wa} target="_blank" rel="noreferrer">
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                        <path d="M8 .9a7 7 0 0 0-6 10.6L1 15.1l3.7-1a7 7 0 1 0 3.3-13.2Zm0 12.7a5.7 5.7 0 0 1-2.9-.8l-.2-.1-2.2.6.6-2.1-.1-.2a5.7 5.7 0 1 1 4.8 2.6Zm3.2-4.2c-.2-.1-1-.5-1.2-.6-.2 0-.3-.1-.4.1l-.6.7c-.1.1-.2.1-.4 0a4.7 4.7 0 0 1-2.3-2c-.2-.3.2-.3.5-1 0-.1 0-.2-.1-.3L6.2 5c-.1-.3-.3-.3-.4-.3h-.4a.7.7 0 0 0-.5.3 2 2 0 0 0-.7 1.6 3.6 3.6 0 0 0 .8 1.9 8.2 8.2 0 0 0 3.1 2.7c1.2.5 1.6.5 2.2.4a1.8 1.8 0 0 0 1.2-.8 1.5 1.5 0 0 0 .1-.9l-.4-.2Z"/>
                      </svg>
                      Consultar
                    </a>
                  ) : (
                    <div className={s.sinContacto}>Consultá en el local</div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </main>

      {visor && <Visor {...visor} onCerrar={() => setVisor(null)} />}

      <footer className={s.pie}>
        <div className={s.ancho}>
          <span>
            Los precios pueden cambiar sin aviso. Consultá disponibilidad antes de venir.
          </span>
          {/* Stackr aparece una vez, abajo y en chico: la página es del local. */}
          <a href="https://stackrarg.vercel.app" target="_blank" rel="noreferrer" className={s.marca}>
            Hecho con Stackr
          </a>
        </div>
      </footer>
    </div>
  )
}
