-- ============================================================================
-- Cotización automática: cada local elige si la cotización de sus ventas
-- nuevas es la que escribe a mano, la del dólar blue o la del cripto del día.
--
-- NO BORRA NI MODIFICA NINGÚN DATO: agrega una columna que arranca en
-- 'manual' para todos, o sea, exactamente como funciona hoy.
-- ============================================================================

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS cotizacion_fuente TEXT NOT NULL DEFAULT 'manual'
  CHECK (cotizacion_fuente IN ('manual', 'blue', 'cripto'));
