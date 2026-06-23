# Venta de accesorios sueltos + Rentabilidad por categoría — Diseño

**Fecha:** 2026-06-23
**Proyecto:** Stackr ERP (Next.js 16 + Supabase + React 19)

## Objetivo

Dos capacidades nuevas, relacionadas:

1. **Vender accesorios sueltos** (sin un equipo asociado), todo en ARS.
2. **Ver rentabilidad separada** por categoría: **Equipos**, **Accesorios**, **Servicio Técnico**, en `/reports` y en el dashboard.

## Contexto del código actual

- **Ventas** se guardan en la tabla `sales`. Cada fila tiene `brand, model, storage, color, imei, price, cost_price, currency, payments (JSON), customer (JSON), accessories (JSON), seller_*, deposit_id, created_at`.
- **`/sell`** (`SellClient.tsx`) gira todo alrededor de `unit` (un equipo de stock). `confirm()` exige `unit`. Los accesorios se anexan en el paso 2 y se guardan embebidos en `sales.accessories`; el stock se descuenta con la RPC `decrement_accessory_stock(acc_id, qty)`.
- **`/repairs`** (`RepairsClient.tsx`) inserta en `sales` con `brand: 'SERVICIO'`, `model: 'SEÑA REPARACIÓN'` o `'COBRO REPARACIÓN'`, `cost_price: 0`. El costo real del repuesto vive en `repairs.cost`.
- **`/reports`** (`ReportsClient.tsx`) ya filtra `brand !== 'MOVIMIENTO'` y calcula facturación/costo/ganancia **mezclando todas las categorías**. Agrupa rentabilidad por modelo y por vendedor.
- **`/accessories`** es solo ABM de stock (tabla `accessories`: `category, compatible_model, color, stock, cost_price, sale_price, currency, deposit_id`). No vende.
- Convención existente: la categoría de una venta se infiere por magic-string en `brand` (`SERVICIO`, `MOVIMIENTO`).

## Parte A — Vender accesorios sueltos

**Entrada:** botón **"Vender accesorios sueltos"** en el paso 1 de `/sell`, debajo/al lado del selector de equipos. Al tocarlo:
- Marca un modo `accessoryOnly = true`, deja `unit = null`, salta al paso 2.

**Restricciones:**
- Moneda fija **ARS** (no se muestra selector de moneda).
- **Pago completo obligatorio** — no se permite saldo pendiente (montos chicos).
- **Cliente opcional** — si no se carga nombre, default `"Consumidor Final"`.

**Flujo:**
- Paso 2 (accesorios) se reusa. En modo `accessoryOnly`, el selector muestra accesorios de **todos los depósitos** (o del depósito elegido por el vendedor); se filtra a `currency === 'ARS'` por la regla de negocio.
- El **precio total se autocalcula**: `price = Σ acc.price * acc.qty` (los de regalo cuentan 0).
- Paso 3 (cliente) opcional. Paso 4 (pago) igual al actual pero validando pago completo.

**Guardado (`confirm()` en modo accesorios):**
```js
saleData = {
  seller_id, seller_name,
  deposit_id: <depósito elegido>,
  brand: 'ACCESORIOS',
  model: <resumen, ej "2x Funda · 1x Vidrio">,
  storage: '-', color: '-', imei: `ACC-${Date.now()}`,
  price: Σ acc.price*qty (no-regalo),
  cost_price: Σ acc.cost_price*qty,
  currency: 'ARS',
  payments, customer: cust.name ? cust : { name: 'Consumidor Final' },
  accessories: selectedAccessories,
  notes,
}
```
- Inserta en `sales`. Descuenta stock con `decrement_accessory_stock` por cada accesorio. **No** toca la tabla `stock` (no hay equipo).

**Comprobante (`Receipt.tsx`):** si `sale.brand === 'ACCESORIOS'` (o no hay imei de equipo), la sección PRODUCTO lista los accesorios (`sale.accessories`) en vez de marca/modelo. Para ventas de equipo con accesorios, también conviene listar los accesorios debajo del equipo (mejora menor incluida).

