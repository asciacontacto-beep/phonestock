"use client"
import { useEffect, useState } from 'react'

/**
 * Cambiar entre claro y oscuro.
 *
 * El tema se guarda en el navegador, no en la cuenta: es una preferencia
 * del aparato, no del negocio. El mismo dueño quiere oscuro en la
 * notebook de noche y claro en el mostrador de día.
 *
 * El primer render toma el valor que dejó el script del layout, así no hay
 * un parpadeo de tema equivocado al cargar.
 */
export const CLAVE_TEMA = 'stackr-tema'

/** Los mismos valores que `--bg` en cada tema. */
const COLOR_BARRA = { light: '#fbfbfa', dark: '#0b0c0d' } as const

/**
 * La barra del navegador del celular tiene que seguir al tema elegido.
 * Las etiquetas que pone Next responden a la preferencia del SISTEMA; si el
 * usuario eligió a mano lo contrario, queda una franja clara arriba de una
 * app oscura. Se escribe una etiqueta sin `media`, que gana sobre las otras.
 */
function pintarBarraDelNavegador(tema: 'light' | 'dark') {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = COLOR_BARRA[tema]
}

export function BotonTema() {
  const [oscuro, setOscuro] = useState(false)

  useEffect(() => {
    setOscuro(document.documentElement.dataset.theme === 'dark')
  }, [])

  const alternar = () => {
    const nuevo = !oscuro
    const tema = nuevo ? 'dark' : 'light'
    setOscuro(nuevo)
    document.documentElement.dataset.theme = tema
    pintarBarraDelNavegador(tema)
    try { localStorage.setItem(CLAVE_TEMA, tema) } catch {}
  }

  return (
    <button
      onClick={alternar}
      className="cmdk-trigger"
      title={oscuro ? 'Pasar a claro' : 'Pasar a oscuro'}
      aria-label={oscuro ? 'Pasar a modo claro' : 'Pasar a modo oscuro'}
      style={{ padding: 7, width: 32, height: 32, justifyContent: 'center' }}
    >
      {oscuro ? (
        /* Sol: el círculo y seis rayos, sin el detalle de más. */
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="8" cy="8" r="3.1" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M8 1.2v1.6M8 13.2v1.6M1.2 8h1.6M13.2 8h1.6M3.3 3.3l1.1 1.1M11.6 11.6l1.1 1.1M12.7 3.3l-1.1 1.1M4.4 11.6l-1.1 1.1"
            stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
          />
        </svg>
      ) : (
        /* Luna: una sola forma, sin estrellitas alrededor. */
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M13.4 9.6A5.9 5.9 0 0 1 6.4 2.6a5.9 5.9 0 1 0 7 7Z"
            stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}
