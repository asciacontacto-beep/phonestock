"use client"
/**
 * Menú lateral: todas las secciones abiertas, cada una con su número y sus
 * pantallas.
 *
 * Dos resaltados que se deslizan en vez de aparecer: uno marca la pantalla
 * en la que estás y viaja hasta la nueva al navegar; el otro, más tenue,
 * sigue al mouse. Los renglones toman el alto que les da la barra, así el
 * menú entero entra sin scroll y sin dejar media columna vacía.
 */
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';

export interface NavHoja {
  /** Ruta sin la barra inicial. */
  id: string
  label: string
  icon?: ReactNode
}

export interface NavSeccion {
  label: string
  hijos: NavHoja[]
}

/* Alto de cada renglón según la barra, entre estos dos. */
const FILA_MIN = 22;
const FILA_MAX = 38;
/* El título de sección, más bajo que una pantalla. */
const TITULO = 0.78;
/* Separación arriba de cada sección (menos la primera), proporcional. */
const ENTRE = 0.32;
const entre = (f: number) => Math.round(f * ENTRE);

interface Caja { top: number; height: number }

export function SideNav({ secciones, activo, onNavigate }: {
  secciones: NavSeccion[]
  /** La ruta marcada (ver utils/secciones.ts). */
  activo: string
  onNavigate?: () => void
}) {
  const navRef = useRef<HTMLElement>(null);
  const items = useRef(new Map<string, HTMLAnchorElement>());
  const [fila, setFila] = useState(32);
  const [marca, setMarca] = useState<Caja | null>(null);
  const [hover, setHover] = useState<Caja | null>(null);

  const titulos = secciones.length;
  const hojas = secciones.reduce((n, s) => n + s.hijos.length, 0);

  // Reparte el alto libre entre títulos y pantallas.
  useLayoutEffect(() => {
    const cont = navRef.current?.parentElement;
    if (!cont) return;
    const medir = () => {
      const st = getComputedStyle(cont);
      const libre = cont.clientHeight - parseFloat(st.paddingTop) - parseFloat(st.paddingBottom) - 8;
      const alto = (f: number) => titulos * Math.round(f * TITULO) + (titulos - 1) * entre(f) + hojas * f;
      let f = FILA_MAX;
      while (f > FILA_MIN && alto(f) > libre) f--;
      setFila(f);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(cont);
    return () => ro.disconnect();
  }, [titulos, hojas]);

  // El resaltado va a la pantalla activa; se vuelve a medir si cambia el alto.
  useLayoutEffect(() => {
    const ubicar = () => {
      const el = items.current.get(activo);
      setMarca(el ? { top: el.offsetTop, height: el.offsetHeight } : null);
    };
    ubicar();
    const ro = new ResizeObserver(ubicar);
    if (navRef.current) ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [activo, fila, secciones]);

  let i = 0; // orden de entrada, para la animación escalonada

  return (
    <nav
      ref={navRef}
      className="sn"
      aria-label="Menú principal"
      onMouseLeave={() => setHover(null)}
      style={{ '--sn-fila': `${fila}px`, '--sn-titulo': `${Math.round(fila * TITULO)}px`, '--sn-entre': `${entre(fila)}px` } as CSSProperties}
    >
      <span
        className="sn-hover"
        aria-hidden="true"
        style={hover ? { transform: `translateY(${hover.top}px)`, height: hover.height, opacity: 1 } : { opacity: 0 }}
      />
      <span
        className="sn-marca"
        aria-hidden="true"
        data-on={marca ? '' : undefined}
        style={marca ? { transform: `translateY(${marca.top}px)`, height: marca.height } : undefined}
      />
      {secciones.map((s, n) => {
        const actual = s.hijos.some(h => h.id === activo);
        return (
          <div key={s.label} className="sn-seccion" data-actual={actual ? '' : undefined}>
            <div className="sn-titulo" style={{ '--i': i++ } as CSSProperties}>
              <span className="sn-num">{String(n + 1).padStart(2, '0')}</span>
              <span className="sn-titulo-txt">{s.label}</span>
              <span className="sn-regla" aria-hidden="true" />
            </div>
            {s.hijos.map(h => {
              const on = h.id === activo;
              return (
                <Link
                  key={h.id}
                  ref={el => { if (el) items.current.set(h.id, el); else items.current.delete(h.id); }}
                  href={`/${h.id}`}
                  prefetch
                  className="sn-item"
                  data-active={on ? '' : undefined}
                  aria-current={on ? 'page' : undefined}
                  style={{ '--i': i++ } as CSSProperties}
                  onMouseEnter={e => setHover({ top: e.currentTarget.offsetTop, height: e.currentTarget.offsetHeight })}
                  onFocus={e => setHover({ top: e.currentTarget.offsetTop, height: e.currentTarget.offsetHeight })}
                  onClick={onNavigate}
                >
                  {h.icon && <span className="sn-icono" aria-hidden="true">{h.icon}</span>}
                  <span className="sn-label">{h.label}</span>
                  <span className="sn-punto" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
