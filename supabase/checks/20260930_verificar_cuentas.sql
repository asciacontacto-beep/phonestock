-- ============================================================================
-- Verificación de la migración 20260930_cuentas_financieras_y_caja.sql
--
-- SÓLO LECTURA: no crea, no cambia y no borra nada. Se puede correr las
-- veces que haga falta, en producción, desde el SQL Editor.
--
-- Uso:
--   1. Correr este archivo ANTES de la migración y guardar el resultado.
--   2. Aplicar la migración.
--   3. Correrlo DESPUÉS y comparar: la "foto" de filas tiene que dar
--      idéntica. Las únicas diferencias esperables son las tablas y
--      columnas nuevas de la sección 2.
-- ============================================================================

-- ── 1. Requisitos: lo que la migración usa y tiene que existir ─────────────
SELECT 'requisito' AS tipo, nombre, existe
FROM (VALUES
  ('función public.current_user_org_id()', to_regprocedure('public.current_user_org_id()') IS NOT NULL),
  ('tabla public.organizations',           to_regclass('public.organizations') IS NOT NULL),
  ('tabla public.profiles',                to_regclass('public.profiles') IS NOT NULL),
  ('tabla public.card_plans',              to_regclass('public.card_plans') IS NOT NULL),
  ('tabla public.settings',                to_regclass('public.settings') IS NOT NULL),
  ('columna profiles.role',                EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'))
) AS r(nombre, existe);

-- ── 2. Lo que la migración agrega (antes: false; después: true) ───────────
SELECT 'agregado' AS tipo, nombre, existe
FROM (VALUES
  ('tabla accounts',                to_regclass('public.accounts') IS NOT NULL),
  ('tabla cash_closures',           to_regclass('public.cash_closures') IS NOT NULL),
  ('tabla tradein_values',          to_regclass('public.tradein_values') IS NOT NULL),
  ('columna card_plans.kind',            EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'card_plans' AND column_name = 'kind')),
  ('columna card_plans.account_id',      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'card_plans' AND column_name = 'account_id')),
  ('columna card_plans.settlement_days', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'card_plans' AND column_name = 'settlement_days')),
  ('columna settings.cierre_a_ciegas',   EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'settings' AND column_name = 'cierre_a_ciegas'))
) AS r(nombre, existe);

-- ── 3. Foto de los datos: filas por tabla (tiene que dar igual antes y después)
-- Cuenta exacta, tabla por tabla, de todo el esquema public.
SELECT 'filas' AS tipo, c.relname AS tabla,
       (xpath('/row/n/text()',
              query_to_xml(format('SELECT count(*) AS n FROM public.%I', c.relname), false, true, '')))[1]::text::bigint AS filas
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;

-- ── 4. Huella de los datos que la migración toca (tiene que dar igual) ─────
-- Las dos tablas que reciben columnas nuevas: un hash de sus columnas
-- originales. Si algo se modificara, el hash cambiaría.
SELECT 'huella' AS tipo, 'card_plans' AS tabla,
       md5(coalesce(string_agg(concat_ws('|', id, org_id, card_name, installments, surcharge_pct, paid_by, deposit_id, active), ',' ORDER BY id), '')) AS hash
FROM public.card_plans
UNION ALL
SELECT 'huella', 'settings',
       md5(coalesce(string_agg(concat_ws('|', id, org_id, shop_name, exchange_rate), ',' ORDER BY id), ''))
FROM public.settings;
