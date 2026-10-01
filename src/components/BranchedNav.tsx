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
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
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

const PAD = 4;
const FILA = 34;
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
  // Lo que el usuario abrió o cerró a mano. Lo que no tocó: abierta sólo la
  // sección de la pantalla actual. Así al navegar se abre sola la nueva sin
  // un efecto que pise lo que eligió.
  const [tocadas, setTocadas] = useState<Record<number, boolean>>({});
  // Con una sola sección (vendedor), siempre arranca abierta.
  const abierta = (i: number) => tocadas[i] ?? (i === seccionActiva || items.length === 1);

  const navRef = useRef<HTMLElement>(null);
  const cabezas = useRef<(HTMLElement | null)[]>([]);
  const marcaRef = useRef<HTMLSpanElement>(null);

  const hojaActiva = items.findIndex(it => !it.hijos && it.id === activo);
  const marcada = seccionActiva >= 0 && abierta(seccionActiva) ? seccionActiva : hojaActiva;

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
  }, [marcada, items]);

  const r = Math.min(RADIO, FILA / 2 - 2);
  const finX = SANGRIA - 8;
  const filaY = (k: number) => PAD + k * FILA + FILA / 2;
  const rama = (k: number) => `M ${TRONCO} ${filaY(k) - r} A ${r} ${r} 0 0 0 ${TRONCO + r} ${filaY(k)} H ${finX}`;
  const alcance = (k: number) => `M ${TRONCO} 0 V ${filaY(k) - r} A ${r} ${r} 0 0 0 ${TRONCO + r} ${filaY(k)} H ${finX}`;
  const largo = (k: number) => filaY(k) - r + (Math.PI * r) / 2 + (finX - TRONCO - r);

  return (
    <nav ref={navRef} className="br-menu" aria-label="Menú principal">
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
        const open = abierta(i);
        const alto = PAD * 2 + hijos.length * FILA;
        return (
          <div key={it.label} className="br-seccion" data-open={open ? '' : undefined} data-actual={i === seccionActiva ? '' : undefined}>
            <button
              ref={el => { cabezas.current[i] = el; }}
              type="button"
              className="br-cabeza"
              aria-expanded={open}
              onClick={() => setTocadas(p => ({ ...p, [i]: !open }))}
            >
              {it.icon && <span className="br-icono" aria-hidden="true">{it.icon}</span>}
              <span className="br-cabeza-txt">{it.label}</span>
              <svg className="br-flecha" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 6 15 12 9 18" /></svg>
            </button>
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
                        tabIndex={open ? 0 : -1}
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
