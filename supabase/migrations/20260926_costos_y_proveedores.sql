-- ============================================================================
-- 1) El costo de las ventas lo completa la base (el vendedor no lo ve).
-- 2) Cuenta corriente con proveedores, por pedido.
--
-- NO BORRA NI MODIFICA NINGÚN DATO EXISTENTE: agrega dos tablas, una columna
-- vacía en `stock`, dos funciones y una regla.
-- ============================================================================

BEGIN;

-- ── 1. Costo de la venta, del lado de la base ──────────────────────────
-- Al vendedor ya no le llega el costo de los equipos ni de los accesorios
-- (se leía con las herramientas del navegador). Pero la venta necesita el
-- costo para que la ganancia del dueño dé bien: lo completa la base.

-- Convierte un importe a la moneda de la venta con la cotización del local.
-- Sin cotización usa 1, igual que la pantalla de venta del dueño.
CREATE OR REPLACE FUNCTION public.convertir_a_moneda(monto NUMERIC, desde TEXT, hacia TEXT, cotizacion NUMERIC)
RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN monto IS NULL THEN NULL
    WHEN COALESCE(desde, 'USD') = COALESCE(hacia, 'ARS') THEN monto
    WHEN desde = 'USD' AND hacia = 'ARS' THEN monto * COALESCE(NULLIF(cotizacion, 0), 1)
    WHEN desde = 'ARS' AND hacia = 'USD' THEN monto / COALESCE(NULLIF(cotizacion, 0), 1)
    ELSE monto
  END
$$;

-- Venta de ACCESORIOS sin costo: suma el costo de cada accesorio vendido.
-- (Suma directa, como hace la pantalla de venta del dueño.)
CREATE OR REPLACE FUNCTION public.completar_costo_venta()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  org UUID := COALESCE(NEW.org_id, public.current_user_org_id());
  item JSONB;
  costo NUMERIC;
  total NUMERIC := 0;
  hubo BOOLEAN := false;
BEGIN
  IF NEW.cost_price IS NOT NULL OR NEW.brand IS DISTINCT FROM 'ACCESORIOS' THEN
    RETURN NEW;
  END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.accessories, '[]'::jsonb)) LOOP
    SELECT a.cost_price INTO costo FROM public.accessories a
     WHERE a.id::text = item->>'id' AND a.org_id = org;
    IF costo IS NOT NULL THEN
      total := total + costo * COALESCE(NULLIF(item->>'qty', '')::numeric, 1);
      hubo := true;
    END IF;
  END LOOP;
  IF hubo THEN NEW.cost_price := round(total, 2); END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS completar_costo_venta ON public.sales;
CREATE TRIGGER completar_costo_venta
  BEFORE INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.completar_costo_venta();

