-- Anulación de venta ATÓMICA (todo o nada).
--
-- Hoy la app anula una venta con varias llamadas sueltas desde el cliente
-- (devolver equipo, devolver accesorios, sacar canje, borrar venta). Si una
-- falla a mitad de camino, la base queda en un estado inconsistente.
--
-- Esta función hace exactamente lo mismo pero dentro de UNA transacción de
-- Postgres: si cualquier paso falla, se revierte TODO automáticamente.
--
-- Corre con SECURITY INVOKER (la de por defecto): respeta las políticas RLS
-- del usuario, así que sólo puede tocar filas de su propia organización.
--
-- El cliente la usa si está instalada y, si no, cae al camino secuencial
-- anterior. Es 100% aditiva: instalarla no cambia datos existentes.
--
-- ⚠️ Antes de confiar en ella en producción, probá anular una venta de prueba
--    y verificá que el stock/canje vuelvan como esperás.

CREATE OR REPLACE FUNCTION public.void_sale(p_sale_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_sale            public.sales%ROWTYPE;
  v_is_accessory    boolean;
  v_is_service      boolean;
  v_device_restored boolean := false;
  v_acc_restored    int := 0;
  v_tradein_removed int := 0;
  v_warnings        text[] := ARRAY[]::text[];
  v_stock_id        uuid;
  acc               jsonb;
  pay               jsonb;
BEGIN
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta no encontrada (o sin permiso para verla): %', p_sale_id;
  END IF;

  v_is_accessory := upper(coalesce(v_sale.brand, '')) = 'ACCESORIOS';
  v_is_service   := upper(coalesce(v_sale.brand, '')) = 'SERVICIO';

  -- 1. Devolver el equipo al inventario.
  IF NOT v_is_accessory AND NOT v_is_service THEN
    IF v_sale.imei IS NOT NULL AND v_sale.imei <> '' THEN
      SELECT id INTO v_stock_id
      FROM public.stock
      WHERE status = 'sold' AND brand = v_sale.brand AND model = v_sale.model
        AND imei = v_sale.imei
      LIMIT 1;
    ELSE
      SELECT id INTO v_stock_id
      FROM public.stock
      WHERE status = 'sold' AND brand = v_sale.brand AND model = v_sale.model
        AND storage IS NOT DISTINCT FROM v_sale.storage
        AND color   IS NOT DISTINCT FROM v_sale.color
      LIMIT 1;
    END IF;

    IF v_stock_id IS NOT NULL THEN
      UPDATE public.stock SET status = 'available' WHERE id = v_stock_id;
      v_device_restored := true;
      IF v_sale.imei IS NULL OR v_sale.imei = '' THEN
        v_warnings := array_append(v_warnings,
          'La venta no tenía IMEI, así que se devolvió al stock una unidad del mismo modelo y color. Verificá el inventario.');
      END IF;
    ELSE
      v_warnings := array_append(v_warnings,
        'No se encontró el equipo en el stock para devolverlo (puede haber sido borrado o ya devuelto).');
    END IF;
  END IF;

  -- 2. Devolver el stock de los accesorios.
  IF v_sale.accessories IS NOT NULL AND jsonb_typeof(v_sale.accessories) = 'array' THEN
    FOR acc IN SELECT * FROM jsonb_array_elements(v_sale.accessories) LOOP
      IF acc->>'id' IS NOT NULL THEN
        UPDATE public.accessories
        SET stock = coalesce(stock, 0) + coalesce((acc->>'qty')::int, 1)
        WHERE id = (acc->>'id')::uuid;
        v_acc_restored := v_acc_restored + 1;
      END IF;
    END LOOP;
  END IF;

  -- 3. Sacar del inventario los equipos que entraron como parte de pago (canje).
  IF v_sale.payments IS NOT NULL AND jsonb_typeof(v_sale.payments) = 'array' THEN
    FOR pay IN SELECT * FROM jsonb_array_elements(v_sale.payments) LOOP
      IF pay->>'id' = 'tradein' AND pay->'device'->>'imei' IS NOT NULL THEN
        DELETE FROM public.stock WHERE imei = pay->'device'->>'imei';
        v_tradein_removed := v_tradein_removed + 1;
      END IF;
    END LOOP;
  END IF;

  -- 4. Recién ahora borrar la venta.
  DELETE FROM public.sales WHERE id = p_sale_id;

  RETURN jsonb_build_object(
    'deviceRestored',      v_device_restored,
    'accessoriesRestored', v_acc_restored,
    'tradeInsRemoved',     v_tradein_removed,
    'warnings',            to_jsonb(v_warnings)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.void_sale(uuid) TO authenticated;
