import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { Receipt } from './Receipt'

const shop = { shop_name: 'Local', garantia_dias: 45, receipt_config: { warrantyDefault: '90 días por fallas de fábrica', showWarranty: true, showImei: true } }
const venta = { id: 'abc123', brand: 'Apple', model: 'iPhone 13', storage: '128GB', color: 'Negro', price: 500, currency: 'USD', created_at: '2026-10-30T15:00:00Z', payments: [], imei: '358901234567891' }
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

describe('garantía en el comprobante', () => {
  it('imprime los días de la venta, no el texto fijo de 90', () => {
    const t = texto(renderToStaticMarkup(createElement(Receipt, { sale: { ...venta, warranty_days: 45, notes: 'Con caja y cargador' }, shop })))
    expect(t).toContain('Garantía: 45 días por fallas de fábrica')
    expect(t).not.toContain('90 días')
    // Las notas no se hacen pasar por garantía.
    expect(t).toContain('Con caja y cargador')
  })

  it('una venta vieja sin días usa los del local', () => {
    const t = texto(renderToStaticMarkup(createElement(Receipt, { sale: venta, shop })))
    expect(t).toContain('Garantía: 45 días por fallas de fábrica')
  })

  it('sin garantía', () => {
    const t = texto(renderToStaticMarkup(createElement(Receipt, { sale: { ...venta, warranty_days: 0 }, shop })))
    expect(t).toContain('Garantía: Sin garantía')
  })
})
