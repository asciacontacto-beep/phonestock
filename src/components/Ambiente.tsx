"use client"

/**
 * El fondo de la app.
 *
 * El vidrio necesita algo detrás para distorsionar: sobre un color liso,
 * una superficie translúcida se ve igual que una opaca. Esto pone dos
 * cosas para que el desenfoque tenga de qué agarrarse —una retícula muy
 * tenue y tres manchas de color que se desplazan— y de paso saca a la
 * pantalla de la quietud total.
 *
 * El movimiento es deliberadamente lento: ciclos de 70 a 110 segundos. Si
 * se nota que algo se mueve, molesta; a esa velocidad el ojo no lo
 * registra, pero la pantalla deja de sentirse una captura.
 *
 * Nada de `mix-blend-mode` ni filtros SVG: en la landing una capa así se
 * pintaba encima de todo el contenido. Acá son degradados y `transform`,
 * que el navegador compone sin sorpresas.
 */
export function Ambiente() {
  return (
    <div className="ambiente" aria-hidden>
      <div className="ambiente-grilla" />
      <div className="ambiente-luz luz-calida" />
      <div className="ambiente-luz luz-fria" />
      <div className="ambiente-luz luz-verde" />
    </div>
  )
}
