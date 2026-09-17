/**
 * Qué expone la API de cada tabla, y qué no.
 *
 * Declarado en un solo lugar para que las reglas no dependan de acordarse
 * en cada endpoint. Tres listas importan de verdad:
 *
 *  - `ocultos`: nunca salen, con ningún permiso. El caso concreto es
 *    `device_password` de las reparaciones — el código de desbloqueo del
 *    celular del cliente final. No tiene uso legítimo fuera del taller.
 *
 *  - `camposCosto`: sólo con el permiso `costs:read`. Una clave que un local
 *    le pasa al que le hace la web para mostrar el catálogo no debería
 *    llevarse los costos ni los márgenes.
 *
 *  - `escribiblesAlCrear` / `escribiblesAlEditar`: lo que no está acá se
 *    ignora. Quedan afuera a propósito las cosas con efectos en caja o en la
 *    rentabilidad (vender, cobrar, entregar): la app las hace completas y la
 *    API las dejaría a medias.
 */

import type { Scope } from './compartido'

export type Recurso = {
  tabla: string
  scopeLeer: Scope
  scopeEscribir?: Scope
  ocultos: string[]
  camposCosto: string[]
  escribiblesAlCrear?: string[]
  escribiblesAlEditar?: string[]
  obligatoriosAlCrear?: string[]
  /** parámetro de la URL → columna, filtro por igualdad */
  filtros: Record<string, string>
  /** búsqueda de texto con ?q= sobre esta columna */
  columnaBusqueda?: string
  /** columna de fecha para ?desde= y ?hasta= */
  columnaFecha?: string
  orden: { columna: string; ascendente: boolean }
  /** valores aceptados por columna, para lo que no admite cualquier cosa */
  valoresPermitidos?: Record<string, readonly string[]>
}

/**
 * Estados de reparación que la API puede poner. ENTREGADO queda afuera: en
 * la app, entregar con saldo pendiente cobra ese saldo a caja. Por API la
 * plata nunca entraría y la rentabilidad quedaría mal.
 */
export const ESTADOS_REPARACION_API = ['INGRESADO', 'REVISION', 'REPUESTO', 'REPARADO', 'CANCELADO'] as const

export const RECURSOS: Record<string, Recurso> = {
  stock: {
    tabla: 'stock',
    scopeLeer: 'stock:read',
    scopeEscribir: 'stock:write',
    ocultos: ['org_id'],
    camposCosto: ['cost_price'],
    // Sin `status`: marcar un equipo como vendido sin registrar la venta
    // dejaría caja y rentabilidad mal. Para vender está la app.
    escribiblesAlCrear: ['brand', 'model', 'storage', 'color', 'imei', 'price', 'cost_price', 'currency', 'deposit', 'condition', 'battery', 'notes', 'upc', 'supplier_id'],
    escribiblesAlEditar: ['storage', 'color', 'imei', 'price', 'cost_price', 'currency', 'deposit', 'condition', 'battery', 'notes'],
    obligatoriosAlCrear: ['brand', 'model', 'price', 'currency', 'deposit'],
    filtros: { estado: 'status', marca: 'brand', modelo: 'model', deposito: 'deposit', imei: 'imei', condicion: 'condition' },
    columnaBusqueda: 'model',
    columnaFecha: 'created_at',
    orden: { columna: 'created_at', ascendente: false },
    valoresPermitidos: { currency: ['USD', 'ARS'], condition: ['new', 'used'] },
  },

  ventas: {
    tabla: 'sales',
    scopeLeer: 'sales:read',
    ocultos: ['org_id'],
    camposCosto: ['cost_price'],
    filtros: { vendedor: 'seller_id', deposito: 'deposit_id', marca: 'brand' },
    columnaFecha: 'created_at',
    orden: { columna: 'created_at', ascendente: false },
  },

  clientes: {
    tabla: 'customers',
    scopeLeer: 'customers:read',
    scopeEscribir: 'customers:write',
    ocultos: ['org_id'],
    camposCosto: [],
    escribiblesAlCrear: ['name', 'dni', 'phone', 'email', 'instagram'],
    escribiblesAlEditar: ['name', 'dni', 'phone', 'email', 'instagram'],
    obligatoriosAlCrear: ['name'],
    filtros: { dni: 'dni', telefono: 'phone' },
    columnaBusqueda: 'name',
    columnaFecha: 'created_at',
    orden: { columna: 'created_at', ascendente: false },
  },

  reparaciones: {
    tabla: 'repairs',
    scopeLeer: 'repairs:read',
    scopeEscribir: 'repairs:write',
    ocultos: ['org_id', 'device_password'],
    camposCosto: ['cost', 'labor_cost'],
    escribiblesAlCrear: ['customer_name', 'customer_phone', 'device_brand', 'device_model', 'device_color', 'issue_description', 'visual_condition', 'budget'],
    // Sin `cost`: se calcula de repuestos más mano de obra.
    escribiblesAlEditar: ['status', 'assigned_technician', 'budget', 'notes'],
    obligatoriosAlCrear: ['customer_name', 'device_model', 'issue_description'],
    filtros: { estado: 'status', tecnico: 'assigned_technician', telefono: 'customer_phone' },
    columnaBusqueda: 'customer_name',
    columnaFecha: 'created_at',
    orden: { columna: 'created_at', ascendente: false },
    valoresPermitidos: { status: ESTADOS_REPARACION_API },
  },

  accesorios: {
    tabla: 'accessories',
    scopeLeer: 'accessories:read',
    ocultos: ['org_id'],
    camposCosto: ['cost_price'],
    filtros: { categoria: 'category', modelo: 'compatible_model', deposito: 'deposit_id' },
    columnaBusqueda: 'compatible_model',
    orden: { columna: 'category', ascendente: true },
  },

  depositos: {
    tabla: 'deposits',
    scopeLeer: 'deposits:read',
    ocultos: ['org_id'],
    camposCosto: [],
    filtros: {},
    orden: { columna: 'name', ascendente: true },
  },
}

