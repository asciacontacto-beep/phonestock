# Accesorios sueltos + Rentabilidad por categoría — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir vender accesorios sueltos (sin equipo, en ARS) y mostrar rentabilidad separada por categoría (Equipos / Accesorios / Servicio Técnico) en Reports y Dashboard.

**Architecture:** Las ventas se siguen guardando en `sales`; la categoría se deriva del campo `brand` (magic-string, convención ya existente: `SERVICIO`, `MOVIMIENTO`). Un módulo puro nuevo `src/utils/sales.ts` centraliza la clasificación y el cálculo de rentabilidad por categoría (con tests). La venta de accesorios sueltos reusa el flujo de `/sell` con un modo `accessoryOnly`. Reports y Dashboard consumen el módulo puro.

**Tech Stack:** Next.js 16.2.6 (App Router), React 19, TypeScript, Supabase JS, recharts, lucide-react, sonner. CSS global (sin Tailwind components). Vitest (devDependency nueva) solo para el módulo puro.

## Global Constraints

- **Sin migraciones SQL.** La categoría se deriva por `brand`. Reusar la RPC existente `decrement_accessory_stock(acc_id, qty)`.
- **Accesorios siempre en ARS** (regla de negocio). La venta de accesorios sueltos no muestra selector de moneda.
- **Sin Tailwind.** Usar clases de `globals.css` (`sc`, `sl`, `sv`, `sg`, `card`, `btn`, `btn-dark`, `btn-outline`, `lbl`, `inp`, `badge`, `b-green`, `b-neu`) y estilos inline como el resto del código.
- **Iconos:** lucide-react. **Toasts:** sonner.
- **Magic-strings de categoría:** `brand === 'SERVICIO'` = servicio, `brand === 'ACCESORIOS'` = accesorios, `brand === 'MOVIMIENTO'` = excluido, resto = equipos.
- **Anti-doble-conteo:** Equipos usa `sales.price`; Accesorios usa SOLO el JSON `sales.accessories` (de todas las ventas); Servicio usa `sales.price` de filas `SERVICIO` y el costo de `repairs.cost`.
- **Normalización a USD** en los cálculos de rentabilidad con `exchangeRate`, igual que el Reports actual (`ARS / exchangeRate`).
- Worktree: `/Users/juanpedronielsen/Documents/phonestock-main/.claude/worktrees/stackr-redesign/`. Rutas con `(app)` requieren escapar paréntesis en bash.
- Tras cada commit en worktree: el coordinador mergea a main con `git -C /Users/juanpedronielsen/Documents/phonestock-main merge worktree-stackr-redesign --no-ff`.

---

### Task 1: Módulo puro `src/utils/sales.ts` + tests (vitest)

**Files:**
- Create: `src/utils/sales.ts`
- Create: `src/utils/sales.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json` (devDependency `vitest`, script `"test": "vitest run"`)

**Interfaces:**
- Consumes: nada (módulo base).
- Produces (lo usan Task 4 y 5):
  - `type SaleCategory = 'device' | 'accessory' | 'service' | 'movement'`
  - `function saleCategory(sale: { brand?: string | null }): SaleCategory`
  - `function toUSD(amount: number, currency: string | null | undefined, rate: number): number`
  - `function saleAccessoriesRevenueUSD(sale: any, rate: number): number`
  - `function saleAccessoriesCostUSD(sale: any, rate: number): number`
  - `type CategoryStats = { revenue: number; cost: number; profit: number; margin: number }`
  - `type CategoryBreakdown = { device: CategoryStats; accessory: CategoryStats; service: CategoryStats }`
  - `function categoryBreakdown(sales: any[], repairs: any[], exchangeRate: number): CategoryBreakdown`
  - Convención `repairs`: cada repair tiene `{ cost?: number | null }`, costo en ARS. El **caller** filtra `sales` y `repairs` por fecha antes de pasarlos.

- [ ] **Step 1: Instalar vitest como devDependency**

Run:
```bash
cd /Users/juanpedronielsen/Documents/phonestock-main/.claude/worktrees/stackr-redesign
npm install -D vitest
```
Expected: `vitest` agregado en `devDependencies` de `package.json`. (No afecta el bundle de Next; es solo dev.)