## Parte B — Clasificación de ventas (sin migración)

Helper puro reusable, una sola definición:
```ts
function saleCategory(s): 'service' | 'accessory' | 'device' | 'movement' {
  if (s.brand === 'MOVIMIENTO') return 'movement'
  if (s.brand === 'SERVICIO')   return 'service'
  if (s.brand === 'ACCESORIOS') return 'accessory'
  return 'device'
}
```
Se ubica en un módulo compartido (ej. `src/utils/sales.ts`) y lo usan Reports y Dashboard.

## Parte C — Rentabilidad por categoría

Todo en USD normalizado con `exchangeRate` (igual que hoy en Reports), salvo donde la categoría es nativa ARS.

| Categoría | Facturación | Costo | Ganancia |
|---|---|---|---|
| **Equipos** | Σ `price` de ventas categoría `device` | Σ `cost_price` de esas ventas | fact − costo |
| **Accesorios** | Σ `(acc.price*qty)` no-regalo del JSON `accessories` en **todas** las ventas | Σ `(acc.cost_price*qty)` de esos accesorios | fact − costo |
| **Servicio** | Σ `price` de ventas categoría `service` | Σ `repairs.cost` del período | fact − costo |

**Reglas anti-doble-conteo:**
- Equipos usa `sales.price`; las ventas `ACCESORIOS` quedan **excluidas** de Equipos (su brand no es device).
- Accesorios usa **solo el JSON** `accessories` (de ventas de equipo Y de ventas sueltas). Nunca usa el `price` de la fila `ACCESORIOS` (evita contar dos veces lo mismo).
- Servicio usa `sales.price` de filas `SERVICIO`; el costo viene de `repairs.cost` (no de `sales.cost_price`, que es 0).

**Conversión de moneda en accesorios:** los accesorios pueden tener `currency` propia en el JSON. Para el cálculo, los ARS se normalizan a USD con `exchangeRate` igual que el resto de Reports. (En la práctica son ARS.)

**Costo de servicio — aproximación v1:** se suma `repairs.cost` de las reparaciones cuyo `updated_at` (o `created_at`) cae dentro del rango de fechas seleccionado. No se ata venta-por-venta. Aceptable para v1; documentado como limitación.

### Dónde se muestra

- **`/reports`** (`ReportsClient.tsx`): 3 tarjetas nuevas (Equipos / Accesorios / Servicio) con Facturación, Costo, Ganancia y % margen cada una, respetando el filtro de fechas existente. El `page.tsx` de reports debe pasar también `repairs` al client.
- **Dashboard** (`DashboardClient.tsx`): resumen compacto de las 3 categorías (ganancia por categoría). El `dashboard/page.tsx` debe fetchear también `repairs`.

## Archivos afectados

- `src/utils/sales.ts` — **nuevo**: `saleCategory()` + helpers de cálculo de accesorios (`accessoriesRevenue`, `accessoriesCost`).
- `src/app/(app)/sell/SellClient.tsx` — modo `accessoryOnly`, botón de entrada, autocálculo, `confirm()` ramificado.
- `src/components/Receipt.tsx` — render de accesorios para ventas `ACCESORIOS` (y listado de accesorios en ventas de equipo).
- `src/app/(app)/reports/ReportsClient.tsx` — tarjetas de rentabilidad por categoría.
- `src/app/(app)/reports/page.tsx` — fetch de `repairs`.
- `src/app/(app)/dashboard/DashboardClient.tsx` — resumen por categoría.
- `src/app/(app)/dashboard/page.tsx` — fetch de `repairs`.

Sin migraciones SQL. Reusa la RPC `decrement_accessory_stock` existente.

## Fuera de alcance (YAGNI)

- Columna `category` en `sales` (se deriva por `brand`).
- Cuenta corriente / saldo pendiente en ventas de accesorios.
- Multi-moneda en accesorios (regla de negocio: ARS).
- Atar costo de servicio venta-por-venta.
