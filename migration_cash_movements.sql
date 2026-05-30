-- ============================================================
-- MIGRACIÓN: Movimientos de Caja (Ingresos y Egresos Manuales)
-- Correr en: Supabase > SQL Editor
-- ============================================================

-- Asegurar que la función existe para multitenancy
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE TABLE IF NOT EXISTS public.cash_movements (
  id              BIGSERIAL   PRIMARY KEY,
  org_id          UUID        NOT NULL DEFAULT public.current_user_org_id(),
  deposit_id      UUID        NOT NULL REFERENCES public.deposits(id),
  movement_type   TEXT        NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
  amount          NUMERIC     NOT NULL CHECK (amount > 0),
  currency        TEXT        NOT NULL DEFAULT 'ARS',
  payment_method  TEXT        NOT NULL DEFAULT 'ars_cash',
  notes           TEXT,
  created_by      UUID        REFERENCES auth.users(id),
  created_by_name TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS en cash_movements
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation Policy" ON public.cash_movements;
CREATE POLICY "Tenant Isolation Policy" ON public.cash_movements
  FOR ALL
  USING (org_id = public.current_user_org_id())
  WITH CHECK (org_id = public.current_user_org_id());
