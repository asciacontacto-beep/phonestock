"use client";

/**
 * Selector de modelo con búsqueda por texto.
 *
 * Antes era un `<select>` con una lista fija: si el modelo no estaba —un
 * Moto G15, un A16, un S26 Ultra— no había forma de cargarlo, y con una
 * lista de 400 modelos buscar a mano es peor todavía.
 *
 * Dos decisiones:
 *  1. Se escribe para filtrar, en vez de scrollear.
 *  2. **Acepta cualquier texto.** Si el modelo no figura en el catálogo, se
 *     escribe y se guarda igual. Salen equipos nuevos todos los meses; una
 *     lista cerrada siempre va a ir atrás y no puede frenar una carga.
 */

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search } from "lucide-react";

/** Para que "a16" encuentre "Galaxy A16" y "moto g15" encuentre "Moto G15". */
export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Filtra por coincidencia de texto, ignorando mayúsculas, tildes y espacios.
 * Los que empiezan con lo buscado van primero: al escribir "a16" interesa
 * más "Galaxy A16" que un "Galaxy A16" escondido en otro nombre largo.
 */
export function filtrarModelos(options: string[], busqueda: string): string[] {
  const q = normalizar(busqueda);
  if (!q) return options;
  const empieza: string[] = [];
  const contiene: string[] = [];
  for (const o of options) {
    const n = normalizar(o);
    if (n.startsWith(q)) empieza.push(o);
    else if (n.includes(q)) contiene.push(o);
  }
  return [...empieza, ...contiene];
}

export type ModelPickerProps = {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  id?: string;
};

export function ModelPicker({ value, onChange, options, placeholder, id }: ModelPickerProps) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [resaltado, setResaltado] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  const filtrados = useMemo(() => filtrarModelos(options, busqueda), [busqueda, options]);

  // El texto escrito que no coincide con nada igual se puede usar.
  const textoLibre = busqueda.trim();
  const esNuevo =
    textoLibre.length > 0 &&
    !options.some(o => normalizar(o) === normalizar(textoLibre));

  const abrir = () => {
    setBusqueda("");
    setResaltado(0);
    setAbierto(true);
    requestAnimationFrame(() => {
      input.current?.focus();
      // El modal de carga tiene su propio scroll: sin esto, abrir el campo
      // cerca del pie deja la lista fuera de la vista y hay que scrollear
      // a ciegas con el teclado abierto.
      wrap.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  };

  const elegir = (v: string) => {
    onChange(v);
    setAbierto(false);
    setBusqueda("");
  };

  const teclas = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setResaltado(i => Math.min(i + 1, filtrados.length - 1 + (esNuevo ? 1 : 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setResaltado(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (esNuevo && resaltado === filtrados.length) elegir(textoLibre);
      else if (filtrados[resaltado]) elegir(filtrados[resaltado]);
      else if (textoLibre) elegir(textoLibre);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setAbierto(false);
    }
  };

  if (!abierto) {
    return (
      <button type="button" id={id} className="inp mp-trigger" onClick={abrir}>
        <span className={value ? "" : "mp-placeholder"}>
          {value || placeholder || "Elegí o escribí el modelo"}
        </span>
        <ChevronDown size={15} className="mp-chevron" />
      </button>
    );
  }

  return (
    <div className="acc-search-wrap mp-wrap" ref={wrap}>
      <span className="mp-search-icon"><Search size={14} /></span>
      <input
        ref={input}
        className="inp mp-input"
        value={busqueda}
        onChange={e => { setBusqueda(e.target.value); setResaltado(0); }}
        onKeyDown={teclas}
        placeholder="Buscá o escribí el modelo…"
        autoComplete="off"
      />
      <div className="acc-dropdown">
        {filtrados.map((o, i) => (
          <div
            key={o}
            className={`acc-option ${i === resaltado ? "mp-on" : ""}`}
            onMouseEnter={() => setResaltado(i)}
            onMouseDown={e => { e.preventDefault(); elegir(o); }}
          >
            <span className="acc-option-name">{o}</span>
            {o === value && <span className="acc-option-meta">actual</span>}
          </div>
        ))}

        {esNuevo && (
          <div
            className={`acc-option mp-nuevo ${resaltado === filtrados.length ? "mp-on" : ""}`}
            onMouseEnter={() => setResaltado(filtrados.length)}
            onMouseDown={e => { e.preventDefault(); elegir(textoLibre); }}
          >
            <span className="acc-option-name">Usar «{textoLibre}»</span>
            <span className="acc-option-meta">modelo nuevo</span>
          </div>
        )}

        {filtrados.length === 0 && !esNuevo && (
          <div className="acc-option"><span className="acc-option-name">Escribí el modelo para usarlo</span></div>
        )}
      </div>
    </div>
  );
}
