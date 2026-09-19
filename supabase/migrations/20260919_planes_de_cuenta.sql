-- ============================================================================
-- Suscripción mensual y licencia de por vida.
--
-- OJO CON `organizations.plan`: esa columna YA EXISTE y ya se usa. Su
-- vocabulario es `'active'` = local que paga, cualquier otro valor = prueba,
-- y de eso depende todo el panel superadmin (el listado de negocios, la
-- agenda de vencimientos, la pantalla de cobros).
--
-- Por eso NO se toca. Lo nuevo va en dos columnas aparte. La primera versión
-- de esta migración intentaba redefinir `plan` con valores propios, y eso
-- habría hecho que un local con `plan = 'active'` —o sea, uno que te paga—
-- y el trial vencido hace meses viera "tu cuenta está en sólo lectura".
--
-- NO BORRA NI MODIFICA NINGÚN DATO. Agrega dos columnas que arrancan
-- vacías, y con ellas vacías el comportamiento es exactamente el de hoy.
-- ============================================================================


-- ── PASO 1: las columnas nuevas ─────────────────────────────────────────

-- Hasta cuándo está paga la suscripción mensual. En null, el local que paga
-- no tiene vencimiento y no se le muestra ningún aviso: es el estado de
-- todos los locales actuales.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS paid_until DATE;

-- Licencia de por vida: no vence nunca, pase lo que pase con las fechas.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS lifetime BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS organizations_paid_until_idx
  ON public.organizations (paid_until) WHERE paid_until IS NOT NULL;


-- ── PASO 2: ¿a quién habría que darle la licencia de por vida? ──────────
-- Los locales que ya pagaron el pago único compraron una licencia para
-- siempre. Este SELECT no modifica nada: muestra quiénes tienen un cobro
-- registrado, para revisarlos ANTES de marcarlos.

SELECT
  o.id,
  o.name,
  o.plan,
  count(p.id)    AS cobros_registrados,
  max(p.paid_at) AS ultimo_cobro
FROM public.organizations o
JOIN public.platform_payments p ON p.org_id = o.id
GROUP BY o.id, o.name, o.plan
ORDER BY o.name;


-- ── PASO 3: marcarlos ───────────────────────────────────────────────────
-- Revisá primero la lista del PASO 2. Si alguno de esos cobros NO era el
-- pago único (por ejemplo una seña, o un mes suelto), sacalo a mano antes
-- de correr el UPDATE: marcarlo como lifetime le regala el sistema para
-- siempre.
--
-- Va comentado a propósito. Descomentalo cuando hayas revisado la lista.
--
-- UPDATE public.organizations o
-- SET lifetime = true
-- WHERE o.lifetime = false
--   AND EXISTS (SELECT 1 FROM public.platform_payments p WHERE p.org_id = o.id);


-- ── Para volver atrás, si hiciera falta ─────────────────────────────────
--     ALTER TABLE public.organizations DROP COLUMN paid_until;
--     ALTER TABLE public.organizations DROP COLUMN lifetime;
-- (`plan` no se toca en ningún momento.)
