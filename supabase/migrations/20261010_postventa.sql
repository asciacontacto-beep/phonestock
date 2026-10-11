-- ============================================================================
-- Postventa: garantía con vencimiento e IMEI en las reparaciones.
--
--   * settings.garantia_dias: la garantía por defecto del local (90 días).
--   * sales.warranty_days: la garantía de cada venta (vacía = la del local;
--     0 = sin garantía). Con esto se sabe hasta cuándo está cubierto.
--   * repairs.device_imei: el IMEI del equipo que entra a reparar, para el
--     historial por IMEI.
--
-- NO BORRA NI MODIFICA NINGÚN DATO: agrega columnas vacías.
-- ============================================================================

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS garantia_dias INTEGER NOT NULL DEFAULT 90
  CHECK (garantia_dias >= 0 AND garantia_dias <= 3650);

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS warranty_days INTEGER
  CHECK (warranty_days IS NULL OR (warranty_days >= 0 AND warranty_days <= 3650));

ALTER TABLE public.repairs
  ADD COLUMN IF NOT EXISTS device_imei TEXT;

CREATE INDEX IF NOT EXISTS sales_imei_idx ON public.sales (org_id, imei);
CREATE INDEX IF NOT EXISTS repairs_device_imei_idx ON public.repairs (org_id, device_imei) WHERE device_imei IS NOT NULL;
