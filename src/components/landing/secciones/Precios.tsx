"use client"
import Link from 'next/link'
import { Check, ArrowRight } from 'lucide-react'
import s from '../landing.module.css'
import { REGISTRO, alProbar, alEscribir } from '../acciones'
import { PRECIO_MENSUAL, PRECIO_LIFETIME_USD, money, usd, linkWhatsApp } from '../precios'

const INCLUYE = [
  'Sucursales y usuarios ilimitados',
  'Inventario con IMEI y código de barras',
  'Ventas, cuotas y cuenta corriente',
  'Reparaciones, mayoristas y caja',
  'Catálogo online con fotos',
  'Todas las actualizaciones incluidas',
  'Soporte directo por WhatsApp',
]

/* El de por vida va primero y destacado: es el plan que se empuja y lo que
   ningún competidor ofrece. El mensual queda como alternativa. */
export function Precios() {
  return (
    <section className={s.seccion} id="precios">
      <div className={s.ancho}>
        <div className={s.centro}>
          <span className={s.etiqueta}>Precios</span>
          <h2 className={s.h2}>Un sistema. <em>Pagás una vez.</em></h2>
          <p className={`${s.parrafo} ${s.parrafoCentro}`}>Todo incluido en los dos planes. Probalo 48 horas gratis, sin tarjeta.</p>
        </div>

        <div className={s.planes}>
          <div className={`${s.plan} ${s.planDestacado}`}>
            <span className={s.planSello}>Recomendado</span>
            <p className={s.planNombre}>Licencia de por vida</p>
            <p className={s.planPrecio}>{usd(PRECIO_LIFETIME_USD)}<small>una sola vez</small></p>
            <p className={s.planNota}>Es tuyo para siempre. Sin cuotas mensuales que se acumulan.</p>
            <ul className={s.planLista}>
              {INCLUYE.map(t => <li key={t}><Check size={17} strokeWidth={3} />{t}</li>)}
            </ul>
            <div className={s.planAcciones}>
              <Link href={REGISTRO} className={`${s.btn} ${s.btnPrincipal}`} onClick={alProbar}>
                Probar gratis <ArrowRight size={17} className={s.flecha} />
              </Link>
              <a href={linkWhatsApp('lifetime')} className={`${s.linkVerde} ${s.planSecundario}`} target="_blank" rel="noopener noreferrer" onClick={alEscribir}>
                Quiero la licencia →
              </a>
            </div>
          </div>

          <div className={s.plan}>
            <p className={s.planNombre}>Mensual</p>
            <p className={s.planPrecio}>{money(PRECIO_MENSUAL)}<small>por mes</small></p>
            <p className={s.planNota}>Sin permanencia. Te das de baja cuando querés y te llevás tus datos.</p>
            <ul className={s.planLista}>
              {INCLUYE.slice(0, 5).map(t => <li key={t}><Check size={17} strokeWidth={3} />{t}</li>)}
            </ul>
            <div className={s.planAcciones}>
              <Link href={REGISTRO} className={`${s.btn} ${s.btnVidrio}`} onClick={alProbar}>Probar gratis</Link>
              <a href={linkWhatsApp('mensual')} className={`${s.linkVerde} ${s.planSecundario}`} target="_blank" rel="noopener noreferrer" onClick={alEscribir}>
                Consultar →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
