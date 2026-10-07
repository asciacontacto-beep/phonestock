import { describe, it, expect } from 'vitest'
import { variantesDeCodigo, codigoCanonico, esImei, colorDeLaApp, modeloDeLaApp, equipoParaLaApp, buscarEquipoPorCodigo } from './codigos'

describe('variantesDeCodigo / codigoCanonico', () => {
  it('el UPC de Apple leído como EAN-13 (0 adelante) es el mismo código', () => {
    expect(codigoCanonico('0195949820908')).toBe('195949820908')
    expect(variantesDeCodigo('195949820908')).toContain('0195949820908')
    expect(codigoCanonico('00195949820908')).toBe('195949820908') // GTIN-14
  })
  it('tolera espacios y guiones de la pistola', () => {
    expect(codigoCanonico(' 1959-4982 0908 ')).toBe('195949820908')
  })
  it('vacío no busca nada', () => {
    expect(variantesDeCodigo('')).toEqual([])
  })
})

describe('esImei', () => {
  it('reconoce un IMEI válido, con o sin rótulo y espacios', () => {
    expect(esImei('490154203237518')).toBe(true)
    expect(esImei('IMEI: 49 015420 323751 8')).toBe(true)
    expect(esImei('IMEI/MEID 490154203237518')).toBe(true)
  })
  it('no confunde un UPC ni un IMEI con dígito verificador mal', () => {
    expect(esImei('195949820908')).toBe(false)
    expect(esImei('490154203237519')).toBe(false)
  })
})

describe('nombres de la tabla fija → app', () => {
  it('traduce colores al nombre del modelo', () => {
    expect(colorDeLaApp('iPhone 16', 'Black')).toBe('Negro')
    expect(colorDeLaApp('iPhone 16', 'Teal')).toBe('Verde Azulado (Teal)')
    expect(colorDeLaApp('iPhone 13', 'Starlight')).toBe('Blanco Estrella')
    expect(colorDeLaApp('iPhone 14', 'Starlight')).toBe('Blanco Estelar')
    expect(colorDeLaApp('iPhone 15 Pro', 'Natural Titanium')).toBe('Titanio Natural')
  })
  it('un color que ya está en castellano queda igual', () => {
    expect(colorDeLaApp('iPhone 16', 'Rosa')).toBe('Rosa')
  })
  it('el SE con el nombre de la app', () => {
    expect(modeloDeLaApp('Apple', 'iPhone SE (3rd Gen)')).toBe('iPhone SE (3ra Gen)')
  })
  it('arma el equipo completo', () => {
    expect(equipoParaLaApp({ brand: 'Apple', model: 'iPhone 16', storage: '256GB', color: 'White' }, '1'))
      .toEqual({ brand: 'Apple', model: 'iPhone 16', storage: '256GB', color: 'Blanco', codigo: '1' })
  })
})

describe('buscarEquipoPorCodigo', () => {
  const sinCatalogo: any = { from: () => ({ select: () => ({ in: () => ({ limit: async () => ({ data: [] }) }) }) }) }

  it('encuentra en la tabla fija aunque venga con el 0 adelante', async () => {
    const e = await buscarEquipoPorCodigo(sinCatalogo, '0195949820908')
    expect(e).toMatchObject({ model: 'iPhone 16', storage: '128GB', color: 'Negro' })
  })

  it('si no está en la tabla fija, busca en lo aprendido por el local', async () => {
    let pedido: string[] = []
    const conCatalogo: any = { from: () => ({ select: () => ({ in: (_c: string, v: string[]) => { pedido = v; return { limit: async () => ({ data: [{ upc: '123456789012', brand: 'Apple', model: 'iPhone 13 Pro', storage: '256GB', color: 'Grafito' }] }) } } }) }) }
    const e = await buscarEquipoPorCodigo(conCatalogo, '0123456789012')
    expect(pedido).toContain('123456789012')
    expect(e).toMatchObject({ model: 'iPhone 13 Pro', color: 'Grafito' })
  })

  it('código desconocido: null', async () => {
    expect(await buscarEquipoPorCodigo(sinCatalogo, '999999999999')).toBeNull()
  })
})
