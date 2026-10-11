"use client"
import { useSyncExternalStore } from 'react'
import type { Deposito, Local } from '@/utils/locales'

const CLAVE = 'stackr:local'
const EVENTO = 'stackr:local'

const leer = () => { try { return localStorage.getItem(CLAVE) || 'general' } catch { return 'general' } }
const enServidor = () => 'general'
function suscribir(avisar: () => void) {
  window.addEventListener('storage', avisar)
  window.addEventListener(EVENTO, avisar)
  return () => { window.removeEventListener('storage', avisar); window.removeEventListener(EVENTO, avisar) }
}

/**
 * El local del que se ven los números, el mismo en Inicio, Rentabilidad, Mes
 * a mes y Análisis, y recordado al volver a entrar. Antes había que elegirlo
 * en cada pantalla.
 */
export function useLocal(depositos: Deposito[]): [Local, (l: Local) => void] {
  const guardado = useSyncExternalStore(suscribir, leer, enServidor)
  // Un local borrado (o de otro negocio en esta compu) vuelve a la vista general.
  const valido = guardado === 'general' || depositos.some(d => String(d.id) === guardado) ? guardado : 'general'
  const elegir = (l: Local) => {
    try { localStorage.setItem(CLAVE, l) } catch { /* modo privado: vale sólo esta pantalla */ }
    window.dispatchEvent(new Event(EVENTO))
  }
  return [valido, elegir]
}
