"use client"
/**
 * Menú lateral desplegable con ramas: cada tema (Inventario, Caja…) se abre
 * y muestra sus pantallas colgando de una línea, y la rama de la pantalla
 * en la que estás se dibuja resaltada.
 *
 * Adaptado de "Branched Menu" de React Bits (https://reactbits.dev):
 * los ítems son enlaces de Next en vez de botones, la sección de la
 * pantalla actual se abre sola y los colores salen del tema de la app.
 *
 * Copyright (c) 2026 David Haz — MIT + Commons Clause License Condition v1.0.
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, and distribute the
 * Software as part of an application, website, or product, subject to the
 * following conditions: The above copyright notice and this permission
 * notice shall be included in all copies or substantial portions of the
 * Software. Commons Clause: you may use this Software, including for any
 * commercial purpose, so long as you do not sell, sublicense, or
 * redistribute the components themselves — whether alone, in a bundle, or
 * as a ported version.
 */
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';

export interface RamaHoja {
  /** Ruta sin la barra inicial. */
  id: string
  label: string
  icon?: ReactNode
}

export interface Rama {
  label: string
  /** Con hijos se despliega; sin hijos es un enlace directo (`id`). */
  id?: string
  icon?: ReactNode
  hijos?: RamaHoja[]
}

const PAD = 3;
/* El alto de cada renglón se ajusta al alto de la pantalla, entre estos
   dos, para que el menú entero entre sin scroll y sin quedar vacío. */
const FILA_MIN = 21;
/* Los títulos de sección, un poco más bajos que las pantallas. */
const TITULO = 0.85;
const FILA_MAX = 36;
/* Lo que ocupa el menú además de los renglones (márgenes de arriba y abajo). */
const MARGEN_MENU = 14;
const SANGRIA = 38;
const TRONCO = 13;
const RADIO = 9;
const MARCA = 16;

