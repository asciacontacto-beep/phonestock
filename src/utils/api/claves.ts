/**
 * Claves de API del lado del servidor.
 *
 * La clave nunca se guarda. En la base queda su hash SHA-256 y un prefijo
 * para reconocerla en la lista; la clave completa se muestra una sola vez.
 * Si alguien lee la tabla, no puede usar lo que encuentra.
 */

import { createHash } from 'node:crypto'

export * from './compartido'

/** SHA-256 en hexadecimal. Tiene que coincidir con el que calcula el navegador. */
export function hashClave(clave: string): string {
  return createHash('sha256').update(clave, 'utf8').digest('hex')
}
