-- ============================================================================
-- El costo de una venta de vendedor se convierte con la cotización del día
-- de ESA venta (la que quedó guardada en sus pagos), no con la de Ajustes.
-- Si no, precio y costo se pasaban a dólares con números distintos y la
-- ganancia no cerraba.
--
-- NO BORRA NI MODIFICA NINGÚN DATO: sólo reemplaza una función.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fijar_costo_venta(p_sale_id TEXT, p_stock_id TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  org UUID := public.current_user_org_id();
  costo NUMERIC; moneda_equipo TEXT; moneda_venta TEXT; cot NUMERIC; pagos JSONB;
BEGIN
  IF org IS NULL THEN RETURN; END IF;
  SELECT s.cost_price, s.currency INTO costo, moneda_equipo
    FROM public.stock s
   WHERE s.id::text = p_stock_id AND s.org_id = org AND s.status = 'sold';
  IF costo IS NULL THEN RETURN; END IF;
  SELECT v.currency, v.payments INTO moneda_venta, pagos
    FROM public.sales v, public.stock s
   WHERE v.id::text = p_sale_id AND v.org_id = org AND v.cost_price IS NULL
     AND v.seller_id = auth.uid()
     AND v.created_at > now() - interval '15 minutes'
     AND s.id::text = p_stock_id
     AND v.brand IS NOT DISTINCT FROM s.brand AND v.model IS NOT DISTINCT FROM s.model
     AND v.imei IS NOT DISTINCT FROM s.imei;
  IF NOT FOUND THEN RETURN; END IF;

  -- La cotización de la venta; si no quedó guardada, la de Ajustes.
  SELECT r INTO cot FROM (
    SELECT NULLIF(p->>'exchange_rate', '')::numeric AS r FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(pagos) = 'array' THEN pagos ELSE '[]'::jsonb END) p
    UNION ALL
    SELECT NULLIF(p->>'sale_rate', '')::numeric FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(pagos) = 'array' THEN pagos ELSE '[]'::jsonb END) p
  ) x WHERE r > 0 LIMIT 1;
  IF cot IS NULL THEN
    SELECT exchange_rate INTO cot FROM public.settings WHERE org_id = org LIMIT 1;
  END IF;

  UPDATE public.sales
     SET cost_price = round(public.convertir_a_moneda(costo, moneda_equipo, moneda_venta, cot), 2)
   WHERE id::text = p_sale_id AND org_id = org AND cost_price IS NULL;
END $$;

REVOKE EXECUTE ON FUNCTION public.fijar_costo_venta(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fijar_costo_venta(TEXT, TEXT) TO authenticated;
