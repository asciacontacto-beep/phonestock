-- ============================================================================
-- Planes de cuenta: prueba, suscripción mensual y licencia de por vida.
--
-- Hasta ahora el acceso se controlaba con una sola fecha
-- (`organizations.trial_expires_at`) y el cobro se anotaba a mano en
-- `platform_payments`. No había forma de distinguir a un local que paga
-- todos los meses de uno que compró la licencia para siempre.
--
-- NO BORRA NI MODIFICA NINGÚN DATO. Agrega dos columnas con valores por
-- defecto que dejan todo funcionando exactamente igual que hoy.
-- ============================================================================


-- ── PASO 1: las columnas nuevas ─────────────────────────────────────────
-- `plan` arranca en 'trial' para todos: es el comportamiento actual, donde
-- manda `trial_expires_at`. Nadie cambia de estado por correr esto.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'trial'
    CHECK (plan IN ('trial','monthly','lifetime'));

-- Hasta cuándo está paga la suscripción mensual. En la licencia de por vida
-- y en el trial no se usa.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS paid_until DATE;

CREATE INDEX IF NOT EXISTS organizations_plan_idx ON public.organizations (plan);


-- ── PASO 2: ¿a quién habría que darle la licencia de por vida? ──────────
-- Los locales que ya pagaron el pago único compraron una licencia para
-- siempre. Este SELECT no modifica nada: muestra quiénes tienen un cobro
-- registrado, para revisarlos ANTES de marcarlos.

SELECT
  o.id,
  o.name,
  o.plan,
  count(p.id)      AS cobros_registrados,
  max(p.paid_at)   AS ultimo_cobro
FROM public.organizations o
JOIN public.platform_payments p ON p.org_id = o.id
GROUP BY o.id, o.name, o.plan
ORDER BY o.name;


-- ── PASO 3: marcarlos ───────────────────────────────────────────────────
-- Revisá primero la lista del PASO 2. Si alguno de esos cobros NO era el
-- pago único (por ejemplo una seña, o un mes suelto), sacalo a mano de esta
-- lista antes de correr el UPDATE: marcarlo como lifetime le regala el
-- sistema para siempre.
--
-- Esta versión está comentada a propósito. Descomentala cuando hayas
-- revisado la lista.
--
-- UPDATE public.organizations o
-- SET plan = 'lifetime'
-- WHERE o.plan = 'trial'
--   AND EXISTS (SELECT 1 FROM public.platform_payments p WHERE p.org_id = o.id);


-- ── Para volver atrás, si hiciera falta ─────────────────────────────────
--     ALTER TABLE public.organizations DROP COLUMN plan;
--     ALTER TABLE public.organizations DROP COLUMN paid_until;
