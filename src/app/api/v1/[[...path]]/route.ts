/**
 * API pública de Stackr, v1.
 *
 * Una sola ruta comodín a propósito: todo pedido pasa por el mismo punto de
 * autenticación. Así no se puede agregar un endpoint que se olvide de pedir
 * la clave o de chequear el permiso.
 *
 *   GET    /api/v1                       índice (público)
 *   GET    /api/v1/:recurso              listar
 *   GET    /api/v1/:recurso/:id          ver uno
 *   POST   /api/v1/:recurso              crear
 *   PATCH  /api/v1/:recurso/:id          editar
 *
 * No hay encabezados CORS: la clave tiene que usarse desde un servidor. Si
 * se pone en el JavaScript de una web, cualquiera que abra la página la lee.
 */

import { autenticar, exigirScope, type ContextoApi } from '@/utils/api/autenticar'
import {
  RECURSOS, ErrorApi, limpiarFila, tomarCampos, paginacion, fechaParam, type Recurso,
} from '@/utils/api/recursos'
import { SCOPES } from '@/utils/api/compartido'
import { esErrorImeiRepetido } from '@/utils/imei'
import { upsertCustomer } from '@/utils/customers'
import { logAudit } from '@/utils/audit'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ path?: string[] }> }

const HEADERS = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: HEADERS })
}

function error(e: unknown) {
  if (e instanceof ErrorApi) {
    return json({ error: { codigo: e.codigo, mensaje: e.message } }, e.status)
  }
  if (esErrorImeiRepetido(e)) {
    return json({ error: { codigo: 'imei_repetido', mensaje: 'Ese IMEI ya está en el inventario disponible.' } }, 409)
  }
  // Nunca devolver el mensaje crudo de Postgres: puede mencionar tablas,
  // columnas o datos de la base.
  console.error('[api/v1]', e)
  return json({ error: { codigo: 'error_interno', mensaje: 'Error interno. Si se repite, avisá a soporte.' } }, 500)
}

function recursoDe(nombre: string | undefined): Recurso {
  const r = nombre ? RECURSOS[nombre] : undefined
  if (!r) {
    throw new ErrorApi(404, 'recurso_inexistente', `No existe el recurso "${nombre}". Recursos: ${Object.keys(RECURSOS).join(', ')}.`)
  }
  return r
}

/** Escapa los comodines de LIKE para que "%" en una búsqueda no traiga todo. */
function patronBusqueda(q: string) {
  return `%${q.replace(/[\\%_]/g, m => `\\${m}`)}%`
}

function indice() {
  return json({
    nombre: 'Stackr API',
    version: 'v1',
    documentacion: '/docs/api',
    autenticacion: 'Header "Authorization: Bearer <clave>". Las claves se crean en Configuración → API.',
    recursos: Object.fromEntries(
      Object.entries(RECURSOS).map(([k, r]) => [k, {
        leer: r.scopeLeer,
        escribir: r.scopeEscribir || null,
        filtros: Object.keys(r.filtros),
        busqueda: Boolean(r.columnaBusqueda),
        fechas: Boolean(r.columnaFecha),
      }]),
    ),
    permisos: SCOPES,
  })
}

async function listar(ctx: ContextoApi, r: Recurso, url: URL) {
  exigirScope(ctx, r.scopeLeer)
  const { limite, desde } = paginacion(url.searchParams)

  let q = ctx.db.from(r.tabla).select('*', { count: 'exact' })

  for (const [param, columna] of Object.entries(r.filtros)) {
    const v = url.searchParams.get(param)
    if (v !== null && v !== '') q = q.eq(columna, v)
  }

  const texto = url.searchParams.get('q')?.trim()
  if (texto && r.columnaBusqueda) q = q.ilike(r.columnaBusqueda, patronBusqueda(texto))

  if (r.columnaFecha) {
    const d = fechaParam(url.searchParams.get('desde'), 'desde')
    const h = fechaParam(url.searchParams.get('hasta'), 'hasta')
    if (d) q = q.gte(r.columnaFecha, d)
    if (h) q = q.lte(r.columnaFecha, h)
  }

  const { data, error: err, count } = await q
    .order(r.orden.columna, { ascending: r.orden.ascendente })
    .range(desde, desde + limite - 1)
  if (err) throw err

  const conCostos = ctx.scopes.includes('costs:read')
  return json({
    data: (data || []).map(f => limpiarFila(f, r, conCostos)),
    paginacion: { total: count ?? null, limite, offset: desde },
  })
}

async function obtener(ctx: ContextoApi, r: Recurso, id: string) {
  exigirScope(ctx, r.scopeLeer)
  const { data, error: err } = await ctx.db.from(r.tabla).select('*').eq('id', id).maybeSingle()
  // Un id con formato inválido también es "no existe" para quien pregunta.
  if (err || !data) throw new ErrorApi(404, 'no_encontrado', 'No existe o no pertenece a tu negocio.')
  return json({ data: limpiarFila(data, r, ctx.scopes.includes('costs:read')) })
}

async function leerCuerpo(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    throw new ErrorApi(400, 'json_invalido', 'El cuerpo no es JSON válido.')
  }
}

