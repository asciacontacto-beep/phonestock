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
  const arrastre = useRef<{ y0: number; dy: number } | null>(null)

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

  if (!montada || typeof document === 'undefined') return null

  const empezar = (y: number) => { arrastre.current = { y0: y, dy: 0 } }
  const mover = (y: number) => {
    const a = arrastre.current
    if (!a || !hojaRef.current) return
    a.dy = Math.max(0, y - a.y0)
    hojaRef.current.style.transition = 'none'
    hojaRef.current.style.transform = `translateY(${a.dy}px)`
  }
  const soltar = () => {
    const a = arrastre.current
    arrastre.current = null
    if (!hojaRef.current) return
    hojaRef.current.style.transition = ''
    hojaRef.current.style.transform = ''
    if (a && a.dy > 90) onClose()
  }

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
        <div
          className="ms-agarre"
          onTouchStart={e => empezar(e.touches[0].clientY)}
          onTouchMove={e => mover(e.touches[0].clientY)}
          onTouchEnd={soltar}
        >
          <span />
        </div>
        {title && (
          <div
            className="ms-cab"
            onTouchStart={e => empezar(e.touches[0].clientY)}
            onTouchMove={e => mover(e.touches[0].clientY)}
            onTouchEnd={soltar}
          >
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
