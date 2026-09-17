/**
 * Generación de claves en el navegador del dueño.
 *
 * La clave se crea acá y nunca viaja al servidor: a la base sólo va el hash.
 * El dueño la ve una única vez para copiarla.
 */

import { PREFIJO_CLAVE } from './compartido'

function base64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function sha256Hex(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function generarClave(): Promise<{ clave: string; hash: string; prefijo: string }> {
  // 32 bytes al azar: no se puede adivinar ni enumerar.
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const clave = PREFIJO_CLAVE + base64url(bytes)
  return {
    clave,
    hash: await sha256Hex(clave),
    // Lo suficiente para reconocerla en la lista, no para usarla.
    prefijo: clave.slice(0, PREFIJO_CLAVE.length + 6),
  }
}
