"use client"
import { Check } from 'lucide-react'
import s from '../landing.module.css'
import CardSwap, { Card } from '../reactbits/CardSwap'
import { useMenosMovimiento } from '../preferencias'
import { REGISTRO, alProbar } from '../acciones'

/* El diferencial: ningún competidor muestra una vidriera. Las fichas son las
   del catálogo público real y pasan una detrás de otra como un mazo. */
const FICHAS = [
  { modelo: 'iPhone 15 Pro', detalle: '256GB · Titanio natural · Usado', precio: 'U$ 980', fondo: 'linear-gradient(150deg, #d9d6cf, #a8a39a)' },
  { modelo: 'Galaxy S24', detalle: '256GB · Negro · Nuevo', precio: 'U$ 780', fondo: 'linear-gradient(150deg, #4a4d55, #1d1f24)' },
  { modelo: 'iPhone 14', detalle: '128GB · Azul · Usado', precio: 'U$ 610', fondo: 'linear-gradient(150deg, #b9cde3, #7d9bbd)' },
]

function Silueta() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.2" aria-hidden>
      <rect x="6" y="2" width="12" height="20" rx="3" /><path d="M11 18h2" />
    </svg>
  )
}

export function Vidriera() {
  const quieto = useMenosMovimiento()

  return (
    <section className={s.seccion} id="catalogo">
      <div className={`${s.ancho} ${s.dosColumnas}`}>
        <div>
          <span className={s.etiqueta}>Catálogo online</span>
          <h2 className={s.h2}>Tu vidriera, en la bio de <em>Instagram.</em></h2>
          <p className={s.parrafo}>
            Elegís los equipos, subís las fotos y compartís un link. El cliente ve precio y estado,
            y te escribe por WhatsApp con el equipo ya elegido.
          </p>
          <ul className={s.checks}>
            {['Hasta 3 fotos por equipo', 'Botón de WhatsApp con el equipo elegido', 'Lo vendido desaparece solo'].map(t => (
              <li key={t}><span className={s.checkIcono}><Check size={14} strokeWidth={3} /></span>{t}</li>
            ))}
          </ul>
          <p style={{ marginTop: 28 }}><a href={REGISTRO} className={s.linkVerde} onClick={alProbar}>Armá la tuya gratis →</a></p>
        </div>

        <div className={s.mazo} aria-hidden>
          <div className={s.mazoFondo} />
          <CardSwap width={300} height={420} cardDistance={46} verticalDistance={52} delay={quieto ? 99999999 : 4200} pauseOnHover skewAmount={4}>
            {FICHAS.map(f => (
              <Card key={f.modelo} customClass={s.ficha}>
                <div className={s.fichaFoto} style={{ background: f.fondo }}>
                  <Silueta />
                  <span className={s.fichaPuntos}><i /><i /><i /></span>
                </div>
                <div className={s.fichaModelo}>{f.modelo}</div>
                <div className={s.fichaDetalle}>{f.detalle}</div>
                <div className={s.fichaPie}>
                  <span className={s.fichaPrecio}>{f.precio}</span>
                  <span className={s.fichaBoton}>Consultar</span>
                </div>
              </Card>
            ))}
          </CardSwap>
        </div>
      </div>
    </section>
  )
}
