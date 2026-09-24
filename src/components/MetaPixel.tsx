"use client"
import { useEffect } from 'react'
import Script from 'next/script'
import { META_PIXEL_ID, eventoMeta } from '@/utils/metaPixel'

/**
 * Carga el píxel de Meta y cuenta la visita. Se monta en cada página
 * pública que queremos medir (landing, registro): al navegar de una a otra
 * sin recargar, cada una registra su propia visita.
 */
export function MetaPixel() {
  useEffect(() => { eventoMeta('PageView') }, [])

  if (!META_PIXEL_ID) return null
  return (
    <>
      <Script id="meta-pixel" src="https://connect.facebook.net/en_US/fbevents.js" strategy="afterInteractive" />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img height="1" width="1" style={{ display: 'none' }} alt=""
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} />
      </noscript>
    </>
  )
}
