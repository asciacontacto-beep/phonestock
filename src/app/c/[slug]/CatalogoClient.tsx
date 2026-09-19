"use client"
import { useMemo, useState } from 'react'
import { mensajeWhatsApp, nombreEquipo, type EquipoStock } from '@/utils/catalogo'
import s from './catalogo.module.css'

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
export function CatalogoClient({ tienda, equipos }: { tienda: Tienda; equipos: EquipoStock[] }) {
  const [q, setQ] = useState('')
  const [marca, setMarca] = useState('todas')

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
        <div className={s.ancho}>
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
            {equipos.length === 0
              ? 'Sin equipos publicados por ahora'
              : `${equipos.length} ${equipos.length === 1 ? 'equipo disponible' : 'equipos disponibles'}`}
          </div>
        </div>
      </header>

      {equipos.length > 0 && (
        <div className={s.ancho}>
          <div className={s.filtros}>
            <input
              className={s.buscador}
              placeholder="Buscar modelo, color…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
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
            {visibles.map(e => {
              const wa = mensajeWhatsApp(tienda.telefono, e)
              return (
                <article className={s.tarjeta} key={String(e.id)}>
                  <div className={s.equipoTitulo}>
                    {[e.brand, e.model].filter(Boolean).join(' ')}
                  </div>

                  <div className={s.specs}>
                    {e.storage && <span className={s.spec}>{e.storage}</span>}
                    {e.color && <span className={s.spec}>{e.color}</span>}
                    {e.condition && <span className={s.spec}>{CONDICION[e.condition] || e.condition}</span>}
                    {e.battery && <span className={s.spec}>Batería {String(e.battery).replace('%', '')}%</span>}
                  </div>

                  <div className={s.precio}>{money(e.price ?? null, e.currency ?? null)}</div>

                  {wa ? (
                    <a className={s.consultar} href={wa} target="_blank" rel="noreferrer">
                      Consultar por WhatsApp
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
