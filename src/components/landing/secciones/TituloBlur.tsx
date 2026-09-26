"use client"
import s from '../landing.module.css'
import BlurText from '../reactbits/BlurText'
import { useMenosMovimiento } from '../preferencias'

/* Título de sección que entra desenfocado (React Bits · BlurText).
   BlurText dibuja un <p>, que no puede ir dentro de un <h2>: el <h2> real
   queda para lectores de pantalla y buscadores, y el animado se oculta de
   ellos. Con "reducir movimiento", sólo el <h2> común. */
export function TituloBlur({ texto, id }: { texto: string; id?: string }) {
  const quieto = useMenosMovimiento()

  if (quieto) return <h2 id={id} className={`${s.h2} ${s.h2Centro}`}>{texto}</h2>

  return (
    <>
      <h2 id={id} className={s.soloLectores}>{texto}</h2>
      <div aria-hidden>
        <BlurText text={texto} delay={90} animateBy="words" direction="top" className={`${s.h2} ${s.h2Blur}`} />
      </div>
    </>
  )
}
