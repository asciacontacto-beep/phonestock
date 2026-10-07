/**
 * Link de referido: stackrarg.vercel.app/?ref=CODIGO
 *
 * El código se guarda en el navegador apenas se entra por el link, y se usa
 * al crear la cuenta: la persona puede mirar la landing hoy y registrarse
 * otro día. Al registrarse, el local queda marcado con quién lo trajo
 * (set_referral) y eso es lo que ve el superadmin para pagar la comisión.
 *
 * Esto se perdió el 19/9 en el rediseño de la landing: desde ese día el
 * registro buscaba el código y nunca lo encontraba. Por eso vive acá, con
 * tests, y se monta en la landing y en el registro.
 */

export const CLAVE_REF = 'stackr_ref'
export const CLAVE_REF_FECHA = 'stackr_ref_fecha'
/** Pasado este plazo sin registrarse, el link ya no cuenta. */
export const VIGENCIA_DIAS = 90

/** Los códigos tienen 6 caracteres, sin 0/O/1/I (ver gen_referral_code). */
export function codigoReferido(valor: string | null | undefined): string | null {
  const c = String(valor || '').trim().toUpperCase()
  return /^[A-HJ-NP-Z2-9]{6}$/.test(c) ? c : null
}

type Almacen = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** Si la dirección trae ?ref=CODIGO válido, lo guarda (el último link gana). */
export function guardarReferidoDeUrl(search: string, almacen: Almacen, ahora = Date.now()): string | null {
  const c = codigoReferido(new URLSearchParams(search).get('ref'))
  if (!c) return null
  almacen.setItem(CLAVE_REF, c)
  almacen.setItem(CLAVE_REF_FECHA, String(ahora))
  return c
}

/** El código guardado, si sigue vigente. Uno vencido o inválido se borra. */
export function leerReferido(almacen: Almacen, ahora = Date.now()): string | null {
  const c = codigoReferido(almacen.getItem(CLAVE_REF))
  const crudo = almacen.getItem(CLAVE_REF_FECHA)
  const fecha = crudo == null ? null : Number(crudo)
  // Guardado antes de que existiera la fecha: se acepta.
  const vigente = fecha == null || !Number.isFinite(fecha) || ahora - fecha <= VIGENCIA_DIAS * 86_400_000
  if (c && vigente) return c
  olvidarReferido(almacen)
  return null
}

/* ── Lo que ve el superadmin ─────────────────────────────────────────── */

/** Una fila de get_referrals(): un negocio que llegó por el link de otro. */
export type FilaReferido = {
  org_id: string
  org_name: string | null
  plan: string | null
  created_at: string | null
  referred_by_code: string
  referrer_name: string | null
}

export type Referente = {
  codigo: string
  /** null si el código no es de ningún negocio (se borró o se tipeó mal). */
  nombre: string | null
  traidos: FilaReferido[]
  /** Cuántos de los que trajo ya pagan: sobre esos corresponde comisión. */
  pagan: number
  /** Lo cobrado en USD a los que trajo. */
  cobradoUSD: number
}

/** Agrupa por quién trajo: los que más clientes pagos trajeron, primero. */
export function agruparReferidos(filas: FilaReferido[], cobradoPorOrg: Map<string, number>): Referente[] {
  const porCodigo = new Map<string, Referente>()
  for (const f of filas) {
    if (!f?.referred_by_code) continue
    const r = porCodigo.get(f.referred_by_code) ?? {
      codigo: f.referred_by_code, nombre: f.referrer_name ?? null, traidos: [], pagan: 0, cobradoUSD: 0,
    }
    r.traidos.push(f)
    if (f.plan === 'active') r.pagan += 1
    r.cobradoUSD += cobradoPorOrg.get(f.org_id) || 0
    porCodigo.set(f.referred_by_code, r)
  }
  for (const r of porCodigo.values()) {
    r.traidos.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  }
  return [...porCodigo.values()].sort((a, b) =>
    b.pagan - a.pagan || b.traidos.length - a.traidos.length || (a.nombre || a.codigo).localeCompare(b.nombre || b.codigo))
}

export function olvidarReferido(almacen: Almacen): void {
  almacen.removeItem(CLAVE_REF)
  almacen.removeItem(CLAVE_REF_FECHA)
}
