"use client"
import s from './landing.module.css'
import { MetaPixel } from '@/components/MetaPixel'
import { Barra } from './secciones/Barra'
import { Portada } from './secciones/Portada'
import { Marcas } from './secciones/Marcas'
import { Funciones } from './secciones/Funciones'
import { Sistema } from './secciones/Sistema'
import { Sucursales } from './secciones/Sucursales'
import { Vidriera } from './secciones/Vidriera'
import { Pasos } from './secciones/Pasos'
import { Precios } from './secciones/Precios'
import { Preguntas } from './secciones/Preguntas'
import { BarraMovil } from './secciones/BarraMovil'

/**
 * La landing de Stackr, estilo "fintech moderna": blanco azulado, tinta azul
 * marino y un degradado esmeralda → cian → violeta. Cada sección vive en
 * `secciones/`; acá sólo se ordenan.
 */
export default function LandingPage() {
  return (
    <div className={s.root}>
      <MetaPixel />
      <a href="#contenido" className={s.saltar}>Saltar al contenido</a>
      <Barra />
      <main id="contenido">
        <Portada />
        <Marcas />
        <Funciones />
        <Sistema />
        <Sucursales />
        <Vidriera />
        <Pasos />
        <Precios />
        <Preguntas />
      </main>
      <BarraMovil />
    </div>
  )
}