export function BranchedNav({ items, activo, onNavigate }: {
  items: Rama[]
  /** La ruta marcada (ver utils/secciones.ts). */
  activo: string
  onNavigate?: () => void
}) {
  const seccionActiva = items.findIndex(it => it.hijos?.some(h => h.id === activo));
  /* Todas las secciones van siempre abiertas: plegadas, el menú quedaba
     con siete palabras arriba y media barra vacía, y había que abrir y
     cerrar para encontrar cada pantalla. */

  const navRef = useRef<HTMLElement>(null);
  const [fila, setFila] = useState(30);

  // Renglones = cabezas de sección + pantallas. Se reparte el alto libre
  // entre todos, con un tope para que en pantallas altas no se separen de más.
  const cabezasN = items.length;
  const hojasN = items.reduce((n, it) => n + (it.hijos?.length || 0), 0);
  useLayoutEffect(() => {
    const cont = navRef.current?.parentElement;
    if (!cont) return;
    const medir = () => {
      const st = getComputedStyle(cont);
      const libre = cont.clientHeight - parseFloat(st.paddingTop) - parseFloat(st.paddingBottom) - MARGEN_MENU;
      // Lo que mide el menú con renglones de f px (los títulos se redondean).
      const alto = (f: number) => cabezasN * (Math.round(f * TITULO) + 2 + PAD * 2) + hojasN * f;
      let f = FILA_MAX;
      while (f > FILA_MIN && alto(f) > libre) f--;
      setFila(Math.max(FILA_MIN, Math.min(FILA_MAX, f)));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(cont);
    return () => ro.disconnect();
  }, [cabezasN, hojasN]);
  const FILA = fila;
  const cabezas = useRef<(HTMLElement | null)[]>([]);
  const marcaRef = useRef<HTMLSpanElement>(null);

  const hojaActiva = items.findIndex(it => !it.hijos && it.id === activo);
  const marcada = seccionActiva >= 0 ? seccionActiva : hojaActiva;

  // La marquita del tronco sigue a la sección actual. Se mide el DOM: el
  // alto de cada sección depende de cuáles estén abiertas.
  useLayoutEffect(() => {
    const ubicar = (deslizar: boolean) => {
      const m = marcaRef.current;
      const el = marcada >= 0 ? cabezas.current[marcada] : null;
      if (!m) return;
      if (!deslizar) m.style.transition = 'none';
      if (el) m.style.top = `${el.offsetTop + (el.offsetHeight - MARCA) / 2}px`;
      m.toggleAttribute('data-on', Boolean(el));
      if (!deslizar) { void m.offsetHeight; m.style.transition = ''; }
    };
    ubicar(true);
    let primera = true;
    const ro = new ResizeObserver(() => {
      if (primera) { primera = false; return; }
      ubicar(false);
    });
    if (navRef.current) ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [marcada, items, fila]);

  const r = Math.min(RADIO, FILA / 2 - 2);
  const finX = SANGRIA - 8;
  const filaY = (k: number) => PAD + k * FILA + FILA / 2;
  const rama = (k: number) => `M ${TRONCO} ${filaY(k) - r} A ${r} ${r} 0 0 0 ${TRONCO + r} ${filaY(k)} H ${finX}`;
  const alcance = (k: number) => `M ${TRONCO} 0 V ${filaY(k) - r} A ${r} ${r} 0 0 0 ${TRONCO + r} ${filaY(k)} H ${finX}`;
  const largo = (k: number) => filaY(k) - r + (Math.PI * r) / 2 + (finX - TRONCO - r);

  return (
    <nav ref={navRef} className="br-menu" aria-label="Menú principal"
      style={{ '--br-fila': `${fila}px`, '--br-titulo': `${Math.round(fila * TITULO)}px`, '--br-letra': `${fila < 27 ? 13 : 13.5}px` } as CSSProperties}>
      <span ref={marcaRef} className="br-marca" aria-hidden="true" />
      {items.map((it, i) => {
        const hijos = it.hijos;
        if (!hijos) {
          const on = it.id === activo;
          return (
            <div key={it.id} className="br-seccion">
              <Link
                ref={el => { cabezas.current[i] = el; }}
                href={`/${it.id}`}
                prefetch
                className="br-cabeza"
                data-active={on ? '' : undefined}
                aria-current={on ? 'page' : undefined}
                onClick={onNavigate}
              >
                {it.icon && <span className="br-icono" aria-hidden="true">{it.icon}</span>}
                {it.label}
              </Link>
            </div>
          );
        }
        const alto = PAD * 2 + hijos.length * FILA;
        return (
          <div key={it.label} className="br-seccion" data-open="" data-actual={i === seccionActiva ? '' : undefined}>
            <div
              ref={el => { cabezas.current[i] = el; }}
              className="br-cabeza br-titulo"
            >
              {it.icon && <span className="br-icono" aria-hidden="true">{it.icon}</span>}
              <span className="br-cabeza-txt">{it.label}</span>
            </div>
            <div className="br-cuerpo">
              <div className="br-pliegue">
                <div className="br-arbol" style={{ height: alto }}>
                  <svg className="br-lineas" width={SANGRIA} height={alto} aria-hidden="true">
                    <path className="br-base" d={`M ${TRONCO} 0 V ${filaY(hijos.length - 1) - r}`} />
                    {hijos.map((h, k) => <path key={h.id} className="br-base" d={rama(k)} />)}
                    {hijos.map((h, k) => (
                      <path
                        key={h.id}
                        className="br-alcance"
                        d={alcance(k)}
                        style={{ strokeDasharray: largo(k), strokeDashoffset: h.id === activo ? 0 : largo(k) }}
                      />
                    ))}
                  </svg>
                  {hijos.map(h => {
                    const on = h.id === activo;
                    return (
                      <Link
                        key={h.id}
                        href={`/${h.id}`}
                        prefetch
                        className="br-item"
                        data-active={on ? '' : undefined}
                        aria-current={on ? 'page' : undefined}
                        onClick={onNavigate}
                      >
                        {h.icon && <span className="br-icono" aria-hidden="true">{h.icon}</span>}
                        <span className="br-label">{h.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
