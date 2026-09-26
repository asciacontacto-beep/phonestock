"use client"
import s from '../landing.module.css'
import CountUp from '../reactbits/CountUp'
import { useMenosMovimiento } from '../preferencias'
import { Notebook, PantallaPanel } from './Dispositivos'

/* La franja azul marino: el producto grande, con dos datos de vidrio
   flotando encima, como hacen las fintech con sus tableros. */
export function Sistema() {
  const quieto = useMenosMovimiento()
  const n = (to: number) => (quieto ? to.toLocaleString('es-AR') : <CountUp to={to} duration={1.8} separator="." />)

  return (
    <section className={`${s.seccion} ${s.sistema}`} id="sistema">
      <div className={s.sistemaBrillo} aria-hidden />
      <div className={s.ancho} style={{ position: 'relative' }}>
        <div className={s.centro}>
          <span className={s.etiqueta} style={{ color: '#5ce0c0' }}>El sistema</span>
          <h2 className={s.h2}>Todo el local en un panel. <em>En la compu y en el celular.</em></h2>
          <p className={`${s.parrafo} ${s.parrafoCentro}`}>
            Entrás desde cualquier navegador. Sin instalar nada, sin servidores, con tus datos respaldados.
          </p>
        </div>

        <div className={s.sistemaEscena} aria-hidden>
          <Notebook><PantallaPanel /></Notebook>
          <div className={`${s.sistemaDato} ${s.sistemaDato1}`}>
            <small>Ganancia real del mes</small>
            <b>U$ {n(9870)}</b>
          </div>
          <div className={`${s.sistemaDato} ${s.sistemaDato2}`}>
            <small>Equipos vendidos</small>
            <b>{n(63)}</b>
          </div>
        </div>

        <div className={s.cifras}>
          <div className={s.cifra}><b className={s.degradado}>1 tarde</b><span>para tenerlo andando</span></div>
          <div className={s.cifra}><b className={s.degradado}>Ilimitados</b><span>usuarios y sucursales</span></div>
          <div className={s.cifra}><b className={s.degradado}>El mismo día</b><span>soporte por WhatsApp</span></div>
        </div>
      </div>
    </section>
  )
}
