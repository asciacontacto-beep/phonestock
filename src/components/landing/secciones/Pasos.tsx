"use client"
import s from '../landing.module.css'
import AnimatedContent from '../reactbits/AnimatedContent'
import { useMenosMovimiento } from '../preferencias'
import { alEscribir } from '../acciones'
import { linkWhatsApp } from '../precios'

const PASOS = [
  { t: 'Te registrás', d: 'Nombre del local, tu mail y listo. Sin tarjeta y sin hablar con nadie.' },
  { t: 'Cargás el stock', d: 'Escaneás el código de barras o escribís marca, modelo y precio. El IMEI queda guardado.' },
  { t: 'Vendés', d: 'La venta descuenta el stock, suma a la caja y te muestra cuánto ganaste.' },
]

export function Pasos() {
  const quieto = useMenosMovimiento()

  return (
    <section className={s.seccion}>
      <div className={s.ancho}>
        <h2 className={`${s.h2} ${s.h2Centro}`}>Arrancás <em>en una tarde.</em></h2>
        <div className={s.pasos}>
          {PASOS.map((p, i) => {
            const contenido = (
              <div className={s.paso}>
                <div className={s.pasoNumero}>{i + 1}</div>
                <h3 className={s.pasoTitulo}>{p.t}</h3>
                <p className={s.pasoTexto}>{p.d}</p>
              </div>
            )
            return quieto
              ? <div key={p.t}>{contenido}</div>
              : <AnimatedContent key={p.t} distance={40} duration={0.9} ease="power3.out" delay={i * 0.12}>{contenido}</AnimatedContent>
          })}
        </div>
        <p className={s.pasosNota}>
          ¿Preferís que lo configure yo?{' '}
          <a href={linkWhatsApp('mensual')} className={s.linkVerde} style={{ padding: 0 }} target="_blank" rel="noopener noreferrer" onClick={alEscribir}>
            Escribime por WhatsApp ›
          </a>
        </p>
      </div>
    </section>
  )
}