async function crear(ctx: ContextoApi, nombre: string, r: Recurso, req: Request) {
  if (!r.scopeEscribir || !r.escribiblesAlCrear) {
    throw new ErrorApi(405, 'solo_lectura', `"${nombre}" es de sólo lectura por API.`)
  }
  exigirScope(ctx, r.scopeEscribir)
  const campos = tomarCampos(await leerCuerpo(req), r.escribiblesAlCrear, r.obligatoriosAlCrear, r.valoresPermitidos)

  let fila: any

  if (nombre === 'stock') {
    // Siempre entra disponible. Vender es otra operación (ver recursos.ts).
    const { data, error: err } = await ctx.db.from('stock').insert([{ ...campos, status: 'available' }]).select().single()
    if (err) throw err
    fila = data
  } else if (nombre === 'clientes') {
    // Mismo criterio que la app: si ya existe por DNI o nombre, se reutiliza
    // en vez de duplicarlo.
    const id = await upsertCustomer(ctx.db, campos as any)
    const { data, error: err } = await ctx.db.from('customers').select('*').eq('id', id).single()
    if (err) throw err
    fila = data
  } else if (nombre === 'reparaciones') {
    const customerId = await upsertCustomer(ctx.db, { name: campos.customer_name, phone: campos.customer_phone })
    const { data, error: err } = await ctx.db.from('repairs').insert([{ ...campos, customer_id: customerId }]).select().single()
    if (err) throw err
    fila = data
  } else {
    const { data, error: err } = await ctx.db.from(r.tabla).insert([campos]).select().single()
    if (err) throw err
    fila = data
  }

  await logAudit(ctx.db, {
    user: { id: ctx.userId, name: `API: ${ctx.nombreClave}` },
    action: 'api_crear', entity: r.tabla, entityId: String(fila?.id ?? ''),
    summary: `Creado por la API (${nombre})`,
    details: { campos: Object.keys(campos) },
  })

  return json({ data: limpiarFila(fila, r, ctx.scopes.includes('costs:read')) }, 201)
}

async function editar(ctx: ContextoApi, nombre: string, r: Recurso, id: string, req: Request) {
  if (!r.scopeEscribir || !r.escribiblesAlEditar) {
    throw new ErrorApi(405, 'solo_lectura', `"${nombre}" es de sólo lectura por API.`)
  }
  exigirScope(ctx, r.scopeEscribir)

  const campos = tomarCampos(await leerCuerpo(req), r.escribiblesAlEditar, [], r.valoresPermitidos)
  if (Object.keys(campos).length === 0) {
    throw new ErrorApi(400, 'sin_cambios', `No se recibió ningún campo editable. Permitidos: ${r.escribiblesAlEditar.join(', ')}.`)
  }
  if (nombre === 'reparaciones') campos.updated_at = new Date().toISOString()

  const { data, error: err } = await ctx.db.from(r.tabla).update(campos).eq('id', id).select().maybeSingle()
  if (err) {
    if (esErrorImeiRepetido(err)) throw err
    throw new ErrorApi(404, 'no_encontrado', 'No existe o no pertenece a tu negocio.')
  }
  if (!data) throw new ErrorApi(404, 'no_encontrado', 'No existe o no pertenece a tu negocio.')

  await logAudit(ctx.db, {
    user: { id: ctx.userId, name: `API: ${ctx.nombreClave}` },
    action: 'api_editar', entity: r.tabla, entityId: id,
    summary: `Editado por la API (${nombre}): ${Object.keys(campos).filter(k => k !== 'updated_at').join(', ')}`,
    details: { campos },
  })

  return json({ data: limpiarFila(data, r, ctx.scopes.includes('costs:read')) })
}

export async function GET(req: Request, { params }: Ctx) {
  try {
    const { path = [] } = await params
    if (path.length === 0) return indice()
    if (path.length > 2) throw new ErrorApi(404, 'ruta_inexistente', 'Ruta inexistente.')

    const r = recursoDe(path[0])
    const ctx = await autenticar(req)
    return path.length === 1 ? await listar(ctx, r, new URL(req.url)) : await obtener(ctx, r, path[1])
  } catch (e) {
    return error(e)
  }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { path = [] } = await params
    if (path.length !== 1) throw new ErrorApi(404, 'ruta_inexistente', 'Para crear: POST /api/v1/:recurso')
    const r = recursoDe(path[0])
    const ctx = await autenticar(req)
    return await crear(ctx, path[0], r, req)
  } catch (e) {
    return error(e)
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { path = [] } = await params
    if (path.length !== 2) throw new ErrorApi(404, 'ruta_inexistente', 'Para editar: PATCH /api/v1/:recurso/:id')
    const r = recursoDe(path[0])
    const ctx = await autenticar(req)
    return await editar(ctx, path[0], r, path[1], req)
  } catch (e) {
    return error(e)
  }
}

/** Borrar no existe por API: una baja equivocada desde una integración no tiene vuelta. */
export async function DELETE() {
  return error(new ErrorApi(405, 'no_permitido', 'La API no permite borrar. Hacelo desde la app.'))
}
