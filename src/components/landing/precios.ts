/**
 * Los precios, en un solo lugar.
 *
 * Están acá y no sueltos en el JSX porque el precio aparece en cuatro
 * lugares de la página y en el mensaje de WhatsApp: con el número repetido,
 * tarde o temprano queda uno viejo y el cliente ve dos precios distintos en
 * la misma pantalla.
 */

export const PRECIO_MENSUAL = 50000

/** Licencia de por vida. Equivale a unos diez meses de suscripción. */
export const PRECIO_LIFETIME = 490000

export const WHATSAPP = '5492494000000'

export const money = (n: number) => `$${n.toLocaleString('es-AR')}`

export const mesesDeAhorro = Math.round(PRECIO_LIFETIME / PRECIO_MENSUAL)

export function linkWhatsApp(plan: 'mensual' | 'lifetime') {
  const texto = plan === 'mensual'
    ? `Hola, quiero arrancar con Stackr en el plan mensual (${money(PRECIO_MENSUAL)} por mes).`
    : `Hola, quiero la licencia de Stackr de por vida (${money(PRECIO_LIFETIME)}, un solo pago).`
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`
}