- [ ] **Step 2: Agregar script de test**

En `package.json`, dentro de `"scripts"`, agregar la línea `"test"` (dejar las demás intactas):
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run"
}
```

- [ ] **Step 3: Crear `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
```

- [ ] **Step 4: Escribir los tests (fallan primero)**

Create `src/utils/sales.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  saleCategory,
  toUSD,
  saleAccessoriesRevenueUSD,
  saleAccessoriesCostUSD,
  categoryBreakdown,
} from './sales'

describe('saleCategory', () => {
  it('clasifica por brand', () => {
    expect(saleCategory({ brand: 'SERVICIO' })).toBe('service')
    expect(saleCategory({ brand: 'ACCESORIOS' })).toBe('accessory')
    expect(saleCategory({ brand: 'MOVIMIENTO' })).toBe('movement')
    expect(saleCategory({ brand: 'Apple' })).toBe('device')
    expect(saleCategory({ brand: null })).toBe('device')
    expect(saleCategory({})).toBe('device')
  })
})

describe('toUSD', () => {
  it('USD pasa igual, ARS divide por la cotización', () => {
    expect(toUSD(100, 'USD', 1000)).toBe(100)
    expect(toUSD(1000, 'ARS', 1000)).toBe(1)
    expect(toUSD(0, 'ARS', 1000)).toBe(0)
    expect(toUSD(500, null, 1000)).toBe(0.5) // null => ARS
  })
})

describe('accesorios de una venta', () => {
  const sale = {
    accessories: [
      { price: 1000, qty: 2, cost_price: 600, currency: 'ARS', is_gift: false },
      { price: 5000, qty: 1, cost_price: 3000, currency: 'ARS', is_gift: true }, // regalo: revenue 0, costo cuenta
    ],
  }
  it('revenue ignora regalos', () => {
    expect(saleAccessoriesRevenueUSD(sale, 1000)).toBeCloseTo(2, 5) // 2000 ARS => 2 USD
  })
  it('cost suma todos (incluido regalo)', () => {
    // (600*2) + (3000*1) = 4200 ARS => 4.2 USD
    expect(saleAccessoriesCostUSD(sale, 1000)).toBeCloseTo(4.2, 5)
  })
})

describe('categoryBreakdown', () => {
  it('separa equipos, accesorios y servicio sin doble conteo', () => {
    const sales = [
      // equipo con un accesorio embebido
      { brand: 'Apple', price: 500, cost_price: 400, currency: 'USD',
        accessories: [{ price: 1000, qty: 1, cost_price: 600, currency: 'ARS', is_gift: false }] },
      // accesorios sueltos (ARS)
      { brand: 'ACCESORIOS', price: 2000, cost_price: 1200, currency: 'ARS',
        accessories: [{ price: 2000, qty: 1, cost_price: 1200, currency: 'ARS', is_gift: false }] },
      // servicio
      { brand: 'SERVICIO', price: 10000, cost_price: 0, currency: 'ARS', accessories: [] },
      // movimiento de caja: se ignora
      { brand: 'MOVIMIENTO', price: 99999, cost_price: 0, currency: 'ARS', accessories: [] },
    ]
    const repairs = [{ cost: 3000 }, { cost: null }]
    const r = categoryBreakdown(sales, repairs, 1000)

    // Equipos: revenue = 500 USD, cost = 400 USD
    expect(r.device.revenue).toBeCloseTo(500, 5)
    expect(r.device.cost).toBeCloseTo(400, 5)
    expect(r.device.profit).toBeCloseTo(100, 5)

    // Accesorios: revenue = (1000 + 2000) ARS = 3 USD ; cost = (600 + 1200) ARS = 1.8 USD
    expect(r.accessory.revenue).toBeCloseTo(3, 5)
    expect(r.accessory.cost).toBeCloseTo(1.8, 5)
    expect(r.accessory.profit).toBeCloseTo(1.2, 5)

    // Servicio: revenue = 10000 ARS = 10 USD ; cost = 3000 ARS = 3 USD
    expect(r.service.revenue).toBeCloseTo(10, 5)
    expect(r.service.cost).toBeCloseTo(3, 5)
    expect(r.service.profit).toBeCloseTo(7, 5)

    // margin equipos = 100/500 = 20%
    expect(r.device.margin).toBeCloseTo(20, 5)
  })
})
```

- [ ] **Step 5: Correr los tests para verlos fallar**

Run: `npm test`
Expected: FAIL — `Cannot find module './sales'` / funciones no definidas.

- [ ] **Step 6: Implementar `src/utils/sales.ts`**

```ts
export type SaleCategory = 'device' | 'accessory' | 'service' | 'movement'

