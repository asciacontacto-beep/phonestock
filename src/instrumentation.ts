/**
 * El servidor, en la hora de los locales.
 *
 * Vercel corre en UTC. Las pantallas se dibujan primero en el servidor y
 * después el navegador (en Argentina) las vuelve a dibujar: toda fecha u
 * hora mostrada salía distinta en los dos lados ("11:49 p. m." contra
 * "08:49 p. m."), React avisaba que no coincidían y rehacía la pantalla.
 * Además, "hoy" en el servidor terminaba a las 21:00 de Argentina.
 *
 * Node toma el cambio de TZ en caliente, así que alcanza con fijarlo al
 * arrancar. Stackr trabaja con locales argentinos (pesos, dólar blue).
 */
export function register() {
  // En Vercel/AWS ya viene TZ=":UTC": se reemplaza. Otra zona puesta a
  // propósito en el entorno se respeta.
  const tz = process.env.TZ || ''
  if (process.env.NEXT_RUNTIME === 'nodejs' && (!tz || /utc/i.test(tz))) {
    process.env.TZ = 'America/Argentina/Buenos_Aires'
  }
}
