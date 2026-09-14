"use client";

/**
 * Selector de modelo con búsqueda por texto.
 *
 * Antes era un `<select>` con una lista fija: si el modelo no estaba —un
 * Moto G15, un A16, un S26 Ultra— no había forma de cargarlo, y con una
 * lista de 400 modelos buscar a mano sería peor todavía.
 *
 * Dos decisiones:
 *  1. Se escribe para filtrar, en vez de scrollear.
 *  2. **Acepta cualquier texto.** Si el modelo no figura en el catálogo, se
 *     escribe y se guarda igual. Salen equipos nuevos todos los meses; una
 *     lista cerrada siempre va a ir atrás y no puede frenar una carga.
 *
 * Es un único `<input>` en los dos estados, y el chevron es una imagen de
 * fondo. La primera versión usaba un `<button>` como contenedor flex más un
 * icono en posición absoluta: en Safari el botón envuelve su contenido en
 * una caja anónima y se come `justify-content`, así que el texto quedaba
 * centrado y el chevron suelto abajo. Sin botón y sin posicionado absoluto
 * no queda nada que un navegador pueda resolver distinto.
 */

import React, { useState, useRef, useEffect, useMemo } from "react";

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
 * más "Galaxy A16" que un nombre largo que lo contenga en el medio.
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

  const filtrados = useMemo(() => filtrarModelos(options, busqueda), [busqueda, options]);

  const textoLibre = busqueda.trim();
  const esNuevo =
    textoLibre.length > 0 &&
    !options.some(o => normalizar(o) === normalizar(textoLibre));

  /**
   * Al salir sin elegir se conserva lo que ya estaba. Sólo se toma el texto
   * escrito si coincide exacto con un modelo: dejar que una búsqueda a
   * medias —"a1"— quede guardada como modelo sería peor que no guardar nada.
   * Para un modelo que no está en la lista está la opción «Usar …».
   */
  const cerrar = () => {
    const exacto = options.find(o => normalizar(o) === normalizar(textoLibre));
    if (exacto) onChange(exacto);
    setAbierto(false);
    setBusqueda("");
  };

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) cerrar();
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, busqueda, options]);

  const abrir = () => {
    setBusqueda("");
    setResaltado(0);
    setAbierto(true);
    requestAnimationFrame(() => {
      // El modal de carga tiene su propio scroll: sin esto, abrir el campo
      // cerca del pie deja la lista fuera de la vista.
      wrap.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  };

  const elegir = (v: string) => {
    onChange(v);
    setAbierto(false);
    setBusqueda("");
    input.current?.blur();
  };

  const teclas = (e: React.KeyboardEvent) => {
    const ultimo = filtrados.length - 1 + (esNuevo ? 1 : 0);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!abierto) { abrir(); return; }
      setResaltado(i => Math.min(i + 1, ultimo));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setResaltado(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (esNuevo && resaltado === filtrados.length) elegir(textoLibre);
      else if (filtrados[resaltado]) elegir(filtrados[resaltado]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cerrar();
    }
  };

  return (
    <div className="acc-search-wrap mp-wrap" ref={wrap}>
      <input
        id={id}
        ref={input}
        className={`inp mp-input ${abierto ? "mp-abierto" : ""}`}
        value={abierto ? busqueda : value}
        onFocus={abrir}
        onChange={e => { setBusqueda(e.target.value); setResaltado(0); }}
        onKeyDown={teclas}
        placeholder={abierto ? "Buscá o escribí el modelo…" : (placeholder || "Elegí o escribí el modelo")}
        autoComplete="off"
        role="combobox"
        aria-expanded={abierto}
      />

      {abierto && (
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
            <div className="acc-option">
              <span className="acc-option-name">Escribí el modelo para usarlo</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
