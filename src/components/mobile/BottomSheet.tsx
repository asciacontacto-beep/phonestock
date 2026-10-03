"use client"
/**
 * Hoja que sube desde abajo, la pieza básica de Stackr en el celular:
 * filtros, acciones, el menú "Más", la cuenta. Se cierra tocando afuera,
 * con Escape o arrastrándola hacia abajo.
 *
 * Sólo se usa en la vista mobile; en la compu no aparece.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export function BottomSheet({
  open, onClose, title, children, footer, alto = 'auto', label,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  /** Botones fijos al pie (no se van con el scroll). */
  footer?: ReactNode
  /** 'full': ocupa casi toda la pantalla (detalle de una venta, un cliente). */
  alto?: 'auto' | 'full'
  label?: string
}) {
  const [montada, setMontada] = useState(open)
  const [entro, setEntro] = useState(false)
  const hojaRef = useRef<HTMLDivElement>(null)

  // Al abrirse se monta en el mismo render; se muestra en el cuadro
  // siguiente (para que la animación arranque desde abajo) y al cerrarse
  // se desmonta cuando terminó de bajar.
  if (open && !montada) setMontada(true)
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setEntro(true)))
      return () => cancelAnimationFrame(id)
    }
    const t = setTimeout(() => { setMontada(false); setEntro(false) }, 280)
    return () => clearTimeout(t)
  }, [open])
  const visible = open && entro

  // Mientras está abierta, la pantalla de atrás no se mueve.
  useEffect(() => {
    if (!open) return
    const main = document.querySelector<HTMLElement>('.main')
    const antes = main?.style.overflow
    if (main) main.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      if (main) main.style.overflow = antes || ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  /* Arrastre para cerrar, como en iOS: desde el agarre, el título o el
     contenido (si ya está arriba de todo). La hoja sigue al dedo y el fondo
     se aclara; se cierra si bajó bastante o si el gesto fue rápido. Con
     escuchas nativos, para poder frenar el scroll mientras se arrastra. */
  useEffect(() => {
    const hoja = hojaRef.current
    if (!montada || !hoja) return
    const capa = hoja.parentElement as HTMLElement | null
    const cuerpo = hoja.querySelector<HTMLElement>('.ms-cuerpo')
    let y0 = 0, t0 = 0, dy = 0, activo = false, posible = false

    const inicio = (e: TouchEvent) => {
      const desdeCuerpo = cuerpo?.contains(e.target as Node)
      posible = !desdeCuerpo || (cuerpo?.scrollTop ?? 0) <= 0
      activo = false; dy = 0
      y0 = e.touches[0].clientY; t0 = performance.now()
    }
    const mover = (e: TouchEvent) => {
      if (!posible) return
      const d = e.touches[0].clientY - y0
      if (!activo) {
        if (d <= 4) { if (d < -4) posible = false; return }
        activo = true
        hoja.style.transition = 'none'
        if (capa) capa.style.transition = 'none'
      }
      e.preventDefault()
      dy = Math.max(0, d)
      hoja.style.transform = `translate3d(0, ${dy}px, 0)`
      if (capa) capa.style.background = `rgba(10, 10, 12, ${0.36 * Math.max(0, 1 - dy / hoja.offsetHeight)})`
    }
    const fin = () => {
      if (!activo) return
      activo = false
      const velocidad = dy / Math.max(1, performance.now() - t0)
      hoja.style.transition = ''; hoja.style.transform = ''
      if (capa) { capa.style.transition = ''; capa.style.background = '' }
      if (dy > Math.min(140, hoja.offsetHeight * 0.3) || velocidad > 0.55) onClose()
    }
    hoja.addEventListener('touchstart', inicio, { passive: true })
    hoja.addEventListener('touchmove', mover, { passive: false })
    hoja.addEventListener('touchend', fin)
    hoja.addEventListener('touchcancel', fin)
    return () => {
      hoja.removeEventListener('touchstart', inicio)
      hoja.removeEventListener('touchmove', mover)
      hoja.removeEventListener('touchend', fin)
      hoja.removeEventListener('touchcancel', fin)
    }
  }, [montada, onClose])

  if (!montada || typeof document === 'undefined') return null

  return createPortal(
    <div className={`ms-capa ${visible ? 'on' : ''}`} onClick={onClose}>
      <div
        ref={hojaRef}
        className={`ms-hoja ${alto === 'full' ? 'full' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={label || (typeof title === 'string' ? title : undefined)}
        onClick={e => e.stopPropagation()}
      >
        <div className="ms-agarre">
          <span />
        </div>
        {title && (
          <div className="ms-cab">
            <div className="ms-titulo">{title}</div>
            <button className="ms-cerrar" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
          </div>
        )}
        <div className="ms-cuerpo">{children}</div>
        {footer && <div className="ms-pie">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
