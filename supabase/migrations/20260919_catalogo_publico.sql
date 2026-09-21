-- ============================================================================
-- Catálogo público: la vidriera de cada local.
--
-- Cada tienda tiene un link propio (/c/su-nombre) que puede poner en la bio
-- de Instagram, y elige equipo por equipo cuál se publica. El que entra no
-- tiene cuenta ni sabe que existe Stackr.
--
-- ESTO ABRE DATOS A INTERNET. Leer la sección de seguridad antes de correr.
--
-- NO BORRA NI MODIFICA NINGÚN DATO. Agrega tres columnas que arrancan
-- apagadas y dos vistas de sólo lectura. Con `catalog_enabled` en false
-- —que es el valor por defecto— no se publica absolutamente nada.
-- ============================================================================


-- ── PASO 1: las columnas ────────────────────────────────────────────────

-- El link del local. Único en todo el sistema: dos tiendas no pueden tener
-- el mismo. Arranca en null; hasta que el local elija uno, no hay catálogo.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS catalog_slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_catalog_slug_key
  ON public.organizations (catalog_slug) WHERE catalog_slug IS NOT NULL;

-- El interruptor. Apagado por defecto: nadie publica nada sin decidirlo.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS catalog_enabled BOOLEAN NOT NULL DEFAULT false;

-- Equipo por equipo. Apagado por defecto: no se publica el inventario
-- entero por el solo hecho de prender el catálogo.
ALTER TABLE public.stock
  ADD COLUMN IF NOT EXISTS in_catalog BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS stock_in_catalog_idx
  ON public.stock (org_id) WHERE in_catalog = true;


-- ── SEGURIDAD ───────────────────────────────────────────────────────────
-- Una vista en Postgres corre con los permisos de su DUEÑO, no con los del
-- que consulta. Eso significa que estas vistas SE SALTEAN el RLS de `stock`
-- y `settings`: es lo que las hace servir para una página pública, y es
-- exactamente por lo que hay que mirarlas con lupa.
--
-- Las dos reglas que las hacen seguras:
--
--   1. Las columnas están enumeradas una por una. No hay `SELECT *`. El
--      costo, el proveedor, las notas internas y sobre todo el IMEI no
--      aparecen. El IMEI identifica al aparato físico: publicarlo permite
--      bloquearlo o clonarlo, y es el dato más peligroso de la tabla.
--      Enumerar en vez de excluir importa: la próxima columna que alguien
--      le agregue a `stock` NO se publica sola.
--
--   2. El WHERE exige las tres condiciones a la vez: el local prendió el
--      catálogo, eligió ese equipo, y el equipo sigue disponible. Un equipo
--      vendido desaparece de la vidriera solo.
--
-- Se otorga SELECT a `anon`. Es deliberado: sin eso no hay página pública.

DROP VIEW IF EXISTS public.catalogo_equipos;
DROP VIEW IF EXISTS public.catalogo_tienda;


-- Los datos del local que el comprador necesita para contactarlo.
CREATE VIEW public.catalogo_tienda AS
SELECT
  o.catalog_slug            AS slug,
  COALESCE(s.shop_name, o.name) AS nombre,
  s.phone                   AS telefono,
  s.instagram               AS instagram,
  s.address                 AS direccion
FROM public.organizations o
LEFT JOIN public.settings s ON s.org_id = o.id
WHERE o.catalog_enabled = true
  AND o.catalog_slug IS NOT NULL;


-- Los equipos publicados. Columnas enumeradas: ver la nota de seguridad.
CREATE VIEW public.catalogo_equipos AS
SELECT
  o.catalog_slug AS slug,
  st.id,
  st.brand,
  st.model,
  st.storage,
  st.color,
  st.condition,
  st.battery,
  st.price,
  st.currency,
  st.created_at
FROM public.stock st
JOIN public.organizations o ON o.id = st.org_id
WHERE o.catalog_enabled = true
  AND o.catalog_slug IS NOT NULL
  AND st.in_catalog = true
  AND st.status = 'available'
  AND st.price IS NOT NULL
  AND st.price > 0;


GRANT SELECT ON public.catalogo_tienda  TO anon, authenticated;
GRANT SELECT ON public.catalogo_equipos TO anon, authenticated;


-- ── Para volver atrás, si hiciera falta ─────────────────────────────────
-- Apagar el catálogo de todos los locales, sin borrar nada:
--     UPDATE public.organizations SET catalog_enabled = false;
--
-- Sacarlo del todo:
--     DROP VIEW public.catalogo_equipos;
--     DROP VIEW public.catalogo_tienda;
--     ALTER TABLE public.stock DROP COLUMN in_catalog;
--     ALTER TABLE public.organizations DROP COLUMN catalog_slug;
--     ALTER TABLE public.organizations DROP COLUMN catalog_enabled;
