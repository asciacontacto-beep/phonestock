-- ============================================================================
-- Planes de tarjeta con recargo.
--
-- Hoy cobrar con tarjeta es cargar un monto a mano: no queda registrado con
-- qué plan se vendió ni cuánto se llevó la tarjeta, así que no hay forma de
-- saber después cuánto costó financiar ni de auditar una venta.
--
-- Los planes se cargan una vez (tarjeta, cuotas, % de recargo, quién lo paga
-- por defecto, dónde acredita) y en la venta sólo se elige cuál.
--
-- NO BORRA NI MODIFICA NINGÚN DATO EXISTENTE. Crea una tabla nueva.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.card_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL DEFAULT public.current_user_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,

  card_name     TEXT NOT NULL,
  installments  INTEGER NOT NULL DEFAULT 1 CHECK (installments > 0),
  surcharge_pct NUMERIC NOT NULL DEFAULT 0 CHECK (surcharge_pct >= 0),

  -- Quién paga el recargo POR DEFECTO. El vendedor lo puede cambiar en cada
  -- venta: es un valor precargado, no una regla.
  paid_by       TEXT NOT NULL DEFAULT 'customer' CHECK (paid_by IN ('customer','shop')),

  -- Caja donde acredita la tarjeta. `deposits.id` es uuid.
  deposit_id    UUID,

  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- La misma tarjeta con la misma cantidad de cuotas dos veces es siempre un
  -- error de carga: el vendedor no sabría cuál elegir.
  UNIQUE (org_id, card_name, installments)
);

CREATE INDEX IF NOT EXISTS card_plans_org_idx ON public.card_plans (org_id, active);

ALTER TABLE public.card_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members see their card plans"
  ON public.card_plans FOR ALL
  USING      (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));


-- ── Para volver atrás, si hiciera falta ─────────────────────────────────
--     DROP TABLE public.card_plans;
-- (Borra los planes cargados. Las ventas hechas con tarjeta no se tocan:
--  guardan el plan y el recargo dentro de `sales.payments`.)
