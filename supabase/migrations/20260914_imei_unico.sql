-- ============================================================================
-- Un mismo IMEI no puede estar dos veces en el stock disponible.
--
-- El IMEI identifica al aparato físico. Dos filas disponibles con el mismo
-- IMEI son el mismo teléfono contado dos veces: infla el inventario, infla
-- el capital inmovilizado y ensucia la rentabilidad cuando se vende "uno"
-- de los dos.
--
-- Por qué el índice es PARCIAL y no una restricción común:
--
--   * `status = 'available'` — vender no borra la fila, la marca como
--     vendida. Si el índice cubriera todas las filas, un equipo que
--     vendiste y después recibís en canje no se podría volver a cargar.
--     Reingresar un equipo TIENE que funcionar.
--
--   * `imei <> ''` y `IS NOT NULL` — los accesorios y las cargas por
--     cantidad no llevan IMEI. Sin esto, dos equipos sin IMEI chocarían
--     entre sí (en Postgres los NULL no chocan, pero las cadenas vacías sí).
--
--   * `org_id` primero — cada negocio tiene su inventario. Un teléfono que
--     un local vendió puede terminar comprado por otro local.
--
-- NO BORRA NI MODIFICA NINGÚN DATO. Sólo crea un índice.
-- ============================================================================


-- ── PASO 1: ¿ya existe algo parecido? ───────────────────────────────────
-- Corré esto solo para mirar. Si ya hay un índice único sobre imei, el
-- PASO 3 no hace nada (es IF NOT EXISTS) y no molesta.

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'stock' AND indexdef ILIKE '%imei%';


-- ── PASO 2: ¿hay duplicados hoy? ────────────────────────────────────────
-- Si esto devuelve filas, el PASO 3 va a fallar a propósito: no vamos a
-- adivinar cuál de los dos equipos es el bueno. Revisá el resultado,
-- corregí a mano en Inventario los que sobren y recién después seguí.

SELECT
  imei,
  count(*)               AS veces,
  array_agg(id)          AS ids,
  array_agg(brand || ' ' || model) AS equipos
FROM public.stock
WHERE imei IS NOT NULL
  AND imei <> ''
  AND status = 'available'
GROUP BY org_id, imei
HAVING count(*) > 1;


-- ── PASO 3: la regla ────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS stock_imei_disponible_unico
  ON public.stock (org_id, imei)
  WHERE imei IS NOT NULL AND imei <> '' AND status = 'available';
