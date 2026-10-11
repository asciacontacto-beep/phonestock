-- ============================================================================
-- Cumpleaños de los clientes: día y mes (sin año), para avisar cuando se
-- acerca y saludar con un descuento. El porcentaje se elige en Ajustes.
--
-- NO BORRA NI MODIFICA NINGÚN DATO: agrega columnas vacías.
-- ============================================================================

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS birth_day   SMALLINT CHECK (birth_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS birth_month SMALLINT CHECK (birth_month BETWEEN 1 AND 12);

CREATE INDEX IF NOT EXISTS customers_cumple_idx
  ON public.customers (org_id, birth_month, birth_day)
  WHERE birth_month IS NOT NULL;

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS descuento_cumple NUMERIC NOT NULL DEFAULT 10
  CHECK (descuento_cumple >= 0 AND descuento_cumple <= 100);
