-- ============================================================================
-- Intereses de las ventas en cuotas, aparte.
--
-- Cuando el local financia en cuotas con interés, el interés se suma al
-- precio de la venta. Así Rentabilidad lo contaba como ganancia del equipo
-- (inflando su margen) y no se podía saber cuánto deja financiar. Desde
-- ahora cada venta en cuotas guarda también cuánto de su precio es interés,
-- y Rentabilidad lo muestra en su propia tarjeta.
--
-- Las ventas anteriores quedan como están: el interés ya está mezclado en
-- su precio y no hay forma segura de separarlo.
--
-- NO BORRA NI MODIFICA NINGÚN DATO. Agrega una columna vacía.
-- ============================================================================

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS financing_interest NUMERIC;

COMMENT ON COLUMN public.sales.financing_interest IS
  'Interés de la venta en cuotas del local, en la moneda de la venta. Ya incluido en price.';


-- ── Verificación: tiene que devolver 1 fila ─────────────────────────────
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'financing_interest';
