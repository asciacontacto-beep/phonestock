/**
 * Las secciones del menú del dueño y sus pestañas.
 *
 * El menú tenía 19 entradas: Accesorios, Depósitos y Carga EAN al lado de
 * Inventario; Recibo al lado de Historial; Gastos al lado de Cajas. Eran
 * pantallas de un mismo tema repartidas como si fueran cosas distintas.
 * Ahora el menú lleva una entrada por tema y cada pantalla del tema es una
 * pestaña arriba. Las direcciones no cambiaron: un enlace guardado a
 * /expenses o /users sigue andando.
 */

export interface Pestana {
  /** Ruta sin la barra inicial, igual que en el menú. */
  id: string
  label: string
}

export interface Seccion {
  /** La entrada del menú que queda marcada. */
  menu: string
  pestanas: Pestana[]
  /** Pantallas del tema que no son pestaña (se llega con un botón). */
  tambien?: string[]
}

export const SECCIONES: Seccion[] = [
  { menu: 'dashboard', pestanas: [{ id: 'dashboard', label: 'Resumen' }, { id: 'reports', label: 'Rentabilidad' }] },
  { menu: 'stock', pestanas: [{ id: 'stock', label: 'Equipos' }, { id: 'accessories', label: 'Accesorios' }, { id: 'deposits', label: 'Depósitos' }], tambien: ['scan'] },
  { menu: 'sales', pestanas: [{ id: 'sales', label: 'Ventas' }, { id: 'recibos', label: 'Recibo manual' }] },
  { menu: 'cashiers', pestanas: [{ id: 'cashiers', label: 'Cajas' }, { id: 'expenses', label: 'Gastos' }] },
  { menu: 'customers', pestanas: [{ id: 'customers', label: 'Clientes' }, { id: 'mayoristas', label: 'Mayoristas' }] },
  { menu: 'settings', pestanas: [{ id: 'settings', label: 'Ajustes' }, { id: 'users', label: 'Usuarios' }, { id: 'catalogo', label: 'Catálogo' }] },
]

/** La ruta sin barras: "/mayoristas/123" → "mayoristas/123"; "/" → "dashboard". */
export function rutaDe(pathname: string): string {
  return pathname.replace(/^\/+|\/+$/g, '') || 'dashboard'
}

/** La pestaña a la que pertenece una ruta (también sus subrutas: mayoristas/123 → mayoristas). */
export function pestanaDe(pathname: string): string {
  const ruta = rutaDe(pathname)
  for (const s of SECCIONES) {
    for (const p of s.pestanas) {
      if (ruta === p.id || ruta.startsWith(p.id + '/')) return p.id
    }
  }
  return ruta
}

/** La sección de una ruta, o null si la pantalla va sola (Vender, Turnos…). */
export function seccionDe(pathname: string): Seccion | null {
  const p = pestanaDe(pathname)
  return SECCIONES.find(s => s.pestanas.some(t => t.id === p)) || null
}

/** Qué entrada del menú se marca estando en esta ruta. */
export function menuActivo(pathname: string): string {
  const ruta = rutaDe(pathname)
  const s = seccionDe(pathname) || SECCIONES.find(x => x.tambien?.includes(ruta))
  return s?.menu || ruta
}
