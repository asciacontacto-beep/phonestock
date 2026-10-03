"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { pestanaDe, seccionDe } from '@/utils/secciones'

/**
 * Las pestañas de la sección: Equipos / Accesorios / Depósitos, Cajas /
 * Gastos, etc. Cada pestaña es su propia dirección, así que el botón atrás
 * del navegador y los enlaces guardados siguen andando.
 */
export function SectionTabs() {
  const pathname = usePathname()
  const seccion = seccionDe(pathname)
  if (!seccion) return null
  const actual = pestanaDe(pathname)

  return (
    <nav className={`sec-tabs sec-de-${seccion.menu} no-print`} aria-label="Pestañas de la sección">
      {seccion.pestanas.map(p => (
        <Link
          key={p.id}
          href={`/${p.id}`}
          prefetch
          className={`sec-tab ${p.id === actual ? 'on' : ''}`}
          aria-current={p.id === actual ? 'page' : undefined}
        >
          {p.label}
        </Link>
      ))}
    </nav>
  )
}
