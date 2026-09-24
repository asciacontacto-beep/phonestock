/**
 * Los precios, en un solo lugar.
 *
 * Están acá y no sueltos en el JSX porque el precio aparece en cuatro
 * lugares de la página y en el mensaje de WhatsApp: con el número repetido,
 * tarde o temprano queda uno viejo y el cliente ve dos precios distintos en
 * la misma pantalla. El otro lugar es el JSON-LD de src/app/layout.tsx.
 */

export const PRECIO_MENSUAL = 50000

/** Licencia de por vida, en dólares: es el plan que se empuja primero. */
export const PRECIO_LIFETIME_USD = 250

/* Formato internacional, como lo pide wa.me: 54 (país) + 9 (celular) +
   número sin el 15. Es el mismo que usa el botón de soporte de la app. */
export const WHATSAPP = '5492262559559'

export const money = (n: number) => `$${n.toLocaleString('es-AR')}`
export const usd = (n: number) => `USD ${n.toLocaleString('es-AR')}`

export function linkWhatsApp(plan: 'mensual' | 'lifetime') {
  const texto = plan === 'mensual'
    ? `Hola, quiero arrancar con Stackr en el plan mensual (${money(PRECIO_MENSUAL)} por mes).`
    : `Hola, quiero la licencia de Stackr de por vida (${usd(PRECIO_LIFETIME_USD)}, un solo pago).`
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`
}
