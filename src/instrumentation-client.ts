/**
 * Rellenos para Safari viejo (Mac con macOS Monterey o anterior sin
 * actualizar, iPhone con iOS 14–15).
 *
 * El código ya se compila para Safari 14 (ver "browserslist" en
 * package.json), pero la compilación sólo traduce la sintaxis; las funciones
 * que el navegador no trae hay que agregarlas. Estas dos las usa la librería
 * de gráficos (Rentabilidad) y llegaron a Safari recién en la 15.4.
 *
 * Corre antes de que la app se vuelva interactiva.
 */

if (typeof Object.hasOwn !== 'function') {
  Object.defineProperty(Object, 'hasOwn', {
    value: (obj: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(Object(obj), key),
    configurable: true,
    writable: true,
  })
}

if (typeof globalThis.structuredClone !== 'function') {
  // Alcanza para lo que se clona en la app (datos simples y errores).
  const clonar = (v: unknown, vistos = new Map<unknown, unknown>()): unknown => {
    if (v === null || typeof v !== 'object') return v
    if (vistos.has(v)) return vistos.get(v)
    if (v instanceof Date) return new Date(v.getTime())
    if (v instanceof RegExp) return new RegExp(v.source, v.flags)
    if (v instanceof Error) {
      const e = new (v.constructor as ErrorConstructor)(v.message)
      e.name = v.name
      e.stack = v.stack
      return e
    }
    if (v instanceof Map) {
      const m = new Map(); vistos.set(v, m)
      v.forEach((val, k) => m.set(clonar(k, vistos), clonar(val, vistos)))
      return m
    }
    if (v instanceof Set) {
      const s = new Set(); vistos.set(v, s)
      v.forEach(val => s.add(clonar(val, vistos)))
      return s
    }
    const out: Record<string, unknown> | unknown[] = Array.isArray(v) ? [] : {}
    vistos.set(v, out)
    for (const k of Object.keys(v)) (out as Record<string, unknown>)[k] = clonar((v as Record<string, unknown>)[k], vistos)
    return out
  }
  Object.defineProperty(globalThis, 'structuredClone', {
    value: (v: unknown) => clonar(v),
    configurable: true,
    writable: true,
  })
}

export {}
