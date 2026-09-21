"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

const bateria = (b: EquipoStock['battery']) => `${String(b).replace('%', '')}%`

/** El parámetro del link que abre la ficha de un equipo: /c/local?e=123 */
const PARAM = 'e'

function IconoWhatsApp({ tam = 15 }: { tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 .9a7 7 0 0 0-6 10.6L1 15.1l3.7-1a7 7 0 1 0 3.3-13.2Zm0 12.7a5.7 5.7 0 0 1-2.9-.8l-.2-.1-2.2.6.6-2.1-.1-.2a5.7 5.7 0 1 1 4.8 2.6Zm3.2-4.2c-.2-.1-1-.5-1.2-.6-.2 0-.3-.1-.4.1l-.6.7c-.1.1-.2.1-.4 0a4.7 4.7 0 0 1-2.3-2c-.2-.3.2-.3.5-1 0-.1 0-.2-.1-.3L6.2 5c-.1-.3-.3-.3-.4-.3h-.4a.7.7 0 0 0-.5.3 2 2 0 0 0-.7 1.6 3.6 3.6 0 0 0 .8 1.9 8.2 8.2 0 0 0 3.1 2.7c1.2.5 1.6.5 2.2.4a1.8 1.8 0 0 0 1.2-.8 1.5 1.5 0 0 0 .1-.9l-.4-.2Z"/>
    </svg>
  )
}

function SinFoto({ className }: { className: string }) {
  return (
    <div className={className} aria-hidden>
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="6" y="2" width="12" height="20" rx="3" /><path d="M11 18h2" />
      </svg>
    </div>
  )
}

/** Bloquea el scroll de la página y cierra con Escape mientras está abierto. */
function useModal(onCerrar: () => void) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', tecla)
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', tecla); document.body.style.overflow = antes }
  }, [onCerrar])
}

