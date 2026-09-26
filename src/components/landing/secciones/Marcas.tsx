"use client"
import s from '../landing.module.css'
import LogoLoop from '../reactbits/LogoLoop'
import { useMenosMovimiento } from '../preferencias'

/* Nombres en texto y no logos (los logos son marcas registradas): alcanza
   para que el dueño del local piense "esto es para mí". */
const MARCAS = ['Apple', 'Samsung', 'Motorola', 'Xiaomi', 'Google Pixel', 'Huawei', 'Honor', 'iPhone 18 Pro']

export function Marcas() {
  const quieto = useMenosMovimiento()
  return (
    <section className={s.marcas} aria-label="Marcas con las que trabaja">
      <p className={s.marcasTitulo}>Hecho para locales que venden</p>
      <LogoLoop
        logos={MARCAS.map(m => ({ node: <span className={s.marcaItem}>{m}</span>, title: m }))}
        speed={quieto ? 0 : 45}
        direction="left"
        logoHeight={34}
        gap={64}
        fadeOut
        fadeOutColor="#ffffff"
        ariaLabel="Marcas de celulares"
      />
    </section>
  )
}
