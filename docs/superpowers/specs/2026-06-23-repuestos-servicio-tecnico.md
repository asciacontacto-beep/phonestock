# Repuestos para Servicio Técnico — Diseño

**Fecha:** 2026-06-23
**Proyecto:** Stackr ERP (Next.js 16 + Supabase + React 19)

## Objetivo

Agregar un ABM de repuestos con stock (baterías, módulos, flex, etc.) por depósito, y permitir registrar qué repuestos se usaron en cada reparación. El costo total de la reparación = costo de repuestos + mano de obra, desglosados pero sumados para la rentabilidad.

## Contexto actual

- Tabla `repairs`: `id, org_id, customer_id, device_brand, device_model, device_color, device_password, status, deposit_paid, notes, cost`. El campo `cost` es un número libre ingresado manualmente.
- Statuses: `INGRESADO → REVISION → REPUESTO → REPARADO → ENTREGADO → CANCELADO`.
- Al entregar (ENTREGADO), se crea una venta en `sales` con `brand='SERVICIO'`, `cost_price=0`, `price=balance_pendiente`.
- `categoryBreakdown` en Reports/Dashboard usa `repairs.cost` para el costo de servicio.
- Los accesorios ya tienen tabla propia (`accessories`) con `deposit_id, currency, stock, cost_price, sale_price`.

## Nuevas tablas SQL

### `spare_parts`

```sql
CREATE TABLE public.spare_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,                        -- ej: 'Batería', 'Módulo', 'Flex', 'Otro'
  cost_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ARS', -- 'ARS' | 'USD'
  stock INTEGER NOT NULL DEFAULT 0,
  deposit_id UUID REFERENCES public.deposits(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.spare_parts
  USING (org_id = public.current_user_org_id());
```

### `repair_parts`

```sql
CREATE TABLE public.repair_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  repair_id UUID NOT NULL REFERENCES public.repairs(id) ON DELETE CASCADE,
  spare_part_id UUID NOT NULL REFERENCES public.spare_parts(id),
  qty INTEGER NOT NULL DEFAULT 1,
  cost_price NUMERIC NOT NULL,          -- snapshot del precio al momento de uso
  currency TEXT NOT NULL DEFAULT 'ARS'
);
ALTER TABLE public.repair_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.repair_parts
  USING (org_id = public.current_user_org_id());
```

### Modificación a `repairs`

```sql
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS labor_cost NUMERIC DEFAULT 0;
```

El campo `cost` existente pasa a almacenarse como la suma calculada al guardar: `Σ repair_parts.cost_price*qty (en ARS) + labor_cost`. Las reparaciones anteriores mantienen su `cost` tal cual.

### RPC para decrementar stock

```sql
CREATE OR REPLACE FUNCTION public.decrement_spare_part_stock(part_id UUID, qty INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.spare_parts
  SET stock = stock - qty
  WHERE id = part_id AND org_id = public.current_user_org_id();
END;
$$;
```

## UI

### Sección ABM de repuestos

Nueva pestaña **"Repuestos"** dentro de `/repairs` (junto a la lista de reparaciones, misma página, tab toggle). Muestra:
- Tabla: nombre, categoría, stock, precio costo, moneda, depósito
- Botón "Nuevo repuesto" → modal con campos: nombre, categoría (select con opciones + libre), costo, moneda (ARS/USD), stock inicial, depósito
- Editar / borrar inline (igual que accesorios)
- Filtro por depósito

### Modal de detalle de reparación (existente, se extiende)

Se agregan dos bloques al modal `RepairDetailModal`:

**Bloque "Repuestos usados":**
- Lista de `repair_parts` ya cargados para esta reparación (nombre, qty, costo)
- Selector para agregar: filtra `spare_parts` por `deposit_id` de la reparación, muestra nombre + stock disponible + costo. Solo aparece si `stock > 0`.
- Al agregar un repuesto: inserta en `repair_parts`, llama a `decrement_spare_part_stock`, recalcula `repairs.cost`.
- Botón eliminar por repuesto (restaura stock, borra fila, recalcula).

**Campo "Mano de obra (ARS)":**
- Input numérico libre, guarda en `repairs.labor_cost`.
- Al guardar, `repairs.cost = Σ repair_parts_en_ars + labor_cost`.

**Resumen de costos:**
```
Repuestos:   ARS 5.000
Mano de obra: ARS 2.000
─────────────────────
Costo total: ARS 7.000
```

### Conversión de moneda para repuestos en USD

Al calcular `repairs.cost` (que se guarda en ARS para consistencia con el campo existente), los repuestos en USD se convierten usando `exchangeRate` de `settings`. El valor en ARS del repuesto = `cost_price * exchangeRate` si `currency='USD'`.

## Rentabilidad

Sin cambios en `categoryBreakdown`. Sigue usando `repairs.cost` (ya calculado correctamente). Las reparaciones viejas sin `labor_cost` ni `repair_parts` mantienen su `cost` manual — compatible hacia atrás.

## Archivos afectados

- `supabase/migrations/YYYYMMDD_spare_parts.sql` — tablas + RPC nuevas + ALTER repairs
- `src/app/(app)/repairs/RepairsClient.tsx` — tabs Reparaciones / Repuestos, ABM repuestos, extensión del modal
- No se tocan: `src/utils/sales.ts`, Reports, Dashboard, Receipt

## Fuera de alcance (YAGNI)

- Fracciones de stock (qty siempre = 1 por ahora)
- Presupuesto de repuestos antes de iniciar la reparación
- Notificaciones de stock bajo
- Historial de movimientos de stock de repuestos