/**
 * Quita de una fila lo que no corresponde mostrar. Recorre también arrays
 * anidados: las ventas guardan los accesorios vendidos como JSON, y cada uno
 * lleva su propio `cost_price`.
 */
export function limpiarFila(fila: any, recurso: Recurso, conCostos: boolean): any {
  if (fila === null || typeof fila !== 'object') return fila
  const quitar = new Set([...recurso.ocultos, ...(conCostos ? [] : recurso.camposCosto)])

  const limpiar = (v: any): any => {
    if (Array.isArray(v)) return v.map(limpiar)
    if (v === null || typeof v !== 'object') return v
    const out: Record<string, any> = {}
    for (const [k, val] of Object.entries(v)) {
      if (quitar.has(k)) continue
      out[k] = limpiar(val)
    }
    return out
  }
  return limpiar(fila)
}

export class ErrorApi extends Error {
  constructor(public status: number, public codigo: string, mensaje: string) {
    super(mensaje)
  }
}

/**
 * Se queda sólo con los campos permitidos del cuerpo recibido y valida los
 * obligatorios y los valores cerrados. Todo lo demás se ignora — incluido
 * `org_id`, que lo pone la base según la clave.
 */
export function tomarCampos(
  cuerpo: unknown,
  permitidos: string[],
  obligatorios: string[] = [],
  valoresPermitidos: Record<string, readonly string[]> = {},
): Record<string, any> {
  if (cuerpo === null || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
    throw new ErrorApi(400, 'cuerpo_invalido', 'El cuerpo tiene que ser un objeto JSON.')
  }
  const src = cuerpo as Record<string, any>
  const out: Record<string, any> = {}
  for (const k of permitidos) {
    if (k in src) out[k] = typeof src[k] === 'string' ? src[k].trim() : src[k]
  }

  const faltan = obligatorios.filter(k => out[k] === undefined || out[k] === null || out[k] === '')
  if (faltan.length) {
    throw new ErrorApi(400, 'faltan_campos', `Faltan campos obligatorios: ${faltan.join(', ')}.`)
  }

  for (const [k, validos] of Object.entries(valoresPermitidos)) {
    if (out[k] !== undefined && !validos.includes(out[k])) {
      throw new ErrorApi(400, 'valor_invalido', `"${k}" tiene que ser uno de: ${validos.join(', ')}.`)
    }
  }
  return out
}

/** Paginación con tope: nadie se trae 50.000 filas de una. */
export function paginacion(params: URLSearchParams): { limite: number; desde: number } {
  const lim = parseInt(params.get('limite') || '', 10)
  const off = parseInt(params.get('offset') || '', 10)
  return {
    limite: Number.isFinite(lim) && lim > 0 ? Math.min(lim, 200) : 50,
    desde: Number.isFinite(off) && off > 0 ? off : 0,
  }
}

/** ISO válido o null: una fecha mal escrita no debe convertirse en "sin filtro" en silencio. */
export function fechaParam(valor: string | null, nombre: string): string | null {
  if (!valor) return null
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) {
    throw new ErrorApi(400, 'fecha_invalida', `"${nombre}" no es una fecha válida. Usá el formato 2026-09-01.`)
  }
  return d.toISOString()
}