/**
 * Las fotos de una tarjeta: se deslizan con el dedo. Carga la miniatura;
 * la grande recién en la ficha.
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
          <button
            key={ruta}
            className={s.fotoBoton}
            // Sin esto, el toque sube a la tarjeta y la ficha abre en la foto 1.
            onClick={ev => { ev.stopPropagation(); onAbrir(i) }}
            aria-label={`Ver ${nombre}, foto ${i + 1}`}
          >
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

/** Una foto a pantalla completa, para ver el detalle de una marca o un rayón. */
function Visor({ fotos, inicio, nombre, onCerrar }: { fotos: string[]; inicio: number; nombre: string; onCerrar: () => void }) {
  const [actual, setActual] = useState(inicio)
  useModal(onCerrar)

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

/**
 * La ficha de un equipo.
 *
 * Es lo que se abre al tocar una tarjeta: las fotos grandes, todos los datos
 * y el botón para consultar. Tiene su propio link, así el local la puede
 * mandar por WhatsApp y la vista previa sale con la foto de ESE equipo.
 */
function Detalle({
  equipo, tienda, fotoInicial, onCerrar,
}: {
  equipo: EquipoVidriera
  tienda: Tienda
  fotoInicial: number
  onCerrar: () => void
}) {
  const fotos = equipo.fotos || []
  const nombre = nombreEquipo(equipo)
  const wa = mensajeWhatsApp(tienda.telefono, equipo)
  const tira = useRef<HTMLDivElement>(null)
  const [actual, setActual] = useState(fotoInicial)
  const [visor, setVisor] = useState<number | null>(null)
  const [copiado, setCopiado] = useState(false)
  const cerrarVisor = useCallback(() => setVisor(null), [])

  // Con el visor abierto, Escape tiene que cerrar sólo el visor.
  useModal(useCallback(() => { if (visor === null) onCerrar() }, [visor, onCerrar]))

  const ir = (i: number) => {
    const t = tira.current
    if (!t) return
    t.scrollTo({ left: i * t.clientWidth, behavior: 'smooth' })
  }

  const compartir = async () => {
    const url = window.location.href
    const datos = { title: nombre, text: `${nombre} en ${tienda.nombre}`, url }
    if (navigator.share) {
      try { await navigator.share(datos) } catch { /* lo cerró */ }
      return
    }
    await navigator.clipboard?.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1800)
  }

  const filas: [string, string][] = [
    ['Capacidad', equipo.storage || ''],
    ['Color', equipo.color || ''],
    ['Estado', equipo.condition ? (CONDICION[equipo.condition] || equipo.condition) : ''],
    ['Batería', equipo.battery ? bateria(equipo.battery) : ''],
  ].filter(([, v]) => v) as [string, string][]

  return (
    <div className={s.detalleFondo} onClick={onCerrar}>
      <div className={s.detalle} role="dialog" aria-modal="true" aria-label={nombre} onClick={e => e.stopPropagation()}>
        <button className={s.detalleCerrar} onClick={onCerrar} aria-label="Cerrar">✕</button>

        <div className={`${s.galeria} ${fotos.length === 0 ? s.galeriaSinFotos : ''}`}>
          {fotos.length === 0 ? (
            <SinFoto className={s.galeriaVacia} />
          ) : (
            <>
              <div
                className={s.galeriaTira}
                ref={el => {
                  tira.current = el
                  if (el && el.dataset.listo !== '1') { el.scrollLeft = fotoInicial * el.clientWidth; el.dataset.listo = '1' }
                }}
                onScroll={e => { const t = e.currentTarget; setActual(Math.round(t.scrollLeft / t.clientWidth)) }}
              >
                {fotos.map((ruta, i) => (
                  <button key={ruta} className={s.galeriaFoto} onClick={() => setVisor(i)} aria-label={`Ampliar foto ${i + 1}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={urlFoto(ruta)} alt={`${nombre}, foto ${i + 1}`} />
                  </button>
                ))}
              </div>
              {fotos.length > 1 && (
                <>
                  <button className={`${s.flecha} ${s.flechaIzq}`} onClick={() => ir(Math.max(0, actual - 1))}
                    disabled={actual === 0} aria-label="Foto anterior">‹</button>
                  <button className={`${s.flecha} ${s.flechaDer}`} onClick={() => ir(Math.min(fotos.length - 1, actual + 1))}
                    disabled={actual === fotos.length - 1} aria-label="Foto siguiente">›</button>
                </>
              )}
            </>
          )}
        </div>

        {fotos.length > 1 && (
          <div className={s.miniaturas}>
            {fotos.map((ruta, i) => (
              <button key={ruta} className={`${s.miniatura} ${i === actual ? s.miniaturaOn : ''}`}
                onClick={() => ir(i)} aria-label={`Ver foto ${i + 1}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urlFoto(ruta, true)} alt="" />
              </button>
            ))}
          </div>
        )}

        <div className={s.detalleInfo}>
          {equipo.brand && <div className={s.detalleMarca}>{equipo.brand}</div>}
          <h2 className={s.detalleTitulo}>{equipo.model}</h2>
          <div className={s.detallePrecio}>{money(equipo.price ?? null, equipo.currency ?? null)}</div>

          {filas.length > 0 && (
            <dl className={s.datos}>
              {filas.map(([k, v]) => (
                <div key={k} className={s.dato}>
                  <dt>{k}</dt>
                  <dd className={k === 'Estado' && equipo.condition === 'new' ? s.datoNuevo : ''}>{v}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className={s.acciones}>
            {wa ? (
              <a className={s.consultar} href={wa} target="_blank" rel="noreferrer">
                <IconoWhatsApp /> Consultar por WhatsApp
              </a>
            ) : (
              <div className={s.sinContacto}>Consultá en el local</div>
            )}
            <button className={s.compartir} onClick={compartir}>
              {copiado ? 'Link copiado' : 'Compartir'}
            </button>
          </div>

          <p className={s.aviso}>
            {tienda.nombre}{tienda.direccion ? ` · ${tienda.direccion}` : ''}. El precio puede cambiar sin aviso; consultá disponibilidad antes de venir.
          </p>
        </div>
      </div>

      {visor !== null && <Visor fotos={fotos} inicio={visor} nombre={nombre} onCerrar={cerrarVisor} />}
    </div>
  )
}

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
export function CatalogoClient({
  tienda, equipos, equipoInicial,
}: {
  tienda: Tienda
  equipos: EquipoVidriera[]
  /** Si el link trae ?e=, la ficha de ese equipo abre de entrada. */
  equipoInicial?: string | null
}) {
  const [q, setQ] = useState('')
  const [marca, setMarca] = useState('todas')
  const [abierto, setAbierto] = useState<{ id: string; foto: number } | null>(
    equipoInicial && equipos.some(e => String(e.id) === equipoInicial) ? { id: equipoInicial, foto: 0 } : null,
  )

  /* La ficha abierta vive en la URL: el botón "atrás" del teléfono la
     cierra en vez de sacar a la persona del catálogo. */
  useEffect(() => {
    const alVolver = () => {
      const id = new URLSearchParams(window.location.search).get(PARAM)
      setAbierto(id ? { id, foto: 0 } : null)
    }
    window.addEventListener('popstate', alVolver)
    return () => window.removeEventListener('popstate', alVolver)
  }, [])

  const abrir = (e: EquipoVidriera, foto = 0) => {
    const url = new URL(window.location.href)
    url.searchParams.set(PARAM, String(e.id))
    window.history.pushState({ ficha: true }, '', url)
    setAbierto({ id: String(e.id), foto })
  }

  const cerrar = useCallback(() => {
    if (window.history.state?.ficha) {
      window.history.back()  // el popstate la cierra
      return
    }
    // Entró directo al link de la ficha: no hay a dónde volver.
    const url = new URL(window.location.href)
    url.searchParams.delete(PARAM)
    window.history.replaceState(null, '', url)
    setAbierto(null)
  }, [])

  const equipoAbierto = abierto ? equipos.find(e => String(e.id) === abierto.id) : undefined

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
                  role="button"
                  tabIndex={0}
                  aria-label={`Ver ${nombreEquipo(e)}`}
                  onClick={() => abrir(e)}
                  onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(e) } }}
                  /* Escalonadas, y con tope: con cincuenta equipos, el
                     último no puede tardar cinco segundos en aparecer. */
                  style={{ animationDelay: `${Math.min(i, 12) * 0.035}s` }}
                >
                  {hayFotos && ((e.fotos || []).length > 0 ? (
                    <Fotos fotos={e.fotos || []} nombre={nombreEquipo(e)} onAbrir={foto => abrir(e, foto)} />
                  ) : (
                    <SinFoto className={`${s.fotos} ${s.sinFoto}`} />
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
                    {e.battery && <span className={s.spec}>Batería {bateria(e.battery)}</span>}
                  </div>

                  <div className={s.pie2}>
                    <div className={s.precio}>{money(e.price ?? null, e.currency ?? null)}</div>
                    <span className={s.verMas}>Ver detalle →</span>
                  </div>

                  {wa ? (
                    <a className={s.consultar} href={wa} target="_blank" rel="noreferrer"
                      onClick={ev => ev.stopPropagation()}>
                      <IconoWhatsApp /> Consultar
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

      {equipoAbierto && abierto && (
        <Detalle
          key={abierto.id}
          equipo={equipoAbierto}
          tienda={tienda}
          fotoInicial={abierto.foto}
          onCerrar={cerrar}
        />
      )}

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
