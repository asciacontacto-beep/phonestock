"use client"
import { useState } from 'react'
import Link from 'next/link'
import { Plus, ArrowRight, MessageCircle } from 'lucide-react'
import s from '../landing.module.css'
import { REGISTRO, alProbar, alEscribir } from '../acciones'
import { PRECIO_MENSUAL, PRECIO_LIFETIME_USD, money, usd, linkWhatsApp } from '../precios'

const PREGUNTAS = [
  {
    q: '¿Y si dejo de pagar, pierdo todo?',
    a: 'No. Tus datos son tuyos y no se borran nunca. Si una suscripción se vence tenés diez días de gracia trabajando normal, y después la cuenta queda en sólo lectura: seguís viendo y descargando todo tu inventario, ventas, clientes y caja. Cuando renovás, seguís donde quedaste.',
  },
  {
    q: '¿Puedo llevarme mi información cuando quiera?',
    a: 'Sí, y sin pedir permiso. Desde Ajustes bajás un respaldo completo del negocio en un archivo que abrís con Excel: inventario, ventas, cuenta corriente, mayoristas, reparaciones, turnos, caja y gastos.',
  },
  {
    q: '¿Qué diferencia hay entre la licencia y el mensual?',
    a: `El sistema es exactamente el mismo, con todo incluido en los dos. Cambia cómo lo pagás: ${usd(PRECIO_LIFETIME_USD)} una sola vez y es tuyo para siempre, con las actualizaciones incluidas, o ${money(PRECIO_MENSUAL)} por mes sin permanencia.`,
  },
  {
    q: '¿Sirve si tengo más de un local?',
    a: 'Sí, y sin costo extra por sucursal. Un depósito por local, vendedores asignados a cada uno, transferencias de stock entre ellos y gastos separados. Todo se ve desde el mismo panel.',
  },
  {
    q: '¿Cuánto tardo en tenerlo andando?',
    a: 'Una tarde. Cargás el inventario escaneando el código de barras o escribiendo marca, modelo y precio, y ya podés vender. No hay implementación ni consultor: entrás y usás.',
  },
  {
    q: '¿Quién me ayuda si algo falla?',
    a: 'Nosotros, por WhatsApp, el mismo día. No hay mesa de ayuda ni tickets. Si algo rompe tu operación, se arregla ese día.',
  },
]

export function Preguntas() {
  const [abierta, setAbierta] = useState<number | null>(0)

  return (
    <>
      <section className={`${s.seccion} ${s.seccionBlanca}`} id="preguntas">
        <div className={s.ancho}>
          <div className={s.centro}>
            <span className={s.etiqueta}>Preguntas frecuentes</span>
            <h2 className={s.h2}>Lo que todos preguntan <em>antes de entrar.</em></h2>
          </div>
          <div className={s.preguntas}>
            {PREGUNTAS.map((p, i) => {
              const abiertaEsta = abierta === i
              return (
                <div key={p.q} className={`${s.pregunta} ${abiertaEsta ? s.preguntaAbierta : ''}`}>
                  <button
                    id={`pregunta-${i}`}
                    className={s.preguntaBoton}
                    onClick={() => setAbierta(abiertaEsta ? null : i)}
                    aria-expanded={abiertaEsta}
                    aria-controls={`respuesta-${i}`}
                  >
                    {p.q}
                    <Plus size={22} className={s.preguntaMas} aria-hidden />
                  </button>
                  <div className={s.respuesta} id={`respuesta-${i}`} role="region" aria-labelledby={`pregunta-${i}`}>
                    <div><p>{p.a}</p></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className={`${s.cierre} ${s.seccionBlanca}`}>
        <div className={s.ancho}>
          <div className={s.cierreCaja}>
            <div className={s.malla} aria-hidden />
            <h2 className={s.h2}>Entrá hoy. Esta noche cerrás la caja <em>en orden.</em></h2>
            <p className={s.parrafo}>48 horas gratis, sin tarjeta. Si te sirve, elegís cómo pagarlo.</p>
            <div className={s.ctas}>
              <Link href={REGISTRO} className={`${s.btn} ${s.btnPrincipal}`} onClick={alProbar}>
                Probar gratis <ArrowRight size={17} className={s.flecha} />
              </Link>
              <a href={linkWhatsApp('mensual')} className={`${s.btn} ${s.btnVidrio}`} target="_blank" rel="noopener noreferrer" onClick={alEscribir}>
                <MessageCircle size={17} /> Escribinos
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className={s.pie}>
        <div className={s.ancho}>
          <div className={s.pieGrid}>
            <div className={s.pieMarca}>
              <a href="#top" className={s.marca} translate="no">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-marca.png" alt="" width={24} height={24} className={s.marcaLogo} />Stackr
              </a>
              <p>El sistema de gestión para locales de celulares y servicio técnico.</p>
              <a href={linkWhatsApp('mensual')} className={s.linkVerde} target="_blank" rel="noopener noreferrer" onClick={alEscribir}>
                ¿Consultas? Escribinos →
              </a>
            </div>
            <div>
              <p className={s.pieTitulo}>Producto</p>
              <ul className={s.pieLista}>
                <li><a href="#funciones">Funciones</a></li>
                <li><a href="#sucursales">Sucursales</a></li>
                <li><a href="#sistema">El sistema</a></li>
                <li><a href="#precios">Precios</a></li>
              </ul>
            </div>
            <div>
              <p className={s.pieTitulo}>Ayuda</p>
              <ul className={s.pieLista}>
                <li><a href="#preguntas">Preguntas frecuentes</a></li>
                <li><a href={linkWhatsApp('mensual')} target="_blank" rel="noopener noreferrer" onClick={alEscribir}>¿Consultas? Escribinos</a></li>
              </ul>
            </div>
            <div>
              <p className={s.pieTitulo}>Legal</p>
              <ul className={s.pieLista}>
                <li><Link href="/privacidad">Privacidad</Link></li>
                <li><Link href="/terminos">Términos</Link></li>
              </ul>
            </div>
            <div>
              <p className={s.pieTitulo}>Cuenta</p>
              <ul className={s.pieLista}>
                <li><Link href="/login">Ingresar</Link></li>
                <li><Link href={REGISTRO} onClick={alProbar}>Probar gratis</Link></li>
              </ul>
            </div>
          </div>
          <div className={s.pieBase}>
            <span>© 2026 Stackr · Hecho en Argentina</span>
            <span>Soporte por WhatsApp, el mismo día</span>
          </div>
        </div>
      </footer>
    </>
  )
}
