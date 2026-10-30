-- ============================================================================
-- Cotización: dólar blue de Córdoba (infodolar, punta venta) y cotización
-- general que se actualiza sola.
--
-- 1. Suma 'blue_cordoba' a las fuentes posibles de la cotización.
-- 2. cotizacion_auto_general: si el local lo activa, la cotización general
--    de Ajustes (gastos, stock y reportes) se actualiza con la del día.
--
-- NO BORRA NI MODIFICA NINGÚN DATO: todos los locales siguen como están.
-- ============================================================================

DO $$
DECLARE c TEXT;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.settings'::regclass AND contype = 'c'
       AND pg_get_constraintdef(oid) LIKE '%cotizacion_fuente%'
  LOOP
    EXECUTE format('ALTER TABLE public.settings DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE public.settings
  ADD CONSTRAINT settings_cotizacion_fuente_check
  CHECK (cotizacion_fuente IN ('manual', 'blue', 'cripto', 'blue_cordoba'));

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS cotizacion_auto_general BOOLEAN NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
