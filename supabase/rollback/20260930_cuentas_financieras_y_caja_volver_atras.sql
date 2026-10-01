-- ============================================================================
-- VOLVER ATRÁS la migración 20260930_cuentas_financieras_y_caja.sql
--
-- ATENCIÓN: esto SÍ borra. Elimina las tablas y columnas que agregó esa
-- migración, con lo que se haya cargado en ellas (cuentas, cierres de turno,
-- valores de toma, y en los planes: cuenta, tipo y días de acreditación).
-- Correrlo sólo si se quiere deshacer la migración.
--
-- Las ventas NO se tocan: cada pago guarda dentro de sales.payments el
-- nombre de su cuenta, así que siguen leyéndose bien.
-- ============================================================================

ALTER TABLE public.card_plans DROP COLUMN IF EXISTS account_id,
  DROP COLUMN IF EXISTS settlement_days, DROP COLUMN IF EXISTS kind;
ALTER TABLE public.settings DROP COLUMN IF EXISTS cierre_a_ciegas;
DROP TABLE IF EXISTS public.tradein_values, public.cash_closures, public.accounts;
