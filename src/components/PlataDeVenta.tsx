import type { Sale } from '@/types/domain'
import { resumenDeVenta, destinoDelCobro } from '@/utils/cobro'

const money = (n: number, m: string) =>
  `${m === 'USD' ? 'U$' : '$'} ${(Number(n) || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`

const CUANDO = { hoy: 'entró', acredita: 'por acreditar', canje: 'canje', credito: 'a cobrar' } as const

/**
 * La plata de una venta, para el dueño: lo que pagó el cliente, a dónde
 * fue y lo que quedó de ganancia. Separados a propósito: el recargo de la
 * tarjeta está en lo que pagó el cliente, pero no en la ganancia.
 */
export function PlataDeVenta({ sale, exchangeRate }: { sale: Sale; exchangeRate: number }) {
  const r = resumenDeVenta(sale, exchangeRate)
  const destinos = destinoDelCobro((sale.payments || []) as never[], {
    monedaVenta: r.moneda,
    saldoPendiente: r.pendiente,
    hoy: new Date().toLocaleDateString('en-CA'),
  })
  const tono = r.gananciaUSD == null ? 'var(--text-3)'
    : r.gananciaUSD < 0 ? 'var(--red)'
    : r.pendiente > 0 || r.costoIncompleto ? 'var(--amber)'
    : 'var(--green)'

  return (
    <div style={{ display: 'grid', gap: 10, marginBottom: 16 }} className="no-print">
      <div className="plata">
        <div className="plata-titulo">Cobrado al cliente</div>
        <div className="plata-fila"><span>Precio de la venta</span><span>{money(r.precio, r.moneda)}</span></div>
        {r.recargoCliente > 0 && (
          <div className="plata-fila"><span>+ Recargo de tarjeta</span><span>{money(r.recargoCliente, r.moneda)}</span></div>
        )}
        {r.recargoCliente > 0 && (
          <div className="plata-fila plata-total"><span>Pagó el cliente</span><span>{money(r.pagaElCliente, r.moneda)}</span></div>
        )}
        {r.recargoCliente > 0 && (
          <div className="plata-nota">El recargo compensa lo que cobra la tarjeta: no es ganancia.</div>
        )}
      </div>

      {destinos.length > 0 && (
        <div className="plata">
          <div className="plata-titulo">A dónde fue la plata</div>
          {destinos.map(d => (
            <div key={d.clave} className="plata-fila">
              <span>
                {d.etiqueta}<span className="plata-cuando" data-c={d.cuando}>{CUANDO[d.cuando]}</span>
                {d.detalle && <span className="plata-sub" style={{ display: 'block' }}>{d.detalle}</span>}
              </span>
              <span>{money(d.monto, d.moneda)}</span>
            </div>
          ))}
        </div>
      )}

      {r.gananciaUSD != null && (
        <div className="plata">
          <div className="plata-titulo">Ganancia</div>
          {r.costoFinanciacion > 0 && (
            <div className="plata-fila"><span>Se quedó la tarjeta o financiera</span><span style={{ color: 'var(--red)' }}>− {money(r.costoFinanciacion, r.moneda)}</span></div>
          )}
          <div className="plata-fila plata-total" style={{ color: tono }}>
            <span>{r.gananciaUSD < 0 ? 'Pérdida' : 'Ganancia'}{r.costoIncompleto ? ' *' : ''}</span>
            <span>
              {r.moneda === 'ARS' && r.ganancia != null
                ? <>{money(r.ganancia, 'ARS')} <span className="plata-sub">(U$ {r.gananciaUSD.toLocaleString('es-AR', { maximumFractionDigits: 2 })})</span></>
                : `U$ ${r.gananciaUSD.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`}
            </span>
          </div>
          {r.pendiente > 0 && (
            <div className="plata-nota" style={{ color: 'var(--amber)' }}>
              Falta cobrar {money(r.pendiente, r.moneda)}: la ganancia se cuenta hoy, pero parte de la plata todavía no entró.
            </div>
          )}
          {r.costoIncompleto && <div className="plata-nota">* Falta el costo de algún producto: la ganancia es provisoria.</div>}
        </div>
      )}
    </div>
  )
}

/** Chips cortos del medio de pago para la lista: "Visa 3c", "Transf. · Galicia". */
export function chipsDePago(sale: Pick<Sale, 'payments'>): string[] {
  const CORTO: Record<string, string> = {
    ars_cash: 'Efvo ARS', usd_cash: 'Efvo USD', ars_transf: 'Transf ARS', usd_transf: 'Transf USD',
    usdt: 'USDT', tradein: 'Canje', vuelto: 'Vuelto',
  }
  const out: string[] = []
  for (const p of (sale.payments || []) as Record<string, unknown>[]) {
    const id = String(p.id || '')
    if (id === 'vuelto') continue
    const base = id === 'tarjeta' ? String(p.label || 'Tarjeta') : (CORTO[id] || String(p.label || id))
    const cuenta = p.account_name && !base.startsWith(String(p.account_name)) ? ` · ${p.account_name}` : ''
    const chip = `${base}${cuenta}`
    if (!out.includes(chip)) out.push(chip)
  }
  return out
}
