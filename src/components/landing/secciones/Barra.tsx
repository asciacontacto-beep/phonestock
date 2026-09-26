"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import s from '../landing.module.css'
import { REGISTRO, alProbar } from '../acciones'

/* Fina y esmerilada como la de apple.com. La marca va escrita, sin cajita:
   así se decidió el 19/9 ("una marca premium no necesita un botón
   alrededor de su inicial"). */
export function Barra() {
  const [bajo, setBajo] = useState(false)

  useEffect(() => {
    const alScroll = () => setBajo(window.scrollY > 10)
    alScroll()
    window.addEventListener('scroll', alScroll, { passive: true })
    return () => window.removeEventListener('scroll', alScroll)
  }, [])

  return (
    <nav className={`${s.barra} ${bajo ? s.barraScroll : ''}`} aria-label="Principal">
      <div className={`${s.ancho} ${s.barraDentro}`}>
        <a href="#top" className={s.marca} translate="no">Stackr</a>
        <div className={s.barraLinks}>
          <a href="#sistema" className={s.barraLink}>Sistema</a>
          <a href="#catalogo" className={s.barraLink}>Catálogo</a>
          <a href="#precio" className={s.barraLink}>Precio</a>
          <a href="#preguntas" className={s.barraLink}>Preguntas</a>
        </div>
        <div className={s.barraAcciones}>
          <Link href="/login" className={s.barraEntrar}>Entrar</Link>
          <Link href={REGISTRO} className={s.barraCta} onClick={alProbar}>Probar gratis</Link>
        </div>
      </div>
    </nav>
  )
}