-- Venta de un EQUIPO hecha por un vendedor: la app llama a esta función
-- después de registrar la venta. Copia el costo del equipo a la venta, en la
-- moneda de la venta. No devuelve nada: el costo nunca pasa por el
-- navegador. Sólo completa ventas sin costo, del propio negocio.
CREATE OR REPLACE FUNCTION public.fijar_costo_venta(p_sale_id TEXT, p_stock_id TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  org UUID := public.current_user_org_id();
  costo NUMERIC; moneda_equipo TEXT; moneda_venta TEXT; cot NUMERIC;
BEGIN
  IF org IS NULL THEN RETURN; END IF;
  SELECT s.cost_price, s.currency INTO costo, moneda_equipo
    FROM public.stock s WHERE s.id::text = p_stock_id AND s.org_id = org;
  IF costo IS NULL THEN RETURN; END IF;
  SELECT v.currency INTO moneda_venta
    FROM public.sales v WHERE v.id::text = p_sale_id AND v.org_id = org AND v.cost_price IS NULL;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT exchange_rate INTO cot FROM public.settings WHERE org_id = org LIMIT 1;
  UPDATE public.sales
     SET cost_price = round(public.convertir_a_moneda(costo, moneda_equipo, moneda_venta, cot), 2)
   WHERE id::text = p_sale_id AND org_id = org AND cost_price IS NULL;
END $$;

GRANT EXECUTE ON FUNCTION public.fijar_costo_venta(TEXT, TEXT) TO authenticated;


-- ── 2. Cuenta corriente con proveedores ────────────────────────────────
-- Un PEDIDO agrupa los equipos que llegaron juntos ("10 teléfonos, USD
-- 3.000") y queda como deuda del local con el proveedor. Los PAGOS la
-- bajan. Deuda = pedidos − pagos, por moneda.
--
-- `suppliers` se creó desde el panel y su id puede ser número o UUID: las
-- columnas nuevas copian el tipo que tenga.
DO $$
DECLARE tipo TEXT;
BEGIN
  SELECT format_type(atttypid, atttypmod) INTO tipo
    FROM pg_attribute WHERE attrelid = 'public.suppliers'::regclass AND attname = 'id';

  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS public.supplier_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID NOT NULL DEFAULT public.current_user_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
      supplier_id %1$s REFERENCES public.suppliers(id) ON DELETE SET NULL,
      fecha DATE NOT NULL DEFAULT CURRENT_DATE,
      moneda TEXT NOT NULL DEFAULT 'USD' CHECK (moneda IN ('USD', 'ARS')),
      total NUMERIC NOT NULL CHECK (total >= 0),
      notas TEXT,
      created_by UUID DEFAULT auth.uid(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )$f$, tipo);

  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS public.supplier_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID NOT NULL DEFAULT public.current_user_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
      supplier_id %1$s REFERENCES public.suppliers(id) ON DELETE SET NULL,
      order_id UUID REFERENCES public.supplier_orders(id) ON DELETE SET NULL,
      fecha DATE NOT NULL DEFAULT CURRENT_DATE,
      moneda TEXT NOT NULL DEFAULT 'USD' CHECK (moneda IN ('USD', 'ARS')),
      monto NUMERIC NOT NULL CHECK (monto > 0),
      metodo TEXT,
      notas TEXT,
      created_by UUID DEFAULT auth.uid(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )$f$, tipo);
END $$;

-- Cada equipo sabe de qué pedido vino.
ALTER TABLE public.stock
  ADD COLUMN IF NOT EXISTS supplier_order_id UUID REFERENCES public.supplier_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS supplier_orders_org_idx ON public.supplier_orders (org_id, supplier_id);
CREATE INDEX IF NOT EXISTS supplier_payments_org_idx ON public.supplier_payments (org_id, supplier_id);
CREATE INDEX IF NOT EXISTS stock_supplier_order_idx ON public.stock (supplier_order_id) WHERE supplier_order_id IS NOT NULL;

-- Sólo el dueño: son costos y deudas del local.
ALTER TABLE public.supplier_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pedidos_proveedor_dueno" ON public.supplier_orders;
CREATE POLICY "pedidos_proveedor_dueno" ON public.supplier_orders
  FOR ALL TO authenticated
  USING (org_id = public.current_user_org_id()
         AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner'))
  WITH CHECK (org_id = public.current_user_org_id()
         AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner'));

DROP POLICY IF EXISTS "pagos_proveedor_dueno" ON public.supplier_payments;
CREATE POLICY "pagos_proveedor_dueno" ON public.supplier_payments
  FOR ALL TO authenticated
  USING (org_id = public.current_user_org_id()
         AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner'))
  WITH CHECK (org_id = public.current_user_org_id()
         AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner'));

COMMIT;

-- Para comprobar: tipo del id de proveedores y las tablas nuevas.
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'suppliers' AND column_name = 'id')
    OR (table_name IN ('supplier_orders', 'supplier_payments') AND column_name = 'supplier_id')
    OR (table_name = 'stock' AND column_name = 'supplier_order_id'))
ORDER BY table_name;
