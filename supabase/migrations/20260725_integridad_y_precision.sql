-- ============================================================================
-- Integridad de stock, precisión de precios e historial de cambios.
-- Correr una sola vez en el SQL Editor. No borra ni modifica datos: sólo
-- agrega columnas, tablas, índices y funciones.
-- ============================================================================

-- ── Observaciones al cargar un equipo ───────────────────────────────────
ALTER TABLE public.stock ADD COLUMN IF NOT EXISTS notes TEXT;

-- ── Saldo pendiente de una venta ────────────────────────────────────────
-- Una venta se puede cerrar cobrando menos que el precio marcado. Si fue un
-- descuento, el precio registrado baja (esa es la venta real). Si el cliente
-- quedó debiendo, el precio queda entero y la diferencia se guarda acá para
-- poder listar quién debe plata.
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS balance_due NUMERIC;

-- ── Devolver stock de accesorios al anular una venta ────────────────────
CREATE OR REPLACE FUNCTION public.increment_accessory_stock(acc_id UUID, qty INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.accessories
  SET stock = stock + qty
  WHERE id = acc_id AND org_id = public.current_user_org_id();
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_accessory_stock(UUID, INT) TO authenticated;

-- ── Descontar stock avisando si no se pudo ──────────────────────────────
-- Antes devolvía void: si no había stock suficiente la venta se cerraba
-- igual y el accesorio quedaba figurando con unidades que ya no estaban.
-- Ahora devuelve TRUE/FALSE para que la app pueda avisarlo.
DROP FUNCTION IF EXISTS public.decrement_accessory_stock(UUID, INT);
CREATE FUNCTION public.decrement_accessory_stock(acc_id UUID, qty INT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  affected INT;
BEGIN
  UPDATE public.accessories
  SET stock = stock - qty
  WHERE id = acc_id
    AND stock >= qty
    AND org_id = public.current_user_org_id();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;
GRANT EXECUTE ON FUNCTION public.decrement_accessory_stock(UUID, INT) TO authenticated;

-- ── Historial de cambios ────────────────────────────────────────────────
-- Se puede editar el precio de una venta ya cerrada. Con un empleado
-- operando el sistema hace falta poder responder quién lo cambió y cuándo.
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL DEFAULT public.current_user_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID,
  user_name TEXT,
  action TEXT NOT NULL,          -- 'venta_editada' | 'venta_anulada' | ...
  entity TEXT NOT NULL,          -- 'sale' | 'stock' | ...
  entity_id TEXT,
  summary TEXT NOT NULL,         -- legible: "Precio: U$1500 → U$1400"
  details JSONB
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant Isolation Policy" ON public.audit_log;
CREATE POLICY "Tenant Isolation Policy" ON public.audit_log
  FOR ALL USING (org_id = public.current_user_org_id())
  WITH CHECK (org_id = public.current_user_org_id());
GRANT ALL ON public.audit_log TO authenticated;

CREATE INDEX IF NOT EXISTS audit_log_entity_idx  ON public.audit_log (entity, entity_id);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON public.audit_log (created_at DESC);

-- ── Índices para que inventario y ventas carguen rápido ─────────────────
CREATE INDEX IF NOT EXISTS stock_status_idx   ON public.stock   (org_id, status);
CREATE INDEX IF NOT EXISTS sales_created_idx  ON public.sales   (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS repairs_status_idx ON public.repairs (org_id, status);
