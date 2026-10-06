import { describe, it, expect } from 'vitest'
import { esRuido } from './reportarError'
import { navegadorDe } from './navegador'

describe('reportarError', () => {
  it('descarta el ruido que no es de la app', () => {
    expect(esRuido('ResizeObserver loop completed with undelivered notifications.')).toBe(true)
    expect(esRuido('Script error.')).toBe(true)
    expect(esRuido('x is undefined', 'at foo (chrome-extension://abc/inject.js:1:2)')).toBe(true)
    expect(esRuido('NEXT_REDIRECT')).toBe(true)
    expect(esRuido('AbortError: The user aborted a request.')).toBe(true)
  })
  it('deja pasar los errores reales', () => {
    expect(esRuido("Cannot read properties of undefined (reading 'price')")).toBe(false)
    expect(esRuido('Stock: column stock.upc does not exist')).toBe(false)
  })
})

describe('navegadorDe', () => {
  it('reconoce los navegadores de los clientes', () => {
    expect(navegadorDe('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Safari/605.1.15')).toBe('Safari 15.6 · Mac')
    expect(navegadorDe('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')).toBe('Safari 17.0 · iPhone/iPad')
    expect(navegadorDe('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36')).toBe('Chrome 129 · Windows')
    expect(navegadorDe('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36')).toBe('Chrome 128 · Android')
    expect(navegadorDe(null)).toBe('Desconocido')
  })
})
