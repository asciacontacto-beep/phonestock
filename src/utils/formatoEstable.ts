/**
 * Números y fechas en español de Argentina, iguales en el servidor y en
 * cualquier navegador.
 *
 * El problema: cada motor trae su propia versión de las reglas de formato
 * (ICU/CLDR). La misma llamada da textos distintos según quién la haga:
 *
 *   (1545).toLocaleString('es-AR')   servidor: "1.545"   Safari 15: "1545"
 *   fecha {day:'2-digit',month:'short'}  servidor: "11-oct"  Safari 15: "11 oct."
 *   hora  {hour,minute}              servidor: "11:05 p. m." (espacio duro)
 *
 * La pantalla se dibuja primero en el servidor y después el navegador la
 * vuelve a dibujar: si el texto no coincide, React tira el error #418 y
 * rehace la pantalla entera (más lenta, con un parpadeo). El registro de
 * errores lo mostró en Mac con Safari 15.6 en Inicio, Gastos y Depósitos.
 *
 * La solución: para el idioma 'es-AR', números y fechas los arma este
 * archivo, sin depender del motor. Se instala igual en el servidor
 * (instrumentation.ts) y en el navegador (instrumentation-client.ts), así
 * los dos lados escriben exactamente lo mismo. El formato replica el que
 * mostraba el servidor, para que nadie note un cambio. Única diferencia a
 * propósito: la hora sin opciones va en 24 h ("23:05:09"), porque la de
 * antes decía "11:05:09" a las 23:05, sin "p. m.".
 *
 * Las fechas se muestran en hora argentina (UTC−3, sin horario de verano
 * desde 2009), aunque el dispositivo esté en otra zona.
 *
 * Cualquier otro idioma, o una combinación de opciones que no está acá,
 * sigue yendo al formateador del motor, como siempre.
 */

const LOCAL = 'es-AR'
const OFFSET_AR_MS = -3 * 60 * 60 * 1000

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

/* ── Números ─────────────────────────────────────────────── */

type OpcionesNumero = { minimumFractionDigits?: number; maximumFractionDigits?: number }

/** Suma uno a un entero escrito como texto ("199" → "200"). */
function sumarUno(digitos: string): string {
  const d = digitos.split('')
  for (let i = d.length - 1; i >= 0; i--) {
    if (d[i] === '9') { d[i] = '0'; continue }
    d[i] = String(Number(d[i]) + 1)
    return d.join('')
  }
  return '1' + d.join('')
}

/**
 * Como `n.toLocaleString('es-AR', opciones)`: punto de miles, coma decimal,
 * hasta 3 decimales por defecto y redondeo "la mitad hacia afuera" sobre el
 * número tal como se escribe (1,005 → 1,01, igual que el motor).
 * Devuelve null si las opciones no son las que se usan en la app.
 */
export function formatearNumero(n: number, opciones?: OpcionesNumero): string | null {
  if (opciones && Object.entries(opciones).some(([k, v]) => v !== undefined && k !== 'minimumFractionDigits' && k !== 'maximumFractionDigits')) return null
  if (Number.isNaN(n)) return 'NaN'
  if (!Number.isFinite(n)) return n < 0 ? '-∞' : '∞'

  const min = opciones?.minimumFractionDigits ?? 0
  let max = opciones?.maximumFractionDigits ?? 3
  if (opciones?.maximumFractionDigits === undefined && min > max) max = min
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max > 20 || min > max) return null

  const negativo = n < 0 || Object.is(n, -0)
  const texto = String(Math.abs(n))
  if (texto.includes('e')) return null // muy grande o muy chico: que lo haga el motor

  let [entero, decimales = ''] = texto.split('.')
  if (decimales.length > max) {
    const siguiente = Number(decimales[max])
    let digitos = entero + decimales.slice(0, max)
    if (siguiente >= 5) digitos = sumarUno(digitos)
    entero = digitos.slice(0, digitos.length - max) || '0'
    decimales = max ? digitos.slice(digitos.length - max) : ''
  }
  decimales = decimales.replace(/0+$/, '')
  while (decimales.length < min) decimales += '0'

  const conMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return (negativo ? '-' : '') + (decimales ? `${conMiles},${decimales}` : conMiles)
}

/* ── Fechas ──────────────────────────────────────────────── */

type Tipo = 'fecha' | 'hora' | 'fechaHora'
const CAMPOS = ['weekday', 'day', 'month', 'year', 'hour', 'minute', 'second', 'hour12'] as const

const dos = (n: number) => String(n).padStart(2, '0')

/** Las partes de la fecha en hora argentina. */
function partes(d: Date) {
  const a = new Date(d.getTime() + OFFSET_AR_MS)
  const H = a.getUTCHours()
  return {
    Y: a.getUTCFullYear(), M: a.getUTCMonth() + 1, D: a.getUTCDate(), dia: a.getUTCDay(),
    H, m: a.getUTCMinutes(), s: a.getUTCSeconds(),
    h12: ((H + 11) % 12) + 1,
    // "p. m." con espacio duro entre "p." y "m.", como el motor.
    ap: H < 12 ? 'a. m.' : 'p. m.',
  }
}

type P = ReturnType<typeof partes>

