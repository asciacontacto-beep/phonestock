"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import s from '../landing.module.css'
import { REGISTRO, alProbar, alEscribir } from '../acciones'
import { linkWhatsApp } from '../precios'

/* En el celular, pasada la portada, el botón queda fijo abajo: el que viene
   de un anuncio decide scrolleando, no volviendo arriba. */
export function BarraMovil() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const alScroll = () => setVisible(window.scrollY > 700)
    window.addEventListener('scroll', alScroll, { passive: true })
    return () => window.removeEventListener('scroll', alScroll)
  }, [])

  return (
    <div className={`${s.barraMovil} ${visible ? s.barraMovilVisible : ''}`} aria-hidden={!visible}>
      <Link href={REGISTRO} className={`${s.btn} ${s.btnPrincipal} ${s.barraMovilCta}`} onClick={alProbar} tabIndex={visible ? 0 : -1}>
        Probar gratis
      </Link>
      <a href={linkWhatsApp('mensual')} className={s.barraMovilWa} target="_blank" rel="noopener noreferrer"
        onClick={alEscribir} aria-label="Consultar por WhatsApp" tabIndex={visible ? 0 : -1}>
        <MessageCircle size={20} />
      </a>
    </div>
  )
}
