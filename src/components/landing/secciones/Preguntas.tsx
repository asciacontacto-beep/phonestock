"use client"
import { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import s from '../landing.module.css'
import { REGISTRO, alProbar } from '../acciones'
import { PRECIO_MENSUAL, PRECIO_LIFETIME_USD, money, usd } from '../precios'

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
    a: 'Yo, por WhatsApp, el mismo día. No hay mesa de ayuda ni tickets. Si algo rompe tu operación, lo arreglo ese día.',
  },
]

export function Preguntas() {
  const [abierta, setAbierta] = useState<number | null>(0)

  return (
    <>
      <section className={`${s.seccion} ${s.seccionAlterna}`} id="preguntas">
        <div className={s.ancho}>
          <h2 className={`${s.h2} ${s.h2Centro}`}>Preguntas frecuentes.</h2>
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

      <section className={s.cierre}>
        <div className={s.ancho}>
          <h2 className={`${s.h2} ${s.h2Centro}`}>Entrá hoy.<br />Esta noche cerrás la caja <em>en orden.</em></h2>
          <div className={s.ctas} style={{ animation: 'none' }}>
            <Link href={REGISTRO} className={s.btnVerde} onClick={alProbar}>Probar gratis</Link>
          </div>
          <p className={s.nota} style={{ animation: 'none' }}>48 horas gratis · sin tarjeta</p>
        </div>
      </section>

      <footer className={s.pie}>
        <div className={s.ancho}>
          <span>Stackr · Hecho en Argentina</span>
          <span className={s.pieLinks}>
            <a href="#precio">Precio</a>
            <a href="#preguntas">Preguntas</a>
            <Link href="/login">Entrar</Link>
          </span>
        </div>
      </footer>
    </>
  )
}
