import { describe, it, expect } from 'vitest'
import { fuenteValida, valorDeVenta, leerBlueCordoba, numeroInfodolar } from './cotizacion'

describe('fuenteValida', () => {
  it('sin elegir, o con cualquier otra cosa, es manual (lo de siempre)', () => {
    expect(fuenteValida(undefined)).toBe('manual')
    expect(fuenteValida(null)).toBe('manual')
    expect(fuenteValida('oficial')).toBe('manual')
  })
  it('acepta blue y cripto', () => {
    expect(fuenteValida('blue')).toBe('blue')
    expect(fuenteValida('cripto')).toBe('cripto')
  })
})

describe('valorDeVenta', () => {
  it('toma el valor de venta y lo redondea a pesos', () => {
    expect(valorDeVenta({ compra: 1590, venta: 1610 })).toBe(1610)
    expect(valorDeVenta({ compra: 1601.2, venta: 1625.7 })).toBe(1626)
  })
  it('sin un valor válido no inventa una cotización', () => {
    expect(valorDeVenta(null)).toBeNull()
    expect(valorDeVenta({})).toBeNull()
    expect(valorDeVenta({ venta: 0 })).toBeNull()
    expect(valorDeVenta({ venta: 'abc' })).toBeNull()
  })
})


// La tabla tal cual la publica infodolar.com (Córdoba, 30/10/2026).
const TABLA_INFODOLAR = `
                <table class="cotizaciones" id="BluePromedio">
                <thead>
                    <tr>
                        <th class="dolar"></th>
                        <th class="dolar">Compra</th>
                        <th class="dolar">Venta</th>
                        <th class="dolar">Variación</th>
                        <th class="dolar">Spread</th>
                        <th class="dolar"><i class="far fa-clock"></i></th>
                    </tr>
                </thead>
                        <tr>
                            <td class="colNombre">
                                <span class="nombre"><a href="/cotizacion-dolar-blue.aspx">Dólar Blue</a> en Córdoba</span>
                            </td>
                            <td class="colCompraVenta" data-order="$ 1.549,00">
                                $ 1.549,00
                                <span class="variacionCompraVenta"><span class="igual"> = $ 0,00</span></span>
                            </td>
                            <td class="colCompraVenta" data-order="$ 1.581,00">
                                $ 1.581,00
                                <span class="variacionCompraVenta"><span class="igual"> = $ 0,00</span></span>
                            </td>
                            <td class="colVariacion">
                                <span class="variacion"><span class="igual"> = 0,00 %</span></span>
                            </td>
                            <td class="colSpread">
                                $ 32,00
                            </td>
                            <td class="colFecha">
                                <abbr class="timeago date" title="2026-10-30T14:11:00-03:00">viernes, 30 de octubre de 2026 14:11 Argentina</abbr>
                            </td>
                        </tr>
</table>`

describe('blue de Córdoba (infodolar)', () => {
  it('lee compra y venta de la tabla del blue', () => {
    expect(leerBlueCordoba(TABLA_INFODOLAR)).toEqual({ compra: 1549, venta: 1581, fecha: '2026-10-30T14:11:00-03:00' })
  })

  it('pasa los números con punto de miles y coma decimal', () => {
    expect(numeroInfodolar('$ 1.581,00')).toBe(1581)
    expect(numeroInfodolar('$ 1.571,50')).toBe(1571.5)
    expect(numeroInfodolar('—')).toBeNull()
  })

  it('si la página cambió, no inventa un número', () => {
    expect(leerBlueCordoba('<html><body>Mantenimiento</body></html>')).toBeNull()
    expect(leerBlueCordoba(TABLA_INFODOLAR.replace(/\$ 1\.581,00/g, '$ 0,00'))).toBeNull()
    expect(leerBlueCordoba(TABLA_INFODOLAR.replace(/\$ 1\.581,00/g, '$ 1.000,00'))).toBeNull() // venta < compra
  })

  it('es una fuente válida', () => {
    expect(fuenteValida('blue_cordoba')).toBe('blue_cordoba')
    expect(fuenteValida('otra')).toBe('manual')
  })
})