/** Cada combinación de opciones que usa la app, con su formato. */
const FORMATOS: Record<string, (p: P) => string> = {
  'fecha|': p => `${p.D}/${p.M}/${p.Y}`,
  'fecha|day=numeric,month=long,weekday=long': p => `${DIAS[p.dia]}, ${p.D} de ${MESES[p.M - 1]}`,
  'fecha|day=2-digit,month=2-digit': p => `${p.D}/${p.M}`,
  'fecha|month=long,year=numeric': p => `${MESES[p.M - 1]} de ${p.Y}`,
  'fecha|day=numeric,month=short': p => `${p.D} ${MESES_CORTOS[p.M - 1]}`,
  'fecha|day=2-digit,month=short,year=numeric': p => `${dos(p.D)} de ${MESES_CORTOS[p.M - 1]} de ${p.Y}`,
  'fecha|day=2-digit,month=2-digit,year=numeric': p => `${dos(p.D)}/${dos(p.M)}/${p.Y}`,
  'fecha|weekday=short': p => DIAS_CORTOS[p.dia],
  'fecha|weekday=long': p => DIAS[p.dia],
  'fecha|month=short,year=numeric': p => `${MESES_CORTOS[p.M - 1]} ${p.Y}`,
  'fecha|month=short': p => MESES_CORTOS[p.M - 1],
  'fecha|month=long': p => MESES[p.M - 1],
  'fecha|day=numeric,month=short,year=numeric': p => `${p.D} de ${MESES_CORTOS[p.M - 1]} de ${p.Y}`,
  'fecha|day=numeric,month=short,weekday=long': p => `${DIAS[p.dia]}, ${p.D} ${MESES_CORTOS[p.M - 1]}`,
  'fecha|day=numeric,month=short,weekday=long,year=numeric': p => `${DIAS[p.dia]}, ${p.D} de ${MESES_CORTOS[p.M - 1]} de ${p.Y}`,
  'fecha|day=numeric,month=numeric': p => `${p.D}/${p.M}`,
  'fecha|day=2-digit,month=short': p => `${dos(p.D)}-${MESES_CORTOS[p.M - 1]}`,
  'fecha|day=2-digit,hour=2-digit,minute=2-digit,month=2-digit,year=2-digit': p => `${dos(p.D)}/${dos(p.M)}/${dos(p.Y % 100)}, ${dos(p.h12)}:${dos(p.m)} ${p.ap}`,
  'hora|': p => `${dos(p.H)}:${dos(p.m)}:${dos(p.s)}`,
  'hora|hour=2-digit,minute=2-digit': p => `${dos(p.h12)}:${dos(p.m)} ${p.ap}`,
  'hora|hour=2-digit,hour12=false,minute=2-digit': p => `${dos(p.H)}:${dos(p.m)}`,
  'fechaHora|': p => `${p.D}/${p.M}/${p.Y}, ${dos(p.H)}:${dos(p.m)}:${dos(p.s)}`,
  'fechaHora|day=2-digit,hour=2-digit,minute=2-digit,month=2-digit,year=numeric': p => `${dos(p.D)}/${dos(p.M)}/${p.Y}, ${dos(p.h12)}:${dos(p.m)} ${p.ap}`,
  'fechaHora|day=2-digit,hour=2-digit,minute=2-digit,month=2-digit': p => `${p.D}/${p.M}, ${dos(p.h12)}:${dos(p.m)} ${p.ap}`,
}

/**
 * Como `d.toLocaleDateString / toLocaleTimeString / toLocaleString('es-AR', opciones)`.
 * Devuelve null para una fecha inválida o una combinación de opciones que no
 * está en la tabla (la hace el motor, como antes).
 */
export function formatearFecha(tipo: Tipo, d: Date, opciones?: Intl.DateTimeFormatOptions): string | null {
  if (Number.isNaN(d.getTime())) return null
  const o = (opciones || {}) as Record<string, unknown>
  if (Object.keys(o).some(k => o[k] !== undefined && !(CAMPOS as readonly string[]).includes(k))) return null
  const firma = CAMPOS.filter(k => o[k] !== undefined).sort().map(k => `${k}=${String(o[k])}`).join(',')
  const formato = FORMATOS[`${tipo}|${firma}`]
  return formato ? formato(partes(d)) : null
}

/* ── Instalación ─────────────────────────────────────────── */

const MARCA = Symbol.for('stackr.formatoEstable')

/**
 * Engancha el formateador en toLocaleString / toLocaleDateString /
 * toLocaleTimeString, sólo para 'es-AR'. Se puede llamar más de una vez.
 */
export function instalarFormatoEstable(): void {
  const g = globalThis as Record<symbol, unknown>
  if (g[MARCA]) return
  g[MARCA] = true

  /* eslint-disable @typescript-eslint/no-explicit-any -- firmas nativas */
  const numOriginal = Number.prototype.toLocaleString
  Number.prototype.toLocaleString = function (this: number, locales?: any, opciones?: any) {
    if (locales === LOCAL) {
      const r = formatearNumero(Number(this), opciones)
      if (r !== null) return r
    }
    return numOriginal.call(this, locales, opciones)
  }

  const original = {
    fecha: Date.prototype.toLocaleDateString,
    hora: Date.prototype.toLocaleTimeString,
    fechaHora: Date.prototype.toLocaleString,
  }
  const envolver = (tipo: Tipo) => function (this: Date, locales?: any, opciones?: any) {
    if (locales === LOCAL) {
      const r = formatearFecha(tipo, this, opciones)
      if (r !== null) return r
    }
    return original[tipo].call(this, locales, opciones)
  }
  Date.prototype.toLocaleDateString = envolver('fecha')
  Date.prototype.toLocaleTimeString = envolver('hora')
  Date.prototype.toLocaleString = envolver('fechaHora')
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
