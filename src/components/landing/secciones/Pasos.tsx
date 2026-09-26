"use client"
import s from '../landing.module.css'
import { alEscribir } from '../acciones'
import { linkWhatsApp } from '../precios'

const PASOS = [
  { t: 'Te registrás', d: 'Nombre del local, tu mail y listo. Sin tarjeta y sin hablar con nadie.' },
  { t: 'Cargás el stock', d: 'Escaneás el código de barras o escribís marca, modelo y precio. El IMEI queda guardado.' },
  { t: 'Vendés', d: 'La venta descuenta el stock, suma a la caja y te muestra cuánto ganaste.' },
]

export function Pasos() {
  return (
    <section className={`${s.seccion} ${s.seccionBlanca}`}>
      <div className={s.ancho}>
        <div className={s.centro}>
          <span className={s.etiqueta}>Cómo empezar</span>
          <h2 className={s.h2}>Arrancás <em>en una tarde.</em></h2>
        </div>
        <div className={s.pasos}>
          <div className={s.pasosLinea} aria-hidden />
          {PASOS.map((p, i) => (
            <div key={p.t} className={s.paso}>
              <div className={s.pasoNumero}>{i + 1}</div>
              <h3 className={s.pasoTitulo}>{p.t}</h3>
              <p className={s.pasoTexto}>{p.d}</p>
            </div>
          ))}
        </div>
        <p className={s.centro} style={{ marginTop: 44, fontSize: 16, color: 'var(--texto-2)' }}>
          ¿Preferís que te lo configuremos?{' '}
          <a href={linkWhatsApp('mensual')} className={s.linkVerde} target="_blank" rel="noopener noreferrer" onClick={alEscribir}>
            Escribinos por WhatsApp →
          </a>
        </p>
      </div>
    </section>
  )
}
