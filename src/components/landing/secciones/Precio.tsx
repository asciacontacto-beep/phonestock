"use client"
import Link from 'next/link'
import s from '../landing.module.css'
import CountUp from '../reactbits/CountUp'
import ShinyText from '../reactbits/ShinyText'
import Magnet from '../reactbits/Magnet'
import { useMenosMovimiento, usePunteroFino } from '../preferencias'
import { REGISTRO, alProbar, alEscribir } from '../acciones'
import { PRECIO_MENSUAL, PRECIO_LIFETIME_USD, money, linkWhatsApp } from '../precios'

/* La franja negra, como en las páginas de los "Pro": el precio de por vida
   es el plan que se empuja y lo que ningún competidor ofrece. */
export function Precio() {
  const quieto = useMenosMovimiento()
  const punteroFino = usePunteroFino()

  return (
    <section className={s.precio} id="precio">
      <div className={s.ancho}>
        <p className={s.precioEtiqueta}>Licencia de por vida</p>
        <p className={s.precioNumero}>
          <span className={s.precioMoneda}>USD</span>
          {quieto ? PRECIO_LIFETIME_USD : <CountUp to={PRECIO_LIFETIME_USD} duration={1.8} />}
        </p>
        <p className={s.precioLema}>
          Una vez.{' '}
          <ShinyText text="Para siempre." disabled={quieto} speed={3.5} className={s.brillo} color="#6e6e73" shineColor="#ffffff" />
        </p>
        <p className={s.precioIncluye}>
          Sucursales, usuarios y todas las actualizaciones incluidas. Soporte directo por WhatsApp.
        </p>
        <div className={s.ctas}>
          <Magnet padding={60} magnetStrength={4} disabled={!punteroFino}>
            <Link href={REGISTRO} className={s.btnVerde} onClick={alProbar}>Probar gratis</Link>
          </Magnet>
          <a href={linkWhatsApp('lifetime')} className={s.linkVerde} target="_blank" rel="noopener noreferrer" onClick={alEscribir}>
            Quiero la licencia ›
          </a>
        </div>
        <p className={s.precioMensual}>o {money(PRECIO_MENSUAL)} por mes, sin permanencia.</p>
      </div>
    </section>
  )
}