export function saleCategory(sale: { brand?: string | null }): SaleCategory {
  const b = (sale.brand || '').toUpperCase()
  if (b === 'MOVIMIENTO') return 'movement'
  if (b === 'SERVICIO') return 'service'
  if (b === 'ACCESORIOS') return 'accessory'
  return 'device'
}

export function toUSD(amount: number, currency: string | null | undefined, rate: number): number {
  if (!amount) return 0
  return currency === 'USD' ? amount : amount / (rate || 1)
}

export function saleAccessoriesRevenueUSD(sale: any, rate: number): number {
  return (sale.accessories || []).reduce((acc: number, a: any) => {
    if (a.is_gift) return acc
    return acc + toUSD((a.price || 0) * (a.qty || 1), a.currency || 'ARS', rate)
  }, 0)
}

export function saleAccessoriesCostUSD(sale: any, rate: number): number {
  return (sale.accessories || []).reduce(
    (acc: number, a: any) => acc + toUSD((a.cost_price || 0) * (a.qty || 1), a.currency || 'ARS', rate),
    0,
  )
}

export type CategoryStats = { revenue: number; cost: number; profit: number; margin: number }
export type CategoryBreakdown = { device: CategoryStats; accessory: CategoryStats; service: CategoryStats }

function stats(revenue: number, cost: number): CategoryStats {
  const profit = revenue - cost
  return { revenue, cost, profit, margin: revenue > 0 ? (profit / revenue) * 100 : 0 }
}

export function categoryBreakdown(sales: any[], repairs: any[], exchangeRate: number): CategoryBreakdown {
  let deviceRev = 0, deviceCost = 0
  let accRev = 0, accCost = 0
  let svcRev = 0

  for (const s of sales) {
    const cat = saleCategory(s)
    if (cat === 'movement') continue

    // Accesorios: del JSON de TODAS las ventas (equipo + sueltas)
    accRev += saleAccessoriesRevenueUSD(s, exchangeRate)
    accCost += saleAccessoriesCostUSD(s, exchangeRate)

    if (cat === 'device') {
      deviceRev += toUSD(s.price || 0, s.currency, exchangeRate)
      deviceCost += toUSD(s.cost_price || 0, s.currency, exchangeRate)
    } else if (cat === 'service') {
      svcRev += toUSD(s.price || 0, s.currency, exchangeRate)
    }
    // cat === 'accessory': su price/cost NO se usan (se cuentan vía JSON arriba)
  }

  const svcCost = (repairs || []).reduce(
    (acc: number, r: any) => acc + toUSD(r.cost || 0, 'ARS', exchangeRate),
    0,
  )

  return {
    device: stats(deviceRev, deviceCost),
    accessory: stats(accRev, accCost),
    service: stats(svcRev, svcCost),
  }
}
```

- [ ] **Step 7: Correr los tests para verlos pasar**

Run: `npm test`
Expected: PASS — todos los tests verdes.

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 9: Commit**

```bash
git add src/utils/sales.ts src/utils/sales.test.ts vitest.config.ts package.json package-lock.json
git commit -m "feat: módulo puro de clasificación y rentabilidad por categoría + tests"
```

---

### Task 2: Venta de accesorios sueltos en `/sell`

**Files:**
- Modify: `src/app/(app)/sell/SellClient.tsx`

**Interfaces:**
- Consumes: estado/flujo existente de `SellClient` (`unit`, `step`, `selectedAccessories`, `accessoriesList`, `deposits`, `selectedDeposit`, `payments`, `cust`, `confirm()`, RPC `decrement_accessory_stock`).
- Produce: inserta en `sales` filas con `brand: 'ACCESORIOS'`, `currency: 'ARS'`, `accessories` (JSON) — lo consumen Task 3, 4, 5.

**Contexto:** Hoy todo el flujo exige `unit` (un equipo). `confirm()` (línea ~161) hace `if (!unit || ...) return`. El paso 1 (línea ~275) solo deja elegir equipo. El paso 2 (línea ~376) filtra accesorios por `unit.deposit`. El paso 4 (línea ~443) muestra `unit.brand`. Hay un `accessoryOnly` mode nuevo que evita `unit`.

- [ ] **Step 1: Agregar estado `accessoryOnly`**

En la lista de `useState` de `SellClient` (después de `const [unit, setUnit] = useState<any>(null);`, línea ~18), agregar:
```tsx
  const [accessoryOnly, setAccessoryOnly] = useState(false);
