/**
 * En qué estado está la cuenta de un local: prueba, al día, en gracia o
 * en sólo lectura.
 *
 * Tres reglas que vienen de una decisión de negocio, no técnica:
 *
 *   * La licencia de por vida no vence nunca. Los locales que pagaron el
 *     pago único compraron eso; cambiárselo después quema la confianza de
 *     los que además traen referidos.
 *
 *   * Cuando se vence, NO se corta de golpe. Hay días de gracia con aviso
 *     dentro de la app. Un local que un lunes a la mañana no puede entrar a
 *     ver su stock es un cliente perdido, no un cliente que paga.
 *
 *   * Pasada la gracia queda en sólo lectura: puede ver y exportar todo,
 *     pero no cargar operaciones nuevas. Los datos NUNCA se borran ni se
 *     esconden — son del local, no nuestros.
 */

export type Plan = 'trial' | 'monthly' | 'lifetime'

export interface Cuenta {
  plan?: Plan | string | null
  /** Vencimiento de la prueba gratis. */
  trial_expires_at?: string | null
  /** Hasta cuándo está paga la suscripción mensual. */
  paid_until?: string | null
}

/** Días que sigue funcionando una cuenta vencida antes de pasar a sólo lectura. */
export const DIAS_DE_GRACIA = 10

/** Desde cuántos días antes del vencimiento se empieza a avisar. */
export const DIAS_DE_AVISO = 5

export type EstadoCuenta = 'lifetime' | 'trial' | 'activa' | 'gracia' | 'solo_lectura'

export interface ResultadoCuenta {
  estado: EstadoCuenta
  /** Si puede cargar operaciones nuevas. Ver y exportar se puede siempre. */
  puedeEscribir: boolean
  /** Días hasta el vencimiento. Negativo si ya venció. */
  diasRestantes: number | null
  diasDeGraciaRestantes: number | null
  /** Si hay que mostrarle el aviso en la app. */
  avisar: boolean
  mensaje: string | null
}

const DIA_MS = 24 * 60 * 60 * 1000

function diasEntre(desde: string, hasta: string): number {
  return Math.round(
    (Date.parse(`${hasta.slice(0, 10)}T00:00:00Z`) - Date.parse(`${desde.slice(0, 10)}T00:00:00Z`)) / DIA_MS,
  )
}

export function estadoDeCuenta(cuenta: Cuenta, hoy: string): ResultadoCuenta {
  if (cuenta.plan === 'lifetime') {
    return {
      estado: 'lifetime', puedeEscribir: true,
      diasRestantes: null, diasDeGraciaRestantes: null,
      avisar: false, mensaje: null,
    }
  }

  const esMensual = cuenta.plan === 'monthly'
  const vencimiento = esMensual ? cuenta.paid_until : cuenta.trial_expires_at

  if (!vencimiento) {
    /* Sin fecha, el trial es una cuenta que el superadmin dejó abierta a
       propósito y no se toca. El mensual es al revés: estar en plan pago
       sin ningún pago registrado no da acceso indefinido. */
    return esMensual
      ? {
          estado: 'solo_lectura', puedeEscribir: false,
          diasRestantes: null, diasDeGraciaRestantes: 0, avisar: true,
          mensaje: 'No hay ningún pago registrado en tu cuenta. Podés ver y exportar tus datos, pero no cargar operaciones nuevas.',
        }
      : {
          estado: 'activa', puedeEscribir: true,
          diasRestantes: null, diasDeGraciaRestantes: null, avisar: false, mensaje: null,
        }
  }

  const restantes = diasEntre(hoy, vencimiento)

  if (restantes >= 0) {
    const avisar = restantes <= DIAS_DE_AVISO
    return {
      estado: esMensual ? 'activa' : 'trial',
      puedeEscribir: true,
      diasRestantes: restantes,
      diasDeGraciaRestantes: null,
      avisar,
      mensaje: avisar
        ? esMensual
          ? `Tu suscripción vence en ${restantes} ${restantes === 1 ? 'día' : 'días'}.`
          : `Te quedan ${restantes} ${restantes === 1 ? 'día' : 'días'} de prueba.`
        : null,
    }
  }

  const graciaRestante = DIAS_DE_GRACIA + restantes

  if (graciaRestante > 0) {
    return {
      estado: 'gracia',
      puedeEscribir: true,
      diasRestantes: restantes,
      diasDeGraciaRestantes: graciaRestante,
      avisar: true,
      mensaje: `Tu cuenta venció. Seguís trabajando normal por ${graciaRestante} ${graciaRestante === 1 ? 'día' : 'días'} más.`,
    }
  }

  return {
    estado: 'solo_lectura',
    puedeEscribir: false,
    diasRestantes: restantes,
    diasDeGraciaRestantes: 0,
    avisar: true,
    mensaje: 'Tu cuenta está en sólo lectura. Tus datos siguen intactos: podés verlos y descargarlos cuando quieras. Para volver a cargar ventas, renovás y listo.',
  }
}
