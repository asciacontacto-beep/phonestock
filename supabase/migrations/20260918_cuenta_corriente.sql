-- ============================================================================
-- Cuenta corriente de clientes: cobrar un saldo después de la venta.
--
-- Hoy una venta puede cerrarse cobrando menos que el precio: queda con
-- `balance_due > 0` y el cliente figura como deudor. Pero no hay ninguna
-- forma de cobrar ese saldo más tarde. El único camino es editar la venta
-- vieja y agregarle un pago a mano, lo que rompe dos cosas:
--
--   * `balance_due` no se recalcula, así que la deuda sigue figurando para
--     siempre aunque el cliente ya haya pagado;
--   * el pago hereda la fecha de la venta, así que la plata NO aparece en
--     el arqueo del día en que realmente se cobró.
--
-- Esta migración agrega dónde anotar esos cobros y con qué cliente se
-- relacionan.
--
-- NO BORRA NI MODIFICA NINGÚN DATO EXISTENTE. Agrega una columna nueva
-- (que arranca en null), la rellena donde puede, y crea una tabla nueva.
-- ============================================================================


-- ── PASO 1: la venta necesita saber de quién es ─────────────────────────
-- Hoy las ventas guardan el cliente como JSON (`sales.customer`) y se
-- emparejan con la ficha por DNI o por nombre, con una heurística
-- (`ventaEsDe()` en src/utils/customers.ts). Para mostrar deudas eso
-- alcanza a medias: dos clientes con el miso  nombre parten el saldo en
-- dos, y el mismo cliente escrito distinto aparece dos veces.
--
-- La columna arranca en null y la heurística sigue funcionando como estaba:
-- nada se rompe si el backfill no encuentra la ficha.

-- `customers.id` y `sales.id` son BIGINT (no uuid): las tablas viejas del
-- sistema usan identidad numérica. Sólo las tablas nuevas —organizations,
-- deposits, profiles— son uuid.
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS customer_id BIGINT REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sales_customer_id_idx ON public.sales (customer_id);


-- ── PASO 2: ¿qué va a emparejar el backfill? ────────────────────────────
-- Correr esto ANTES del paso 3 para ver qué se va a llenar. No modifica
-- nada: sólo cuenta cuántas ventas van a quedar con ficha y cuántas no.

SELECT
  count(*) FILTER (WHERE c.id IS NOT NULL) AS ventas_con_ficha,
  count(*) FILTER (WHERE c.id IS NULL)     AS ventas_sin_ficha
FROM public.sales s
LEFT JOIN public.customers c
  ON  c.org_id = s.org_id
  AND (
        -- El documento manda cuando los dos lados lo tienen y es de verdad
        -- un documento: "-", "0" y "s/n" no identifican a nadie.
        (
          length(regexp_replace(coalesce(s.customer->>'dni', ''), '[^0-9A-Za-z]', '', 'g')) >= 6
          AND regexp_replace(coalesce(s.customer->>'dni', ''), '[^0-9A-Za-z]', '', 'g')
            = regexp_replace(coalesce(c.dni, ''),              '[^0-9A-Za-z]', '', 'g')
        )
        OR
        -- Si falta de un lado, queda el nombre.
        (
          length(regexp_replace(coalesce(s.customer->>'dni', ''), '[^0-9A-Za-z]', '', 'g')) < 6
          AND lower(trim(coalesce(s.customer->>'name', ''))) = lower(trim(coalesce(c.name, '')))
          AND trim(coalesce(c.name, '')) <> ''
          AND lower(trim(coalesce(s.customer->>'name', ''))) <> 'consumidor final'
        )
      )
WHERE s.customer_id IS NULL;


-- ── PASO 3: rellenar lo que se puede ────────────────────────────────────
-- Sólo toca filas donde `customer_id` está en null, y sólo cuando hay UNA
-- sola ficha candidata: si hay homónimos, se deja en null en vez de elegir
-- al azar. Una venta mal atribuida es peor que una venta sin atribuir.

UPDATE public.sales s
SET customer_id = m.customer_id
FROM (
  SELECT s2.id AS sale_id, min(c.id) AS customer_id
  FROM public.sales s2
  JOIN public.customers c
    ON  c.org_id = s2.org_id
    AND (
          (
            length(regexp_replace(coalesce(s2.customer->>'dni', ''), '[^0-9A-Za-z]', '', 'g')) >= 6
            AND regexp_replace(coalesce(s2.customer->>'dni', ''), '[^0-9A-Za-z]', '', 'g')
              = regexp_replace(coalesce(c.dni, ''),               '[^0-9A-Za-z]', '', 'g')
          )
          OR
          (
            length(regexp_replace(coalesce(s2.customer->>'dni', ''), '[^0-9A-Za-z]', '', 'g')) < 6
            AND lower(trim(coalesce(s2.customer->>'name', ''))) = lower(trim(coalesce(c.name, '')))
            AND trim(coalesce(c.name, '')) <> ''
            AND lower(trim(coalesce(s2.customer->>'name', ''))) <> 'consumidor final'
          )
        )
  WHERE s2.customer_id IS NULL
  GROUP BY s2.id
  HAVING count(*) = 1     -- una sola ficha candidata, sin homónimos
) m
WHERE s.id = m.sale_id
  AND s.customer_id IS NULL;


-- ── PASO 4: dónde se anotan los cobros ──────────────────────────────────
-- Una fila por cobro, con su fecha REAL. Esa fecha es la razón de ser de
-- la tabla: es lo que hace que la plata caiga en el arqueo del día correcto
-- en vez de en el día de la venta.

CREATE TABLE IF NOT EXISTS public.customer_payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL DEFAULT public.current_user_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,

  customer_id BIGINT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  -- En null es un cobro "a cuenta": entró plata del cliente sin imputar a
  -- una venta puntual.
  sale_id     BIGINT REFERENCES public.sales(id) ON DELETE SET NULL,

  amount      NUMERIC NOT NULL CHECK (amount > 0),
  currency    TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS','USD')),
  -- Cotización del día del cobro. Obligatoria sólo si la moneda del cobro
  -- no coincide con la de la venta; se guarda para que el saldo histórico
  -- no cambie solo cuando se actualiza el dólar.
  exchange_rate NUMERIC,

  method      TEXT NOT NULL DEFAULT 'ars_cash',
  -- `deposits.id` es uuid, a diferencia de los ids numéricos de las tablas
  -- viejas. `sales.deposit_id` ya guarda uuid.
  deposit_id  UUID,

  -- Fecha real del cobro, la que elige el usuario. No es `created_at`:
  -- un cobro de ayer se puede cargar hoy.
  paid_at     DATE NOT NULL DEFAULT current_date,

  notes       TEXT,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_payments_customer_idx ON public.customer_payments (customer_id);
CREATE INDEX IF NOT EXISTS customer_payments_sale_idx     ON public.customer_payments (sale_id);
CREATE INDEX IF NOT EXISTS customer_payments_paid_at_idx  ON public.customer_payments (org_id, paid_at);

ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org members see their customer payments" ON public.customer_payments;
CREATE POLICY "org members see their customer payments"
  ON public.customer_payments FOR ALL
  USING      (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));


-- ── Para volver atrás, si hiciera falta ─────────────────────────────────
--     DROP TABLE public.customer_payments;
--     ALTER TABLE public.sales DROP COLUMN customer_id;
-- (Borrar la tabla de cobros borra los cobros registrados. La columna
--  `customer_id` se puede soltar sin perder ninguna venta.)
