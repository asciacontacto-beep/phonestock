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
-- NO BORRA NI MODIFICA NINGUNA FILA. Crea un índice y borra otro: un
-- DROP INDEX elimina la estructura de búsqueda, nunca los equipos.
-- ============================================================================


-- ── LO QUE HABÍA ANTES ──────────────────────────────────────────────────
-- Existía este índice, creado a mano y nunca versionado:
--
--     CREATE UNIQUE INDEX stock_imei_key ON public.stock USING btree (imei)
--
-- Global sobre `imei` solo, sin organización y sin filtro de estado. Eso
-- provocaba dos cosas malas:
--
--   * Un IMEI usado por un negocio quedaba bloqueado para TODOS los demás.
--     Si un local vende un equipo y otro lo compra, el segundo no podía
--     cargarlo — y el error le confirmaba que ese IMEI existe en otra
--     organización.
--
--   * Como vender no borra la fila sino que la marca vendida, el IMEI
--     quedaba tomado para siempre: un equipo que volvía en canje no se
--     podía reingresar nunca.
--
-- Se reemplaza por el índice parcial de abajo. Se crea el nuevo primero y
-- recién después se borra el viejo, para no dejar ni un instante sin regla.


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


-- ── PASO 3: la regla nueva ──────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS stock_imei_disponible_unico
  ON public.stock (org_id, imei)
  WHERE imei IS NOT NULL AND imei <> '' AND status = 'available';


-- ── PASO 4: sacar la regla vieja ────────────────────────────────────────
-- Ojo: `stock_imei_key` no es un índice suelto sino una restricción UNIQUE
-- de la tabla; el índice es cómo Postgres la implementa. Por eso hay que
-- soltar la restricción y no el índice:
--
--     DROP INDEX public.stock_imei_key;
--     -> ERROR 2BP01: cannot drop index ... because constraint ... requires it
--
-- Soltar una restricción elimina una regla, nunca filas. Ningún equipo se
-- pierde. Es lo que habilita reingresar un equipo vendido y que dos locales
-- distintos puedan haber tenido el mismo teléfono.

ALTER TABLE public.stock DROP CONSTRAINT IF EXISTS stock_imei_key;


-- Para volver atrás, si hiciera falta:
--     ALTER TABLE public.stock ADD CONSTRAINT stock_imei_key UNIQUE (imei);
