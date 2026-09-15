-- ============================================================================
-- Referidos: cada negocio tiene un link para invitar a otro local.
--
-- Cómo funciona:
--   1. Cada organización recibe un código corto (referral_code).
--   2. El dueño comparte stackrarg.vercel.app/?ref=SUCODIGO
--   3. Quien entra por ese link y se registra queda marcado con
--      referred_by_code, así se sabe a quién corresponde la comisión.
--
-- Todo aditivo: sólo agrega columnas y funciones. No toca datos existentes.
-- Correr una sola vez en el SQL Editor.
-- ============================================================================

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS referral_code     TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS referred_by_code  TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS referred_at       TIMESTAMPTZ;

-- Código corto legible (sin 0/O/1/I para que no se confundan al dictarlo).
CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars  TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code   TEXT;
  i      INT;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.organizations WHERE referral_code = code);
  END LOOP;
  RETURN code;
END;
$$;

-- Asignar código a los negocios que ya existen.
UPDATE public.organizations
SET referral_code = public.gen_referral_code()
WHERE referral_code IS NULL;

-- Y a los que se creen de ahora en más.
ALTER TABLE public.organizations ALTER COLUMN referral_code SET DEFAULT public.gen_referral_code();

CREATE UNIQUE INDEX IF NOT EXISTS organizations_referral_code_key
  ON public.organizations (referral_code) WHERE referral_code IS NOT NULL;

-- ── Guardar quién refirió, al registrarse ──────────────────────────────
-- Se llama desde la app justo después de crear la organización. Sólo escribe
-- si todavía no tiene referente y si el código existe y no es el propio.
CREATE OR REPLACE FUNCTION public.set_referral(p_org_id UUID, p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  limpio TEXT := upper(trim(coalesce(p_code, '')));
  dueno  UUID;
BEGIN
  IF limpio = '' THEN RETURN FALSE; END IF;

  SELECT id INTO dueno FROM public.organizations WHERE referral_code = limpio;
  IF dueno IS NULL OR dueno = p_org_id THEN RETURN FALSE; END IF;

  UPDATE public.organizations
  SET referred_by_code = limpio, referred_at = NOW()
  WHERE id = p_org_id AND referred_by_code IS NULL;

  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_referral(UUID, TEXT) TO authenticated;

-- ── Lo que ve cada dueño: su código y a cuántos trajo ──────────────────
CREATE OR REPLACE FUNCTION public.my_referrals()
RETURNS TABLE (code TEXT, invitados BIGINT, pagos BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  mi_org  UUID := public.current_user_org_id();
  mi_code TEXT;
BEGIN
  SELECT referral_code INTO mi_code FROM public.organizations WHERE id = mi_org;
  RETURN QUERY
  SELECT
    mi_code,
    count(*) FILTER (WHERE o.referred_by_code = mi_code)::BIGINT,
    count(*) FILTER (WHERE o.referred_by_code = mi_code AND o.plan = 'active')::BIGINT
  FROM public.organizations o;
END;
$$;
GRANT EXECUTE ON FUNCTION public.my_referrals() TO authenticated;

-- ── Lo que ve el superadmin: quién trajo a quién ───────────────────────
CREATE OR REPLACE FUNCTION public.get_referrals()
RETURNS TABLE (
  org_id UUID, org_name TEXT, plan TEXT, created_at TIMESTAMPTZ,
  referred_by_code TEXT, referrer_name TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  RETURN QUERY
  SELECT o.id, o.name, o.plan, o.created_at, o.referred_by_code, r.name
  FROM public.organizations o
  LEFT JOIN public.organizations r ON r.referral_code = o.referred_by_code
  WHERE o.referred_by_code IS NOT NULL
  ORDER BY o.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_referrals() TO authenticated;
