import { describe, it, expect } from 'vitest'
import { avisosDelNegocio, fechaDeAviso, etiquetaFecha, DIAS_PARADO } from './avisos'

describe('avisosDelNegocio', () => {
  it('sin nada pendiente no inventa avisos', () => {
    expect(avisosDelNegocio({ deudores: 0, parados: 0, listasParaEntregar: 0 })).toEqual([])
  })

  it('lo primero es la reparación lista: el cliente ya la está esperando', () => {
    const a = avisosDelNegocio({ deudores: 3, parados: 9, listasParaEntregar: 2 })
    expect(a[0].id).toBe('listas')
    expect(a[0].texto).toContain('2 reparaciones listas')
    expect(a[0].href).toBe('/repairs')
  })

  it('habla en singular cuando es uno solo', () => {
    const a = avisosDelNegocio({ deudores: 1, parados: 1, listasParaEntregar: 1 })
    expect(a.map(x => x.texto)).toEqual([
      'Hay 1 reparación lista esperando que la retiren',
      '1 venta quedó con saldo sin cobrar',
      `1 equipo lleva más de ${DIAS_PARADO} días sin venderse`,
    ])
  })

  it('muchos equipos parados pasan a rojo: ya no es un caso suelto', () => {
    expect(avisosDelNegocio({ deudores: 0, parados: 4, listasParaEntregar: 0 })[0].tono).toBe('ambar')
    expect(avisosDelNegocio({ deudores: 0, parados: 5, listasParaEntregar: 0 })[0].tono).toBe('rojo')
  })
})

describe('fechaDeAviso', () => {
  it('lee la fecha del id', () => {
    expect(fechaDeAviso('catalogo-2026-09-19')).toEqual(new Date(2026, 8, 19))
    expect(fechaDeAviso('referidos-2026-09')).toEqual(new Date(2026, 8, 1))
  })

  it('las novedades viejas sin fecha devuelven null', () => {
    expect(fechaDeAviso('turnos-launch')).toBeNull()
    expect(fechaDeAviso('mejoras-jun27')).toBeNull()
  })
})

describe('etiquetaFecha', () => {
  const hoy = new Date(2026, 8, 19)

  it('usa palabras para lo reciente', () => {
    expect(etiquetaFecha(new Date(2026, 8, 19), hoy)).toBe('hoy')
    expect(etiquetaFecha(new Date(2026, 8, 18), hoy)).toBe('ayer')
    expect(etiquetaFecha(new Date(2026, 8, 16), hoy)).toBe('hace 3 días')
  })

  it('pasada la semana muestra el día', () => {
    expect(etiquetaFecha(new Date(2026, 8, 1), hoy)).toMatch(/1/)
  })

  it('sin fecha no muestra nada', () => {
    expect(etiquetaFecha(null, hoy)).toBe('')
  })
})
