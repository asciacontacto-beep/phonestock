import { describe, it, expect } from 'vitest'
import { medidas, rutaMiniatura, urlFoto } from './fotos'

describe('medidas', () => {
  it('achica una foto vertical de telefono al lado maximo', () => {
    expect(medidas(3024, 4032, 1600)).toEqual({ ancho: 1200, alto: 1600 })
  })

  it('achica una horizontal por el ancho', () => {
    expect(medidas(4000, 3000, 1600)).toEqual({ ancho: 1600, alto: 1200 })
  })

  it('nunca agranda una foto chica', () => {
    expect(medidas(800, 600, 1600)).toEqual({ ancho: 800, alto: 600 })
  })
})

describe('rutaMiniatura', () => {
  it('agrega -mini antes de la extension', () => {
    expect(rutaMiniatura('org/42/abc.webp')).toBe('org/42/abc-mini.webp')
    expect(rutaMiniatura('org/42/abc.jpg')).toBe('org/42/abc-mini.jpg')
  })
})

describe('urlFoto', () => {
  it('arma la URL publica del deposito, y la de la miniatura', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc.supabase.co/'
    expect(urlFoto('org/42/x.webp')).toBe('https://abc.supabase.co/storage/v1/object/public/catalogo/org/42/x.webp')
    expect(urlFoto('org/42/x.webp', true)).toBe('https://abc.supabase.co/storage/v1/object/public/catalogo/org/42/x-mini.webp')
  })
})
