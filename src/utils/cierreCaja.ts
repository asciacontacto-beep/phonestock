/**
 * Cierre de turno del vendedor.
 *
 * El vendedor cuenta el efectivo y lo declara. En modo "a ciegas" no ve lo
 * que el sistema espera: si lo viera, contaría hasta llegar a ese número y
 * el arqueo no controlaría nada. El dueño ve después la diferencia.
 *
 * Por eso el cierre guarda sólo lo declarado y el tramo de tiempo del
 * turno. Lo esperado se calcula al mirarlo, con las ventas del vendedor en
 * ese tramo: nunca pasa por la pantalla del vendedor.
 */

interface PagoCaja {
  id?: string
  amount?: number | string | null
  original_amount?: number | string | null
  currency?: string | null
}

/**
 * En qué renglón de la caja cae un pago. El vuelto que se le dio al cliente
 * sale del efectivo de su moneda: guardado como "vuelto", se perdía y la
 * caja esperaba más billetes de los que había.
 */
export function claveDeCaja(p: PagoCaja): string {
  if (p.id === 'vuelto') return p.currency === 'USD' ? 'usd_cash' : 'ars_cash'
  return String(p.id || '')
}

interface VentaCaja {
  seller_id?: string | null
  created_at?: string | null
  payments?: PagoCaja[] | null
}

export interface EfectivoTurno {
  ars: number
  usd: number
}

/** Efectivo que tendría que haber del turno: lo cobrado en billetes por el vendedor. */
export function esperadoDelTurno(
  ventas: VentaCaja[],
  vendedorId: string,
  desde: string | null,
  hasta: string,
): EfectivoTurno {
  const r: EfectivoTurno = { ars: 0, usd: 0 }
  // Se comparan instantes, no textos: la base devuelve "+00:00" y el
  // navegador "Z", y como texto no ordenan igual.
  const t0 = desde ? Date.parse(desde) : -Infinity
  const t1 = Date.parse(hasta)
  for (const v of ventas) {
    if (v.seller_id !== vendedorId || !v.created_at) continue
    const t = Date.parse(v.created_at)
    if (!(t > t0) || t > t1) continue
    for (const p of v.payments || []) {
      const monto = Number(p.original_amount ?? p.amount) || 0
      const clave = claveDeCaja(p)
      if (clave === 'ars_cash') r.ars += monto
      else if (clave === 'usd_cash') r.usd += monto
    }
  }
  return { ars: redondear(r.ars), usd: redondear(r.usd) }
}

export interface Cierre {
  id?: string
  user_id: string
  created_at: string
  /** Desde cuándo cuenta el turno: el cierre anterior del vendedor, o el inicio del día. */
  desde: string | null
  declared_ars: number
  declared_usd: number
}

export type CierreConDiferencia<T extends Cierre = Cierre> = T & {
  esperado: EfectivoTurno
  diferencia: EfectivoTurno
  /** Sin diferencia en ninguna moneda (tolerancia de un peso / un centavo). */
  cuadra: boolean
}

/** Lo esperado y la diferencia de cada cierre, para que los vea el dueño. */
export function conDiferencias<T extends Cierre>(cierres: T[], ventas: VentaCaja[]): CierreConDiferencia<T>[] {
  return cierres.map(c => {
    const esperado = esperadoDelTurno(ventas, c.user_id, c.desde, c.created_at)
    const diferencia = {
      ars: redondear((Number(c.declared_ars) || 0) - esperado.ars),
      usd: redondear((Number(c.declared_usd) || 0) - esperado.usd),
    }
    return { ...c, esperado, diferencia, cuadra: Math.abs(diferencia.ars) < 1 && Math.abs(diferencia.usd) < 0.01 }
  })
}

/**
 * Desde cuándo cuenta el turno que se cierra: el último cierre del mismo
 * vendedor, si fue hoy; si no, el comienzo del día. Un turno no arrastra
 * ventas de días anteriores que nadie cerró.
 */
export function inicioDelTurno(cierresPrevios: Pick<Cierre, 'user_id' | 'created_at'>[], vendedorId: string, inicioDelDia: string): string {
  const desde = Date.parse(inicioDelDia)
  const ultimo = cierresPrevios
    .filter(c => c.user_id === vendedorId && Date.parse(c.created_at) >= desde)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    .pop()
  return ultimo?.created_at || inicioDelDia
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100
}
