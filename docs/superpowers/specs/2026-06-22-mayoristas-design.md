# Módulo Mayoristas — Diseño

**Fecha:** 2026-06-22  
**Stack:** Next.js 16 + Supabase + React 19 + CSS Modules

---

## Objetivo

Sección separada para gestionar revendedores: pedidos al por mayor, cuentas corrientes, deudas y pagos. Balances calculados automáticamente. Al entregar un pedido, genera entrada en `sales` para unificar reportes.

---

## Enfoque: Híbrido (C)

Tablas propias para tracking mayorista. Al marcar pedido como `delivered`, se inserta fila en `sales` automáticamente. Balance general del sistema se actualiza solo.

---

## Base de Datos

Todas las tablas tienen `org_id` (multitenancy) + RLS igual al resto del sistema.

```sql
-- Directorio de revendedores
wholesalers (
  id uuid PK,
  org_id uuid FK,
  name text NOT NULL,
  phone text,
  email text,
  notes text,
  created_at timestamptz
)

-- Pedidos mayoristas
wholesale_orders (
  id uuid PK,
  org_id uuid FK,
  wholesaler_id uuid FK → wholesalers,
  status text CHECK IN ('draft','confirmed','delivered','cancelled'),
  currency text CHECK IN ('ARS','USD') DEFAULT 'USD',
  notes text,
  created_at timestamptz
)

-- Ítems de cada pedido
wholesale_order_items (
  id uuid PK,
  order_id uuid FK → wholesale_orders,
  stock_id uuid FK → stock NULLABLE,  -- null = encargue
  brand text,
  model text,
  storage text,
  color text,
  qty int DEFAULT 1,
  unit_price numeric,
  is_backorder boolean DEFAULT false
)

-- Pagos registrados
wholesale_payments (
  id uuid PK,
  org_id uuid FK,
  order_id uuid FK → wholesale_orders,
  wholesaler_id uuid FK → wholesalers,
  amount numeric,
  currency text,
  method text CHECK IN ('cash','transfer','card'),
  notes text,
  created_at timestamptz
)
```

**Cálculos (sin columnas extras, todo en query):**
- `total_orden` = SUM(unit_price × qty) de wholesale_order_items
- `pagado_orden` = SUM(amount) de wholesale_payments WHERE order_id
- `saldo_orden` = total_orden - pagado_orden
- `deuda_revendedor` = SUM(saldo_orden) de todas las órdenes activas del revendedor

---

## Páginas

### `/mayoristas` — Lista
- KPIs: Total a cobrar · Cobrado este mes · Pedidos activos
- Cards por revendedor: nombre, teléfono, deuda total (rojo=debe, verde=al día)
- Botones: "Nuevo revendedor" · "Nuevo pedido"

### `/mayoristas/[id]` — Perfil
- Header: nombre, contacto, balance total auto-calculado
- Tabs:
  - **Pedidos** — tabla: estado, items, total, saldo pendiente
  - **Pagos** — historial: fecha, monto, método
  - **Cuenta corriente** — timeline unificado pedidos+pagos, saldo línea a línea (estilo extracto bancario)

### Modales

**Nuevo pedido:**
- Selector revendedor → buscar stock (autocomplete) → qty + precio mayorista → moneda → notas
- Opción "Encargue" por ítem (is_backorder=true, stock_id=null)
- Total calculado live

**Registrar pago:**
- Monto + método + nota → descuenta deuda automáticamente

---

## Lógica de Negocio

### Al marcar pedido como `delivered`:
1. Por cada ítem con `stock_id` → marcar `stock.status = 'sold'`
2. Insertar fila en `sales` con `sale_type = 'wholesale'`, `wholesale_order_id` referencia
3. Si ítem es backorder → no tocar stock (se resolverá cuando entre el equipo)

### Balance del sistema:
- `sales` ya tiene los delivered → dashboard y reportes los cuentan solos
- Pagos de mayoristas NO van a `cashiers` (son cuenta corriente separada)
- `/reports` agrega columna "Mayorista" en facturación

---

## Integración con módulos existentes

| Módulo | Integración |
|--------|------------|
| `stock` | Items se marcan sold al entregar |
| `sales` | Entrada auto al deliver (sale_type='wholesale') |
| `customers` | Mayoristas son entidad separada (no mezcla) |
| `reports` | Suma wholesale sales a facturación total |
| `dashboard` | KPI facturación incluye wholesale automáticamente |

---

## Archivos a crear

```
src/app/(app)/mayoristas/
  page.tsx                    # Server component, fetch lista
  MayoristasClient.tsx        # Lista + KPIs
  [id]/
    page.tsx                  # Server component, fetch revendedor
    MayoristaDetailClient.tsx # Perfil + tabs
```

Tabla SQL: migración manual en Supabase dashboard.

---

## Fuera de scope (v1)

- Notificaciones automáticas de deuda vencida
- Precios por lista (descuento % automático por revendedor)
- PDF de remito/factura por pedido
- Portal del revendedor para ver su estado
