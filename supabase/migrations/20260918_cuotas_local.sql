-- ============================================================================
-- Ventas en cuotas del local: financiación propia, sin interés.
--
-- Hasta ahora, vender en cuotas era cobrar menos y marcar "queda debiendo":
-- el sistema sabía CUÁNTO se debía, pero no CUÁNDO había que cobrarlo. Sin
-- fechas no hay forma de saber a quién llamar hoy ni quién está atrasado.
--
-- Esta migración agrega el plan de vencimientos y permite imputar un cobro
-- a una cuota puntual.
--
-- Depende de `20260918_cuenta_corriente.sql`: los cobros de las cuotas son
-- los mismos de la cuenta corriente.
--
-- NO BORRA NI MODIFICA NINGÚN DATO EXISTENTE. Crea una tabla y agrega una
-- columna que arranca en null.
-- ============================================================================


-- ── PASO 1: el plan de vencimientos ─────────────────────────────────────
-- Una fila por cuota. El MONTO y la FECHA se guardan; el ESTADO no: se
-- deriva de los cobros imputados a esa cuota. Guardar además una columna de
-- estado sería tener dos fuentes de la misma verdad, y tarde o temprano
-- dejan de coincidir.

CREATE TABLE IF NOT EXISTS public.sale_installments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL DEFAULT public.current_user_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- `sales.id` es BIGINT, como el resto de las tablas viejas.
  sale_id    BIGINT NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,

  number     INTEGER NOT NULL CHECK (number > 0),
  due_date   DATE NOT NULL,
  amount     NUMERIC NOT NULL CHECK (amount >= 0),
  currency   TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS','USD')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Dos cuotas número 3 de la misma venta es siempre un error de carga.
  UNIQUE (sale_id, number)
);

CREATE INDEX IF NOT EXISTS sale_installments_sale_idx ON public.sale_installments (sale_id);
CREATE INDEX IF NOT EXISTS sale_installments_due_idx  ON public.sale_installments (org_id, due_date);

ALTER TABLE public.sale_installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org members see their installments" ON public.sale_installments;
CREATE POLICY "org members see their installments"
  ON public.sale_installments FOR ALL
  USING      (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));


-- ── PASO 2: imputar un cobro a una cuota ────────────────────────────────
-- Un cobro puede ir contra una cuota puntual, contra una venta sin plan, o
-- a cuenta. Por eso la columna es opcional: los cobros que ya existen no se
-- tocan y siguen funcionando igual.

ALTER TABLE public.customer_payments
  ADD COLUMN IF NOT EXISTS installment_id UUID REFERENCES public.sale_installments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS customer_payments_installment_idx
  ON public.customer_payments (installment_id);


-- ── Para volver atrás, si hiciera falta ─────────────────────────────────
--     ALTER TABLE public.customer_payments DROP COLUMN installment_id;
--     DROP TABLE public.sale_installments;
-- (Borrar la tabla elimina los planes de cuotas, no las ventas ni los
--  cobros: esos viven en `sales` y `customer_payments`.)
