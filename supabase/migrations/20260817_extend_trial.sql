-- ============================================================================
-- Extender la prueba gratis a gusto desde el panel superadmin.
--
-- Hasta ahora la única salida para un trial vencido era "marcar como pago"
-- (que lo deja activo para siempre) o borrar el negocio. Faltaba lo que se
-- usa todos los días: darle unos días más a alguien que está por decidir.
--
-- Dos funciones, ambas restringidas al superadmin:
--   extend_trial(org_id, days)      suma días al vencimiento. Si ya venció,
--                                   cuenta desde HOY (sino "sumar 7 días" a
--                                   un trial vencido hace un mes no sirve).
--   set_trial_expiration(org_id, d) fija una fecha exacta. NULL = sin
--                                   vencimiento, sin marcarlo como pago.
--
-- Sólo tocan la columna trial_expires_at de organizations: no borran datos
-- ni afectan al negocio ni a sus usuarios.
--
-- Correr una sola vez en el SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.extend_trial(org_id UUID, days INTEGER)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base    TIMESTAMPTZ;
  nuevo   TIMESTAMPTZ;
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF days IS NULL OR days = 0 THEN
    RAISE EXCEPTION 'Indicá cuántos días extender';
  END IF;

  SELECT trial_expires_at INTO base FROM public.organizations WHERE id = org_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Negocio no encontrado';
  END IF;

  -- Si ya venció (o nunca tuvo fecha), se cuenta desde ahora.
  IF base IS NULL OR base < NOW() THEN
    base := NOW();
  END IF;

  nuevo := base + (days || ' days')::INTERVAL;

  -- Sólo se mueve la fecha. El plan no se toca: extenderle la prueba a alguien
  -- nunca debe degradar a un negocio que ya pagó.
  UPDATE public.organizations
  SET trial_expires_at = nuevo
  WHERE id = org_id;

  RETURN nuevo;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_trial_expiration(org_id UUID, expires_at TIMESTAMPTZ)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.organizations
  SET trial_expires_at = expires_at
  WHERE id = org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Negocio no encontrado';
  END IF;

  RETURN expires_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.extend_trial(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_trial_expiration(UUID, TIMESTAMPTZ) TO authenticated;
