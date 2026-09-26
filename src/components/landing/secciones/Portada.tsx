"use client"
import Link from 'next/link'
import { ArrowRight, Check, TrendingUp, Wallet, CalendarCheck, MessageCircle } from 'lucide-react'
import s from '../landing.module.css'
import Magnet from '../reactbits/Magnet'
import { REGISTRO, alProbar, alEscribir } from '../acciones'
import { linkWhatsApp } from '../precios'
import { usePunteroFino } from '../preferencias'
import { IPhone, PantallaInventario } from './Dispositivos'

/* Todo lo de acá entra con CSS: el primer cuadro nunca queda vacío aunque
   el JavaScript tarde (lección del 19/9, la landing que se veía negra). */
export function Portada() {
  const punteroFino = usePunteroFino()

  return (
    <header className={s.portada} id="top">
      <div className={s.malla} aria-hidden />
      <div className={`${s.ancho} ${s.portadaGrid}`}>
        <div>
          <span className={s.sello}><span className={s.selloChip}>Nuevo</span> Catálogo con fotos para Instagram</span>
          <h1 className={s.titulo}>
            Tu local,<br />
            <span className={s.tituloDegradado}>en orden.</span>
          </h1>
          <p className={s.bajada}>
            Stock con IMEI, ventas, cuotas, reparaciones y caja en un solo lugar.
            El sistema para locales de celulares que te dice cuánto ganás de verdad.
          </p>
          <div className={s.ctas}>
            <Magnet padding={50} magnetStrength={5} disabled={!punteroFino}>
              <Link href={REGISTRO} className={`${s.btn} ${s.btnPrincipal}`} onClick={alProbar}>
                Probar gratis <ArrowRight size={17} className={s.flecha} />
              </Link>
            </Magnet>
            <a href={linkWhatsApp('mensual')} className={`${s.btn} ${s.btnVidrio}`} target="_blank" rel="noopener noreferrer" onClick={alEscribir}>
              <MessageCircle size={17} /> Hablar por WhatsApp
            </a>
          </div>
          <div className={s.confianza}>
            <span><Check size={16} strokeWidth={3} /> 48 h gratis</span>
            <span><Check size={16} strokeWidth={3} /> Sin tarjeta</span>
            <span><Check size={16} strokeWidth={3} /> Soporte por WhatsApp</span>
          </div>
        </div>

        <div className={s.escena} aria-hidden>
          <div className={s.escenaIphone}><IPhone><PantallaInventario /></IPhone></div>

          <div className={`${s.aviso} ${s.aviso1}`}>
            <span className={s.avisoIcono} style={{ background: 'var(--grad)' }}><TrendingUp size={18} /></span>
            <span><b>Venta registrada</b><small>iPhone 15 Pro · ganancia</small></span>
            <span className={s.avisoMonto}>+U$ 250</span>
          </div>
          <div className={`${s.aviso} ${s.aviso2}`}>
            <span className={s.avisoIcono} style={{ background: '#7b61ff' }}><CalendarCheck size={18} /></span>
            <span><b>Cuota cobrada</b><small>Martín G. · 2 de 3</small></span>
            <span className={s.avisoMonto}>U$ 190</span>
          </div>
          <div className={`${s.aviso} ${s.aviso3}`}>
            <span className={s.avisoIcono} style={{ background: '#0a2540' }}><Wallet size={18} /></span>
            <span><b>Caja cerrada</b><small>Turno tarde · diferencia</small></span>
            <span className={s.avisoMonto}>$ 0</span>
          </div>
        </div>
      </div>
    </header>
  )
}
