"use client"
import s from './landing.module.css'
import { MetaPixel } from '@/components/MetaPixel'
import { Barra } from './secciones/Barra'
import { Portada } from './secciones/Portada'
import { MarcasYFrase } from './secciones/MarcasYFrase'
import { Bento } from './secciones/Bento'
import { Vidriera } from './secciones/Vidriera'
import { Pasos } from './secciones/Pasos'
import { Precio } from './secciones/Precio'
import { Preguntas } from './secciones/Preguntas'
import { BarraMovil } from './secciones/BarraMovil'

/**
 * La landing de Stackr (26/9/2026): estilo Apple, base clara, acento verde.
 * Cada sección vive en `secciones/`; acá sólo se ordenan.
 * Spec: docs/superpowers/specs/2026-09-26-landing-stackr-design.md
 */
export default function LandingPage() {
  return (
    <div className={s.root}>
      <MetaPixel />
      <a href="#contenido" className={s.saltar}>Saltar al contenido</a>
      <Barra />
      <main id="contenido">
        <Portada />
        <MarcasYFrase />
        <Bento />
        <Vidriera />
        <Pasos />
        <Precio />
        <Preguntas />
      </main>
      <BarraMovil />
    </div>
  )
}
