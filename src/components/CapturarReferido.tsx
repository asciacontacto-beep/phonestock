"use client"
import { useEffect } from 'react'
import { guardarReferidoDeUrl } from '@/utils/referidos'

/** Guarda el ?ref= del link de referido. No dibuja nada. Ver utils/referidos.ts. */
export function CapturarReferido() {
  useEffect(() => {
    try { guardarReferidoDeUrl(window.location.search, window.localStorage) } catch { /* navegador sin almacenamiento */ }
  }, [])
  return null
}
