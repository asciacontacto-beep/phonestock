/**
 * Token de sesión de corta vida para que la API actúe como un usuario.
 *
 * Todo el aislamiento entre negocios vive en la base: las políticas RLS y
 * los defaults de `org_id` leen `auth.uid()`. Firmando un JWT a nombre del
 * dueño de la clave, la base lo trata como si ese usuario estuviera
 * logueado, y aplica exactamente las mismas reglas que en la app. Nada del
 * aislamiento se reimplementa acá.
 *
 * Dura 60 segundos: alcanza para un pedido y no sirve de nada si se filtra.
 */

import { createHmac } from 'node:crypto'

const b64url = (s: string) => Buffer.from(s, 'utf8').toString('base64url')

export function firmarTokenUsuario(
  userId: string,
  secreto: string,
  ahora: number = Math.floor(Date.now() / 1000),
  duracionSeg = 60,
): string {
  if (!userId) throw new Error('Falta el usuario para firmar el token')
  if (!secreto) throw new Error('Falta SUPABASE_JWT_SECRET')

  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    sub: userId,
    role: 'authenticated',
    aud: 'authenticated',
    iat: ahora,
    exp: ahora + duracionSeg,
  }
  const cuerpo = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const firma = createHmac('sha256', secreto).update(cuerpo).digest('base64url')
  return `${cuerpo}.${firma}`
}
