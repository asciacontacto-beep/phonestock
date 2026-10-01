-- ============================================================================
-- Cuentas, financieras, cierre de turno a ciegas y valores de toma.
--
-- 1. `accounts`: a dónde entra la plata que no es efectivo (banco, billetera,
--    financiera, procesadora de tarjeta). La venta guarda la cuenta dentro
--    de `sales.payments`; no se agrega ninguna columna a `sales`.
-- 2. `card_plans`: pasa a ser "plan de tarjeta o financiera", con la cuenta
--    donde acredita y los días que tarda.
-- 3. `cash_closures`: el cierre de turno del vendedor queda guardado. Guarda
--    sólo lo que declaró; lo esperado se calcula al mirarlo.
-- 4. `settings.cierre_a_ciegas`: el vendedor cierra sin ver lo esperado.
-- 5. `tradein_values`: cuánto se paga por un usado según modelo, capacidad
--    y batería.
--
-- NO BORRA NI MODIFICA NINGÚN DATO EXISTENTE. Todo es aditivo: tablas y
-- columnas nuevas, con valores por defecto que dejan todo como estaba.
-- La app funciona sin esta migración (oculta lo que depende de ella).
-- ============================================================================

BEGIN;

-- ── 1. Cuentas ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL DEFAULT public.current_user_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (length(trim(name)) > 0),
  kind        TEXT NOT NULL DEFAULT 'banco' CHECK (kind IN ('banco', 'billetera', 'financiera', 'tarjeta')),
  currency    TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Dos cuentas con el mismo nombre y moneda son un error de carga: el
  -- vendedor no sabría en cuál cargó la transferencia.
  UNIQUE (org_id, name, currency)
);

CREATE INDEX IF NOT EXISTS accounts_org_idx ON public.accounts (org_id, active);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Todo el equipo las ve (el vendedor elige a cuál entra la transferencia);
-- sólo el dueño las crea o cambia.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'accounts' AND policyname = 'cuentas_ver') THEN
    CREATE POLICY "cuentas_ver" ON public.accounts
  FOR SELECT TO authenticated
  USING (org_id = public.current_user_org_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'accounts' AND policyname = 'cuentas_dueno') THEN
    CREATE POLICY "cuentas_dueno" ON public.accounts
  FOR ALL TO authenticated
  USING (org_id = public.current_user_org_id()
         AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner'))
  WITH CHECK (org_id = public.current_user_org_id()
         AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner'));
  END IF;
END $$;

-- ── 2. Planes de tarjeta o financiera ──────────────────────────────────────
ALTER TABLE public.card_plans
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'tarjeta',
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS settlement_days INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'card_plans_kind_check') THEN
    ALTER TABLE public.card_plans ADD CONSTRAINT card_plans_kind_check CHECK (kind IN ('tarjeta', 'financiera'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'card_plans_settlement_days_check') THEN
    ALTER TABLE public.card_plans ADD CONSTRAINT card_plans_settlement_days_check CHECK (settlement_days >= 0 AND settlement_days <= 365);
  END IF;
END $$;

-- ── 3. Cierres de turno ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cash_closures (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL DEFAULT public.current_user_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name     TEXT,
  deposit_id    UUID,
  -- Desde cuándo cuenta el turno (el cierre anterior o el inicio del día).
  desde         TIMESTAMPTZ,
  declared_ars  NUMERIC NOT NULL DEFAULT 0 CHECK (declared_ars >= 0),
  declared_usd  NUMERIC NOT NULL DEFAULT 0 CHECK (declared_usd >= 0),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cash_closures_org_idx ON public.cash_closures (org_id, created_at DESC);

ALTER TABLE public.cash_closures ENABLE ROW LEVEL SECURITY;

-- El vendedor registra y ve sus propios cierres; el dueño ve todos.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cash_closures' AND policyname = 'cierres_propios') THEN
    CREATE POLICY "cierres_propios" ON public.cash_closures
  FOR SELECT TO authenticated
  USING (org_id = public.current_user_org_id()
         AND (user_id = auth.uid()
              OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner')));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cash_closures' AND policyname = 'cierres_registrar') THEN
    CREATE POLICY "cierres_registrar" ON public.cash_closures
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.current_user_org_id() AND user_id = auth.uid());
  END IF;
END $$;

-- Un cierre no se edita: si hubo un error se hace otro. Sólo el dueño borra.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cash_closures' AND policyname = 'cierres_borrar_dueno') THEN
    CREATE POLICY "cierres_borrar_dueno" ON public.cash_closures
  FOR DELETE TO authenticated
  USING (org_id = public.current_user_org_id()
         AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner'));
  END IF;
END $$;

-- ── 4. Cierre a ciegas ──────────────────────────────────────────────────────
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS cierre_a_ciegas BOOLEAN NOT NULL DEFAULT false;

-- ── 5. Valores de toma ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tradein_values (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL DEFAULT public.current_user_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  model        TEXT NOT NULL CHECK (length(trim(model)) > 0),
  -- Vacío: vale para cualquier capacidad del modelo.
  storage      TEXT,
  -- Tramo "desde X% de batería".
  battery_min  INTEGER NOT NULL DEFAULT 0 CHECK (battery_min BETWEEN 0 AND 100),
  value        NUMERIC NOT NULL CHECK (value >= 0),
  currency     TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('ARS', 'USD')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tradein_values_unico
  ON public.tradein_values (org_id, lower(model), lower(coalesce(storage, '')), battery_min);

ALTER TABLE public.tradein_values ENABLE ROW LEVEL SECURITY;

-- El vendedor la consulta al tomar un usado; sólo el dueño la carga.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tradein_values' AND policyname = 'toma_ver') THEN
    CREATE POLICY "toma_ver" ON public.tradein_values
  FOR SELECT TO authenticated
  USING (org_id = public.current_user_org_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tradein_values' AND policyname = 'toma_dueno') THEN
    CREATE POLICY "toma_dueno" ON public.tradein_values
  FOR ALL TO authenticated
  USING (org_id = public.current_user_org_id()
         AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner'))
  WITH CHECK (org_id = public.current_user_org_id()
         AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner'));
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts, public.cash_closures, public.tradein_values TO authenticated;

COMMIT;

-- Para que la API vea las tablas nuevas sin esperar.
NOTIFY pgrst, 'reload schema';

-- Para volver atrás: supabase/rollback/20260930_cuentas_financieras_y_caja_volver_atras.sql
