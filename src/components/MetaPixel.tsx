"use client"
import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { META_PIXEL_ID } from '@/utils/pixel'

/**
 * Carga el píxel de Meta y cuenta las vistas de página.
 *
 * `afterInteractive` lo baja después de que la página ya es usable: medir no
 * puede costarle velocidad a quien llega desde un anuncio —cada segundo de
 * espera se lleva gente antes de que vea nada—.
 *
 * El PageView extra al navegar existe porque esto es una sola aplicación: al
 * pasar de la landing al registro no se recarga nada, así que el píxel no se
 * entera solo y quedaría contando una sola vista por visita.
 */
export function MetaPixel() {
  const pathname = usePathname()
  const primera = useRef(true)

  useEffect(() => {
    // La primera vista ya la cuenta el script al cargarse.
    if (primera.current) { primera.current = false; return }
    try { window.fbq?.('track', 'PageView') } catch { /* sin píxel, seguimos */ }
  }, [pathname])

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1" width="1" style={{ display: 'none' }} alt=""
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  )
}
