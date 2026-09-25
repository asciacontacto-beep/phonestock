import { describe, it, expect } from 'vitest'
import { configuracionDelLocal, SIN_LOCAL } from './configuracion'

/**
 * El caso que motivó esto: un ticket salió impreso con el nombre, el logo y
 * los datos de OTRO local. La configuración se leía con "dame la primera
 * fila" confiando en que la base mostrara sólo la propia, y la base mostraba
 * las de todos.
 */

function supabaseFalso() {
  const llamadas: [string, ...unknown[]][] = []
  const q = {
    select: (...a: unknown[]) => { llamadas.push(['select', ...a]); return q },
    eq: (...a: unknown[]) => { llamadas.push(['eq', ...a]); return q },
    limit: (...a: unknown[]) => { llamadas.push(['limit', ...a]); return q },
    maybeSingle: () => { llamadas.push(['maybeSingle']); return Promise.resolve({ data: null, error: null }) },
  }
  const supabase = { from: (t: string) => { llamadas.push(['from', t]); return q } }
  return { supabase, llamadas }
}

describe('configuracionDelLocal', () => {
  it('pide la configuración de ESE local, no la primera que aparezca', async () => {
    const { supabase, llamadas } = supabaseFalso()
    await configuracionDelLocal(supabase as never, 'org-123', 'shop_name,logo_url')
    expect(llamadas).toContainEqual(['from', 'settings'])
    expect(llamadas).toContainEqual(['select', 'shop_name,logo_url'])
    expect(llamadas).toContainEqual(['eq', 'org_id', 'org-123'])
  })

  it('sin local conocido no trae nada, en vez de traer la de cualquiera', async () => {
    const { supabase, llamadas } = supabaseFalso()
    await configuracionDelLocal(supabase as never, null)
    expect(llamadas).toContainEqual(['eq', 'org_id', SIN_LOCAL])
    await configuracionDelLocal(supabase as never, undefined)
    expect(llamadas.filter(l => l[0] === 'eq').every(l => l[2] === SIN_LOCAL)).toBe(true)
  })

  it('por defecto trae todas las columnas', async () => {
    const { supabase, llamadas } = supabaseFalso()
    await configuracionDelLocal(supabase as never, 'org-1')
    expect(llamadas).toContainEqual(['select', '*'])
  })
})
