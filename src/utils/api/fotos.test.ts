import { describe, it, expect, beforeEach } from 'vitest'
import { fotosDeEquipo, agregarFotos } from './fotos'

beforeEach(() => { process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc.supabase.co' })

const BASE = 'https://abc.supabase.co/storage/v1/object/public/catalogo'

describe('fotosDeEquipo', () => {
  it('devuelve links completos de la foto grande y de la miniatura, no rutas internas', () => {
    const r = fotosDeEquipo({ brand: 'Apple', model: 'iPhone 13', photos: ['org1/42/a.webp', 'org1/42/b.webp'] })
    expect(r.fotos).toEqual([`${BASE}/org1/42/a.webp`, `${BASE}/org1/42/b.webp`])
    expect(r.miniaturas).toEqual([`${BASE}/org1/42/a-mini.webp`, `${BASE}/org1/42/b-mini.webp`])
    expect(r.fotos_origen).toBe('equipo')
  })

  it('un equipo sin fotos usa las de otro del mismo modelo, y lo avisa', () => {
    const candidatos = [{ brand: 'Apple', model: 'iPhone 13', color: 'Negro', photos: ['org1/7/x.webp'] }]
    const r = fotosDeEquipo({ brand: 'Apple', model: 'iPhone 13', color: 'Azul', photos: [] }, candidatos)
    expect(r.fotos).toEqual([`${BASE}/org1/7/x.webp`])
    expect(r.fotos_origen).toBe('modelo')
  })

  it('entre los del mismo modelo prefiere el del mismo color', () => {
    const candidatos = [
      { brand: 'Apple', model: 'iPhone 13', color: 'Negro', photos: ['org1/1/negro.webp'] },
      { brand: 'Apple', model: 'iPhone 13', color: 'Azul', photos: ['org1/2/azul.webp'] },
    ]
    const r = fotosDeEquipo({ brand: 'Apple', model: 'iPhone 13', color: 'azul', photos: [] }, candidatos)
    expect(r.fotos).toEqual([`${BASE}/org1/2/azul.webp`])
  })

  it('no mezcla modelos distintos ni marcas distintas', () => {
    const candidatos = [
      { brand: 'Apple', model: 'iPhone 13 Pro', photos: ['org1/1/pro.webp'] },
      { brand: 'Samsung', model: 'iPhone 13', photos: ['org1/2/otra.webp'] },
    ]
    const r = fotosDeEquipo({ brand: 'Apple', model: 'iPhone 13', photos: [] }, candidatos)
    expect(r.fotos).toEqual([])
    expect(r.fotos_origen).toBeNull()
  })

  it('compara el modelo sin importar mayúsculas ni espacios de más', () => {
    const candidatos = [{ brand: 'apple', model: '  IPHONE 13 ', photos: ['org1/1/a.webp'] }]
    expect(fotosDeEquipo({ brand: 'Apple', model: 'iPhone 13', photos: [] }, candidatos).fotos).toHaveLength(1)
  })

  it('las fotos propias ganan aunque haya otras del modelo', () => {
    const candidatos = [{ brand: 'Apple', model: 'iPhone 13', photos: ['org1/9/otra.webp'] }]
    const r = fotosDeEquipo({ brand: 'Apple', model: 'iPhone 13', photos: ['org1/3/mia.webp'] }, candidatos)
    expect(r.fotos).toEqual([`${BASE}/org1/3/mia.webp`])
    expect(r.fotos_origen).toBe('equipo')
  })

  it('sin fotos y sin nada parecido: listas vacías, nunca null', () => {
    const r = fotosDeEquipo({ brand: 'Apple', model: 'iPhone 13' })
    expect(r).toEqual({ fotos: [], miniaturas: [], fotos_origen: null })
  })

  it('ignora entradas que no son una ruta', () => {
    const r = fotosDeEquipo({ brand: 'A', model: 'M', photos: ['', null, 42, 'org1/1/ok.webp'] as any })
    expect(r.fotos).toEqual([`${BASE}/org1/1/ok.webp`])
  })
})

/** Un cliente de base de datos de mentira: responde lo que se le diga al final de la cadena. */
const dbFalsa = (resultado: () => Promise<{ data: any[] | null }>) => {
  const consultas: string[] = []
  const cadena: any = {}
  for (const m of ['select', 'in', 'neq', 'order']) cadena[m] = (...a: any[]) => { consultas.push(`${m}:${a[0]}`); return cadena }
  cadena.limit = () => resultado()
  return { db: { from: () => cadena } as any, consultas }
}

describe('agregarFotos', () => {
  it('con una sola consulta completa a los equipos sin foto con las de su modelo', async () => {
    const { db, consultas } = dbFalsa(async () => ({ data: [{ brand: 'Apple', model: 'iPhone 13', color: 'Negro', photos: ['org1/7/x.webp'] }] }))
    const filas = [
      { id: 1, brand: 'Apple', model: 'iPhone 13', photos: [] as string[] },
      { id: 2, brand: 'Apple', model: 'iPhone 13', photos: ['org1/2/mia.webp'] },
    ]
    const r = await agregarFotos(db, filas)
    expect(r[0].fotos_origen).toBe('modelo')
    expect(r[1].fotos_origen).toBe('equipo')
    expect(r[0].id).toBe(1)
    expect(consultas.filter(c => c.startsWith('select'))).toHaveLength(1)
  })

  it('si todos tienen fotos propias no consulta nada', async () => {
    const { db, consultas } = dbFalsa(async () => ({ data: [] }))
    await agregarFotos(db, [{ brand: 'A', model: 'M', photos: ['org1/1/a.webp'] }])
    expect(consultas).toHaveLength(0)
  })

  it('si la búsqueda de fotos del modelo falla, el listado sale igual', async () => {
    const { db } = dbFalsa(async () => { throw new Error('caída') })
    const r = await agregarFotos(db, [{ brand: 'Apple', model: 'iPhone 13', photos: [] as string[] }])
    expect(r).toHaveLength(1)
    expect(r[0].fotos).toEqual([])
    expect(r[0].fotos_origen).toBeNull()
  })
})