```

- [ ] **Step 2: Botón de entrada en el paso 1**

En el `step === 1` (después del `<input>` de filtro, línea ~289, antes del bloque de stock bajo / tabla), agregar un botón que arranca el modo accesorios. Insertar justo después de la línea del `<input className="inp" placeholder="Filtrar por modelo...">`:
```tsx
          <button
            className="btn btn-outline"
            style={{ width: '100%', marginBottom: 16, justifyContent: 'center' }}
            onClick={() => {
              if (!selectedDeposit) { toast.error('Elegí un depósito primero'); return; }
              setAccessoryOnly(true);
              setUnit(null);
              setSc('ARS');
              setSp('');
              setStep(2);
            }}
          >
            <PackageOpen size={16} /> Vender accesorios sueltos
          </button>
```
(`PackageOpen` ya está importado en la línea 3.)

- [ ] **Step 3: En el paso 2, soportar modo accesorios (sin `unit`)**

El paso 2 referencia `unit.deposit` en el filtro de accesorios (línea ~385). Cambiar ese filtro para usar el depósito de `unit` o, en modo accesorios, el `selectedDeposit`, y forzar ARS. Reemplazar:
```tsx
                 {accessoriesList.filter(a => String(a.deposit_id) === String(unit.deposit)).map(a => (
```
por:
```tsx
                 {accessoriesList.filter(a => {
                    const dep = accessoryOnly ? selectedDeposit : unit?.deposit;
                    if (String(a.deposit_id) !== String(dep)) return false;
                    if (accessoryOnly && (a.currency || 'ARS') !== 'ARS') return false;
                    return true;
                  }).map(a => (
```

- [ ] **Step 4: En el botón "Continuar al Cliente" del paso 2, autocalcular precio en modo accesorios**

Reemplazar el `onClick` del botón "Continuar al Cliente" (línea ~430, el bloque que hoy tiene el comentario `// Update auto-calculated total price for Step 4`) por:
```tsx
            <button className="btn btn-dark btn-lg" style={{ flex: 1 }} onClick={() => {
               if (accessoryOnly) {
                 if (selectedAccessories.length === 0) { toast.error('Agregá al menos un accesorio'); return; }
                 const total = selectedAccessories.reduce((acc, c) => acc + (c.is_gift ? 0 : c.price * c.qty), 0);
                 setSp(String(total));
                 setSc('ARS');
               }
               setStep(3);
            }}>Continuar al Cliente</button>
```

- [ ] **Step 5: Paso 4 — encabezado y precio en modo accesorios**

El header del paso 4 (línea ~447) muestra `unit.brand unit.model`. Envolver para soportar modo accesorios. Reemplazar el bloque:
```tsx
          <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 8, marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{unit.brand} {unit.model}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{unit.storage} · {unit.color}</div>
            {isOwner && unit.cost_price && (
              <div style={{ fontSize: 11, marginTop: 6, color: 'var(--text-3)' }}>
                Precio de costo: <span style={{ fontFamily: 'JetBrains Mono' }}>{unit.currency === 'USD' ? 'U$' : '$'} {unit.cost_price?.toLocaleString()}</span>
              </div>
            )}
          </div>
```
por:
```tsx
          <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 8, marginBottom: 20 }}>
            {accessoryOnly ? (
              <>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Venta de accesorios</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  {selectedAccessories.map(a => `${a.qty}x ${a.name}`).join(' · ')}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{unit.brand} {unit.model}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{unit.storage} · {unit.color}</div>
                {isOwner && unit.cost_price && (
                  <div style={{ fontSize: 11, marginTop: 6, color: 'var(--text-3)' }}>
                    Precio de costo: <span style={{ fontFamily: 'JetBrains Mono' }}>{unit.currency === 'USD' ? 'U$' : '$'} {unit.cost_price?.toLocaleString()}</span>
                  </div>
                )}
              </>
            )}
          </div>
```

- [ ] **Step 6: Ramificar `confirm()` para modo accesorios**

Al inicio de `confirm()` (línea ~161), antes del `if (!unit || ...)`, insertar la rama de accesorios. Reemplazar:
```tsx
  const confirm = async () => {
    if (!unit || !price || !payments.length || !cust.name) { toast.error('Datos incompletos'); return; }
```
por:
```tsx
  const confirm = async () => {
    if (accessoryOnly) { await confirmAccessoryOnly(); return; }
    if (!unit || !price || !payments.length || !cust.name) { toast.error('Datos incompletos'); return; }
```

- [ ] **Step 7: Implementar `confirmAccessoryOnly()`**

Agregar la función nueva justo antes de `const confirm = async () => {` (línea ~161):
```tsx
  const confirmAccessoryOnly = async () => {
    if (selectedAccessories.length === 0) { toast.error('Agregá al menos un accesorio'); return; }
    if (!price || !payments.length) { toast.error('Datos incompletos'); return; }
    if (rem > 0.01) { toast.error('El pago debe ser completo'); return; }
    try {
      setLoading(true);
      const totalCost = selectedAccessories.reduce((acc, a) => acc + (a.cost_price || 0) * a.qty, 0);
      const resumen = selectedAccessories.map(a => `${a.qty}x ${a.name}`).join(' · ');
      const saleData = {
        seller_id: user.id,
        seller_name: user.name,
        deposit_id: selectedDeposit ? parseInt(String(selectedDeposit)) : null,
        brand: 'ACCESORIOS',
        model: resumen.slice(0, 120),
        storage: '-', color: '-',
        imei: `ACC-${Date.now()}`,
        cost_price: totalCost,
        price,
        currency: 'ARS',
        payments,
        customer: cust.name ? cust : { name: 'Consumidor Final' },
        notes: notes.trim() || null,
        accessories: selectedAccessories,
      };
      const { data: saleRow, error: sErr } = await supabase.from('sales').insert([saleData]).select();
      if (sErr) throw sErr;

      for (const acc of selectedAccessories) {
        const { error: accErr } = await supabase.rpc('decrement_accessory_stock', { acc_id: acc.id, qty: acc.qty });
        if (accErr) throw accErr;
      }

      setLastSale(saleRow[0]);
      toast.success('Venta de accesorios confirmada');
      setStep(1); setUnit(null); setAccessoryOnly(false); setPayments([]); setSp(''); setQ(''); setNotes(''); setSelectedAccessories([]);
      setCust({ name: '', dni: '', phone: '', email: '', instagram: '' });
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || 'Error al procesar venta');
    } finally {
      setLoading(false);
    }
  };
```

- [ ] **Step 8: Permitir continuar sin nombre de cliente en modo accesorios (paso 3)**

El botón "Continuar al Pago" del paso 3 (línea ~370) tiene `disabled={!cust.name}`. Cambiar a:
```tsx
            <button className="btn btn-dark btn-lg" style={{ flex: 1 }} disabled={!accessoryOnly && !cust.name} onClick={() => setStep(4)}>Continuar al Pago</button>
```

- [ ] **Step 9: Resetear `accessoryOnly` también al cerrar el comprobante**

En el `confirm()` normal (no accesorios), en el reset de estado (línea ~249) agregar `setAccessoryOnly(false);` para que una venta de equipo posterior no quede en modo accesorios. Reemplazar:
```tsx
      setStep(1); setUnit(null); setPayments([]); setSp(''); setQ(''); setNotes(''); setSelectedAccessories([]);
```
por:
```tsx
      setStep(1); setUnit(null); setAccessoryOnly(false); setPayments([]); setSp(''); setQ(''); setNotes(''); setSelectedAccessories([]);
```

- [ ] **Step 10: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 11: Verificación manual**

Run: `npm run dev` y abrir `/sell`.
Verificar:
1. Paso 1 muestra el botón "Vender accesorios sueltos". Sin depósito elegido → toast de error.
2. Con depósito → salta al paso 2, solo accesorios ARS de ese depósito.
3. Agregar 2 accesorios → "Continuar al Cliente" autocalcula el total.
4. Paso 3 se puede saltar sin nombre.
5. Paso 4 muestra "Venta de accesorios" + resumen; pago parcial bloquea el botón final.
6. Finalizar → toast OK, comprobante aparece, stock del accesorio baja (verificar en `/accessories`).
7. Una venta de EQUIPO normal sigue funcionando igual.

- [ ] **Step 12: Commit**

```bash
git add "src/app/(app)/sell/SellClient.tsx"
git commit -m "feat: venta de accesorios sueltos en ARS (modo accessoryOnly)"
```

---

### Task 3: Comprobante lista accesorios

**Files:**
- Modify: `src/components/Receipt.tsx`

**Interfaces:**
- Consumes: `sale.brand`, `sale.accessories` (JSON con `{ name, qty, price, is_gift, currency }`), `sale.currency`.
- Produce: comprobante legible para ventas `ACCESORIOS` y para equipos con accesorios.

**Contexto:** Hoy la sección PRODUCTO (líneas ~21-26) muestra `sale.brand sale.model / storage·color / IMEI`. No lista accesorios.

- [ ] **Step 1: Render condicional de la sección PRODUCTO**

Reemplazar el bloque (líneas ~21-26):
```tsx
      <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 11 }}>PRODUCTO</div>
      <div style={{ fontSize: 12, marginBottom: 10, lineHeight: 1.4 }}>
        <strong>{sale.brand} {sale.model}</strong><br />
        <span style={{ fontSize: 11 }}>{sale.storage} · {sale.color}</span><br />
        <span style={{ fontSize: 10, opacity: 0.8 }}>IMEI/Serie: {sale.imei}</span>
      </div>
```
por:
```tsx
      <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 11 }}>PRODUCTO</div>
      {sale.brand === 'ACCESORIOS' ? (
        <div style={{ fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>
          {(sale.accessories || []).map((a: any, i: number) => (
            <div key={i}>
              <strong>{a.qty}x {a.name}</strong>
              {a.is_gift
                ? <span style={{ fontSize: 10 }}> (regalo)</span>
                : <span style={{ fontSize: 10, opacity: 0.8 }}> — {sale.currency === 'USD' ? 'U$' : '$'} {((a.price || 0) * (a.qty || 1)).toLocaleString()}</span>}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, marginBottom: 10, lineHeight: 1.4 }}>
          <strong>{sale.brand} {sale.model}</strong><br />
          <span style={{ fontSize: 11 }}>{sale.storage} · {sale.color}</span><br />
          <span style={{ fontSize: 10, opacity: 0.8 }}>IMEI/Serie: {sale.imei}</span>
          {(sale.accessories || []).length > 0 && (
            <div style={{ marginTop: 6, fontSize: 11 }}>
              {sale.accessories.map((a: any, i: number) => (
                <div key={i}>+ {a.qty}x {a.name}{a.is_gift ? ' (regalo)' : ''}</div>
              ))}
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Verificación manual**

En `/sell`, hacer una venta de accesorios sueltos y verificar que el comprobante lista cada accesorio con su precio. Hacer una venta de equipo CON accesorios y verificar que aparecen debajo del equipo.

- [ ] **Step 4: Commit**

```bash
git add src/components/Receipt.tsx
git commit -m "feat: comprobante lista accesorios (sueltos y con equipo)"
```

---

### Task 4: Tarjetas de rentabilidad por categoría en Reports

**Files:**
- Modify: `src/app/(app)/reports/page.tsx`
- Modify: `src/app/(app)/reports/ReportsClient.tsx`

**Interfaces:**
- Consumes: `categoryBreakdown(sales, repairs, exchangeRate)` y `CategoryBreakdown` de `src/utils/sales.ts` (Task 1).
- Produce: UI; no expone interfaces nuevas.

**Contexto:** `reports/page.tsx` hoy fetchea sales/expenses/deposits/settings. `ReportsClient` filtra por fecha (`filteredSales`, `cutoff`) y muestra KPIs con clases `sc/sl/sv` (líneas ~153-176).

- [ ] **Step 1: Pasar `repairs` desde el server component**

En `reports/page.tsx`, agregar el fetch de `repairs` al `Promise.all` y pasarlo como prop. Reemplazar el `Promise.all([...])`:
```tsx
  const [
    { data: salesData },
    { data: expensesData },
    { data: depositsData },
    { data: settingsData }
  ] = await Promise.all([
    supabase.from('sales').select('*').order('created_at', { ascending: false }),
    supabase.from('expenses').select('*').order('created_at', { ascending: false }),
    supabase.from('deposits').select('*').order('name'),
    supabase.from('settings').select('*').maybeSingle()
  ])
```
por:
```tsx
  const [
    { data: salesData },
    { data: expensesData },
    { data: depositsData },
    { data: settingsData },
    { data: repairsData }
  ] = await Promise.all([
    supabase.from('sales').select('*').order('created_at', { ascending: false }),
    supabase.from('expenses').select('*').order('created_at', { ascending: false }),
    supabase.from('deposits').select('*').order('name'),
    supabase.from('settings').select('*').maybeSingle(),
    supabase.from('repairs').select('id, cost, created_at, updated_at')
  ])
```
Y agregar `repairs={repairsData || []}` al JSX `<ReportsClient ... />`.

- [ ] **Step 2: Aceptar la prop `repairs` y calcular el breakdown**

En `ReportsClient.tsx`, agregar import al tope:
```tsx
import { categoryBreakdown } from '@/utils/sales';
```
Cambiar la firma para aceptar `repairs`:
```tsx
export function ReportsClient({ sales, expenses, deposits, exchangeRate, repairs = [] }: {
  sales: any[];
  expenses: any[];
  deposits: any[];
  exchangeRate: number;
  repairs?: any[];
}) {
```

- [ ] **Step 3: Filtrar repairs por fecha y calcular el breakdown (con `useMemo`)**

Después del `useMemo` de `filteredSales` (línea ~25-28), agregar:
```tsx
  const filteredRepairs = useMemo(() =>
    cutoff ? repairs.filter(r => new Date(r.updated_at || r.created_at) >= cutoff) : repairs
  , [repairs, cutoff]);

  const breakdown = useMemo(
    () => categoryBreakdown(filteredSales, filteredRepairs, exchangeRate),
    [filteredSales, filteredRepairs, exchangeRate]
  );
```

- [ ] **Step 4: Renderizar 3 tarjetas de categoría**

Justo después del grid de KPIs existente (después de la tarjeta "Ganancia Neta", que cierra cerca de la línea ~177, antes del bloque de la gráfica de Tendencia en línea ~180), insertar:
```tsx
      <div className="sg" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
        {([
          { key: 'device', label: 'Equipos', s: breakdown.device },
          { key: 'accessory', label: 'Accesorios', s: breakdown.accessory },
          { key: 'service', label: 'Servicio Técnico', s: breakdown.service },
        ] as const).map(c => (
          <div className="sc" key={c.key}>
            <div className="sl">{c.label}</div>
            <div className="sv" style={{ color: c.s.profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
              U$ {Math.round(c.s.profit).toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
              Fact. U$ {Math.round(c.s.revenue).toLocaleString()} · Margen {c.s.margin.toFixed(0)}%
            </div>
          </div>
        ))}
      </div>
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 6: Verificación manual**

`npm run dev` → `/reports`. Verificar 3 tarjetas (Equipos/Accesorios/Servicio) con ganancia, facturación y margen. Cambiar el filtro de período y confirmar que los números cambian. Cruzar: la ganancia de Equipos debe ser ≤ la Ganancia Bruta total previa (que mezclaba todo).

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/reports/page.tsx" "src/app/(app)/reports/ReportsClient.tsx"
git commit -m "feat: rentabilidad por categoría (Equipos/Accesorios/Servicio) en Reports"
```

---

### Task 5: Resumen por categoría en Dashboard

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/app/(app)/dashboard/DashboardClient.tsx`

**Interfaces:**
- Consumes: `categoryBreakdown` de `src/utils/sales.ts` (Task 1).
- Produce: UI.

**Contexto:** `dashboard/page.tsx` fetchea stock/sales/settings. `DashboardClient` recibe `{ stock, sales, exchangeRate, userRole }` y muestra KPIs con `sc/sl/sv` dentro de un `<div className="sg">` (línea ~213).

- [ ] **Step 1: Pasar `repairs` desde el server component**

En `dashboard/page.tsx`, agregar el fetch de repairs y pasarlo. Reemplazar el `Promise.all`:
```tsx
  const [
    { data: stockData },
    { data: salesData },
    { data: settingsData }
  ] = await Promise.all([
    supabase.from('stock').select('id,brand,model,storage,color,imei,price,cost_price,currency,status,condition,deposit,created_at').order('created_at', { ascending: false }),
    supabase.from('sales').select('id,brand,model,storage,color,imei,price,currency,created_at,seller_id,seller_name,customer,payments,notes').order('created_at', { ascending: false }).limit(500),
    supabase.from('settings').select('exchange_rate').maybeSingle()
  ])
```
por:
```tsx
  const [
    { data: stockData },
    { data: salesData },
    { data: settingsData },
    { data: repairsData }
  ] = await Promise.all([
    supabase.from('stock').select('id,brand,model,storage,color,imei,price,cost_price,currency,status,condition,deposit,created_at').order('created_at', { ascending: false }),
    supabase.from('sales').select('id,brand,model,storage,color,imei,price,cost_price,currency,created_at,seller_id,seller_name,customer,payments,notes,accessories').order('created_at', { ascending: false }).limit(500),
    supabase.from('settings').select('exchange_rate').maybeSingle(),
    supabase.from('repairs').select('id, cost, created_at, updated_at')
  ])
```
(Nótese: se agregó `cost_price` y `accessories` al select de sales — son necesarios para el cálculo de rentabilidad.)
Y agregar `repairs={repairsData || []}` al `<DashboardClient ... />`.

- [ ] **Step 2: Aceptar `repairs` y calcular el breakdown**

En `DashboardClient.tsx`, agregar import al tope:
```tsx
import { categoryBreakdown } from '@/utils/sales';
```
Cambiar la firma:
```tsx
export function DashboardClient({
  stock, sales, exchangeRate, userRole, repairs = [],
}: {
  stock: any[]; sales: any[]; exchangeRate: number; userRole?: string; repairs?: any[];
}) {
```
Y dentro del componente (cerca de los otros `useMemo`, antes del `return`), agregar:
```tsx
  const catBreakdown = useMemo(
    () => categoryBreakdown(sales, repairs, exchangeRate),
    [sales, repairs, exchangeRate]
  );
```

- [ ] **Step 3: Renderizar el resumen por categoría**

Justo después del `<div className="sg">` de KPIs (que cierra cerca de la línea ~270, después de la card "Vendedor top"), insertar un bloque nuevo:
```tsx
      <div className="sg" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginTop: 16 }}>
        {([
          { label: 'Ganancia Equipos', s: catBreakdown.device },
          { label: 'Ganancia Accesorios', s: catBreakdown.accessory },
          { label: 'Ganancia Servicio', s: catBreakdown.service },
        ] as const).map((c, i) => (
          <div className="sc" key={i}>
            <div className="sl">{c.label}</div>
            <div className="sv" style={{ color: c.s.profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
              U$ {Math.round(c.s.profit).toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
              Margen {c.s.margin.toFixed(0)}%
            </div>
          </div>
        ))}
      </div>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Verificación manual**

`npm run dev` → `/dashboard`. Verificar las 3 tarjetas de ganancia por categoría debajo de los KPIs. Los números deben coincidir con los de `/reports` cuando el período de Reports es "Todo".

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/dashboard/page.tsx" "src/app/(app)/dashboard/DashboardClient.tsx"
git commit -m "feat: resumen de ganancia por categoría en Dashboard"
```

---

## Notas de cierre

- El costo de Servicio es una aproximación: suma `repairs.cost` del período por `updated_at` (fallback `created_at`), no atado venta-por-venta. Documentado como limitación de v1.
- No hay migraciones. Si en el futuro se quiere precisión, agregar columna `category` a `sales` y backfill.
- Tras completar todas las tareas: el coordinador mergea a main y el usuario pushea desde GitHub Desktop.
