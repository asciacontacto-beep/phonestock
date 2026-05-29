-- ============================================================
-- MIGRACIÓN: Cajas por Depósito + Transferencias entre Cajas
-- Correr en: Supabase > SQL Editor
-- ============================================================

-- 1. Agregar deposit_ids (array UUID) a la tabla profiles
--    Permite asignar un vendedor a uno o más depósitos
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deposit_ids UUID[] DEFAULT '{}';

-- 2. Crear tabla de transferencias entre cajas
CREATE TABLE IF NOT EXISTS public.cash_transfers (
  id              BIGSERIAL   PRIMARY KEY,
  org_id          UUID        NOT NULL DEFAULT public.current_user_org_id(),
  from_deposit_id UUID        NOT NULL REFERENCES public.deposits(id),
  to_deposit_id   UUID        NOT NULL REFERENCES public.deposits(id),
  amount          NUMERIC     NOT NULL CHECK (amount > 0),
  currency        TEXT        NOT NULL DEFAULT 'ARS',
  payment_method  TEXT        NOT NULL DEFAULT 'ars_cash',
  notes           TEXT,
  created_by      UUID        REFERENCES auth.users(id),
  created_by_name TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Habilitar RLS en cash_transfers
ALTER TABLE public.cash_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation Policy" ON public.cash_transfers;
CREATE POLICY "Tenant Isolation Policy" ON public.cash_transfers
  FOR ALL
  USING (org_id = public.current_user_org_id())
  WITH CHECK (org_id = public.current_user_org_id());
