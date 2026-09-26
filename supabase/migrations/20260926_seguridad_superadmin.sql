-- ============================================================================
-- Seguridad: funciones que cualquier usuario podía llamar sobre otros negocios.
--
-- NO BORRA NI MODIFICA NINGÚN DATO: sólo reemplaza dos funciones por
-- versiones que controlan quién las llama.
-- ============================================================================

BEGIN;

-- ── 1. Lista de todos los negocios: sólo el superadmin ─────────────────
-- La versión anterior no controlaba nada: cualquier usuario (o alguien sin
-- sesión) obtenía nombre, plan y email del dueño de todos los negocios.
DROP FUNCTION IF EXISTS public.get_all_organizations();
CREATE FUNCTION public.get_all_organizations()
RETURNS TABLE (
  id uuid,
  name text,
  plan text,
  trial_expires_at timestamptz,
  created_at timestamptz,
  user_count bigint,
  owner_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Sin permisos' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.plan,
    o.trial_expires_at,
    o.created_at,
    COUNT(p.id)::bigint AS user_count,
    MAX(CASE WHEN p.role = 'owner' THEN p.email END) AS owner_email
  FROM public.organizations o
  LEFT JOIN public.profiles p ON p.org_id = o.id
  GROUP BY o.id, o.name, o.plan, o.trial_expires_at, o.created_at;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_all_organizations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_all_organizations() TO authenticated;

-- ── 2. Referido: sólo sobre el negocio propio ──────────────────────────
-- Antes aceptaba cualquier org_id: se le podía estampar un código de
-- referido a negocios ajenos (y cobrar comisiones que no corresponden).
CREATE OR REPLACE FUNCTION public.set_referral(p_org_id UUID, p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  limpio TEXT := upper(trim(coalesce(p_code, '')));
  dueno  UUID;
BEGIN
  IF limpio = '' THEN RETURN FALSE; END IF;
  IF p_org_id IS NULL OR p_org_id IS DISTINCT FROM public.current_user_org_id() THEN
    RETURN FALSE;
  END IF;

  SELECT id INTO dueno FROM public.organizations WHERE referral_code = limpio;
  IF dueno IS NULL OR dueno = p_org_id THEN RETURN FALSE; END IF;

  UPDATE public.organizations
  SET referred_by_code = limpio, referred_at = NOW()
  WHERE id = p_org_id AND referred_by_code IS NULL;

  RETURN FOUND;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_referral(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_referral(UUID, TEXT) TO authenticated;

COMMIT;
