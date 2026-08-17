-- ============================================================================
-- Herramientas para manejar Stackr como negocio, no sólo para mirarlo.
--
-- Faltaban dos cosas para llevar el día a día:
--   1. Los cobros reales. La "facturación" del panel era una estimación
--      (negocios activos × precio); no había registro de quién pagó, cuánto,
--      cuándo ni por qué medio.
--   2. El seguimiento de cada cliente: qué se habló, qué quedó pendiente y
--      cuándo hay que volver a contactarlo.
--
-- Ambas tablas son sólo del superadmin: quedan fuera del aislamiento por
-- organización que usa el resto del sistema.
--
-- Correr una sola vez en el SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT email FROM auth.users WHERE id = auth.uid()), '') = 'asciacontacto@gmail.com';
$$;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;

-- ── Cobros recibidos ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Se guarda el nombre además del vínculo: si el negocio se borra, el cobro
  -- sigue contando en los totales del mes en que entró.
  org_name    TEXT,
  amount      NUMERIC NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'USD',
  method      TEXT,                       -- transferencia | efectivo | mercadopago | cripto | otro
  paid_at     DATE NOT NULL DEFAULT CURRENT_DATE,
  concept     TEXT,                       -- licencia | soporte | personalización | otro
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "solo superadmin" ON public.platform_payments;
CREATE POLICY "solo superadmin" ON public.platform_payments
  FOR ALL USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());
GRANT ALL ON public.platform_payments TO authenticated;

CREATE INDEX IF NOT EXISTS platform_payments_paid_idx ON public.platform_payments (paid_at DESC);
CREATE INDEX IF NOT EXISTS platform_payments_org_idx  ON public.platform_payments (org_id);

-- ── Seguimiento de clientes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  org_name     TEXT,
  body         TEXT NOT NULL,
  kind         TEXT NOT NULL DEFAULT 'nota',  -- nota | llamada | whatsapp | reunion | reclamo
  -- Cuándo hay que volver a este cliente. Es lo que convierte una nota suelta
  -- en algo que el sistema puede recordarte.
  follow_up_at DATE,
  done         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.org_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "solo superadmin" ON public.org_notes;
CREATE POLICY "solo superadmin" ON public.org_notes
  FOR ALL USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());
GRANT ALL ON public.org_notes TO authenticated;

CREATE INDEX IF NOT EXISTS org_notes_org_idx    ON public.org_notes (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS org_notes_follow_idx ON public.org_notes (follow_up_at) WHERE done = FALSE;
