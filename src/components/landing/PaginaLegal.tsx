import type { ReactNode } from 'react'
import Link from 'next/link'
import s from './legal.module.css'

/** Marco común de Privacidad y Términos. */
export function PaginaLegal({ titulo, actualizado, children }: { titulo: string; actualizado: string; children: ReactNode }) {
  return (
    <div className={s.pagina}>
      <nav className={s.barra}>
        <Link href="/" className={s.marca} translate="no">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-marca.png" alt="" width={24} height={24} className={s.logo} />Stackr
        </Link>
        <Link href="/" className={s.volver}>← Volver al inicio</Link>
      </nav>
      <main className={s.hoja}>
        <h1>{titulo}</h1>
        <p className={s.fecha}>Última actualización: {actualizado}</p>
        {children}
      </main>
      <footer className={s.pie}>
        <span>© 2026 Stackr · Hecho en Argentina</span>
        <span>
          <Link href="/privacidad">Privacidad</Link> · <Link href="/terminos">Términos</Link>
        </span>
      </footer>
    </div>
  )
}
