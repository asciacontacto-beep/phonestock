"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import s from '../landing.module.css'
import { REGISTRO, alProbar } from '../acciones'

export const SECCIONES = [
  { href: '#funciones', texto: 'Funciones' },
  { href: '#sucursales', texto: 'Sucursales' },
  { href: '#sistema', texto: 'El sistema' },
  { href: '#precios', texto: 'Precios' },
  { href: '#preguntas', texto: 'Preguntas' },
]

/* Barra flotante de vidrio. En el celular sólo marca y botones: las
   secciones están todas en el pie. */
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
      <div className={s.barraDentro}>
        <a href="#top" className={s.marca} translate="no">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-marca.png" alt="" width={24} height={24} className={s.marcaLogo} />Stackr
        </a>
        <div className={s.barraLinks}>
          {SECCIONES.map(l => <a key={l.href} href={l.href} className={s.barraLink}>{l.texto}</a>)}
        </div>
        <div className={s.barraAcciones}>
          <Link href="/login" className={s.barraIngresar}>Ingresar</Link>
          <Link href={REGISTRO} className={`${s.btn} ${s.btnOscuro} ${s.barraCta}`} onClick={alProbar}>Probar gratis</Link>
        </div>
      </div>
    </nav>
  )
}
