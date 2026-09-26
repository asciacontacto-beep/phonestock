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

-- Accesorios vendidos por un vendedor: llegan sin costo. Los reportes leen
-- el costo de cada accesorio del detalle de la venta, así que se completa
-- ahí, accesorio por accesorio, en cualquier venta (sueltos o junto a un
-- equipo). Y en la venta de ACCESORIOS sueltos, también el total.
-- (Suma directa, como hace la pantalla de venta del dueño.)
CREATE OR REPLACE FUNCTION public.completar_costo_venta()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  -- El negocio de quien vende, no el que venga en la fila: si no, se
  -- podrían leer costos de accesorios de otro negocio.
  org UUID := COALESCE(public.current_user_org_id(), NEW.org_id);
  item JSONB;
  costo NUMERIC;
  items JSONB := '[]'::jsonb;
  total NUMERIC := 0;
  hubo BOOLEAN := false;
BEGIN
  IF NEW.accessories IS NULL OR jsonb_typeof(NEW.accessories) <> 'array'
     OR jsonb_array_length(NEW.accessories) = 0 THEN
    RETURN NEW;
  END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.accessories) LOOP
    -- El costo sale de la base, no de lo que mande la pantalla. Si el
    -- accesorio ya no existe, queda el que venía.
    costo := NULL;
    SELECT a.cost_price INTO costo FROM public.accessories a
     WHERE a.id::text = item->>'id' AND a.org_id = org;
    IF costo IS NOT NULL THEN
      item := item || jsonb_build_object('cost_price', costo);
    ELSE
      costo := NULLIF(item->>'cost_price', '')::numeric;
    END IF;
    IF costo IS NOT NULL THEN
      total := total + costo * COALESCE(NULLIF(item->>'qty', '')::numeric, 1);
      hubo := true;
    END IF;
    items := items || jsonb_build_array(item);
  END LOOP;
  NEW.accessories := items;
  IF NEW.cost_price IS NULL AND NEW.brand = 'ACCESORIOS' AND hubo THEN
    NEW.cost_price := round(total, 2);
  END IF;
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
  -- Sólo la venta que acaba de hacer quien llama, del mismo equipo que se
  -- vendió: así nadie puede escribirle un costo cualquiera a otra venta.
  SELECT s.cost_price, s.currency INTO costo, moneda_equipo
    FROM public.stock s
   WHERE s.id::text = p_stock_id AND s.org_id = org AND s.status = 'sold';
  IF costo IS NULL THEN RETURN; END IF;
  SELECT v.currency INTO moneda_venta
    FROM public.sales v, public.stock s
   WHERE v.id::text = p_sale_id AND v.org_id = org AND v.cost_price IS NULL
     AND v.seller_id = auth.uid()
     AND v.created_at > now() - interval '15 minutes'
     AND s.id::text = p_stock_id
     AND v.brand IS NOT DISTINCT FROM s.brand AND v.model IS NOT DISTINCT FROM s.model
     AND v.imei IS NOT DISTINCT FROM s.imei;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT exchange_rate INTO cot FROM public.settings WHERE org_id = org LIMIT 1;
  UPDATE public.sales
     SET cost_price = round(public.convertir_a_moneda(costo, moneda_equipo, moneda_venta, cot), 2)
   WHERE id::text = p_sale_id AND org_id = org AND cost_price IS NULL;
END $$;

REVOKE EXECUTE ON FUNCTION public.fijar_costo_venta(TEXT, TEXT) FROM PUBLIC, anon;
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
