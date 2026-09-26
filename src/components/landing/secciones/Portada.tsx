"use client"
import Link from 'next/link'
import s from '../landing.module.css'
import Magnet from '../reactbits/Magnet'
import { REGISTRO, alProbar, alEscribir } from '../acciones'
import { PRECIO_MENSUAL, PRECIO_LIFETIME_USD, money, usd, linkWhatsApp } from '../precios'
import { usePunteroFino } from '../preferencias'
import { IPhone, Notebook, PantallaInventario, PantallaPanel } from './Dispositivos'

/* Lo primero que ve quien viene de un anuncio. Todo acá entra con CSS y no
   con JavaScript: el título tiene que estar en el primer cuadro aunque el
   script tarde (el 19/9 la landing se veía negra por depender de eso). */
const LINEA_1 = ['Tu', 'local,']
const LINEA_2 = ['en', 'orden.']

export function Portada() {
  const punteroFino = usePunteroFino()

  return (
    <header className={s.portada} id="top">
      <div className={s.ancho}>
        <span className={s.sello}><span className={s.selloPunto} /> Prueba gratis 48 h · sin tarjeta</span>

        <h1 className={s.titulo}>
          {LINEA_1.map((p, i) => (
            <span key={p} className={s.palabra} style={{ '--i': i } as React.CSSProperties}>{p}&nbsp;</span>
          ))}
          <br />
          <em>
            {LINEA_2.map((p, i) => (
              <span key={p} className={s.palabra} style={{ '--i': i + 2 } as React.CSSProperties}>{p}{i === 0 ? ' ' : ''}</span>
            ))}
          </em>
        </h1>

        <p className={s.bajada}>
          Stock con IMEI, ventas, cuotas y caja. En un solo lugar, en el celular y en la compu.
        </p>

        <div className={s.ctas}>
          <Magnet padding={60} magnetStrength={4} disabled={!punteroFino}>
            <Link href={REGISTRO} className={s.btnVerde} onClick={alProbar}>Probar gratis</Link>
          </Magnet>
          <a href={linkWhatsApp('mensual')} className={s.linkVerde} target="_blank" rel="noopener noreferrer" onClick={alEscribir}>
            Consultar por WhatsApp ›
          </a>
        </div>
        <p className={s.nota}>
          {usd(PRECIO_LIFETIME_USD)} una sola vez y es tuyo para siempre · o {money(PRECIO_MENSUAL)} por mes
        </p>
      </div>

      <div className={s.ancho}>
        <div className={s.escena}>
          <div className={s.resplandor} />
          <div className={s.escenaNotebook}>
            <Notebook><PantallaPanel /></Notebook>
          </div>
          <div className={s.escenaIphone}>
            <IPhone><PantallaInventario /></IPhone>
          </div>
        </div>
      </div>
    </header>
  )
}
