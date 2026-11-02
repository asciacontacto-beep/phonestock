-- ============================================================================
-- Socios: reparto de la ganancia del mes.
--
-- 1. settings.socios: los socios del local con su porcentaje, ej.
--    [{"id":"…","nombre":"Juan","pct":50},{"id":"…","nombre":"Sofi","pct":50}]
-- 2. cash_movements.socio_id: un egreso de caja puede ser el retiro de un
--    socio, para descontarlo de lo que le toca.
--
-- NO BORRA NI MODIFICA NINGÚN DATO: agrega dos columnas vacías.
-- ============================================================================

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS socios JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.cash_movements
  ADD COLUMN IF NOT EXISTS socio_id TEXT;

NOTIFY pgrst, 'reload schema';
