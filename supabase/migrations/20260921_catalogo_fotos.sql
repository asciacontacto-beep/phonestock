-- ============================================================================
-- Fotos de los equipos del catálogo.
--
-- Las fotos NO van a la base de datos: van a Supabase Storage, que es un
-- depósito de archivos aparte. En la tabla `stock` sólo se guarda el nombre
-- de cada archivo (unas decenas de letras), así que la base no crece por
-- las fotos.
--
-- Cada foto se sube dos veces, ya comprimida en el teléfono del local:
--   * la grande, 1600 px de lado máximo, WebP ~150-300 KB
--   * la miniatura, 480 px, ~20-40 KB, que es la que carga la vidriera
-- El depósito rechaza cualquier archivo de más de 1 MB o que no sea imagen,
-- aunque alguien se saltee la app.
--
-- NO BORRA NI MODIFICA NINGÚN DATO. Agrega una columna vacía, un depósito
-- de archivos y sus permisos, y vuelve a crear la vista pública con una
-- columna más.
-- ============================================================================


-- ── PASO 1: la columna ──────────────────────────────────────────────────
-- Rutas dentro del depósito, en orden: la primera es la portada.
ALTER TABLE public.stock
  ADD COLUMN IF NOT EXISTS photos TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.stock DROP CONSTRAINT IF EXISTS stock_photos_max;
ALTER TABLE public.stock
  ADD CONSTRAINT stock_photos_max CHECK (cardinality(photos) <= 4);


-- ── PASO 2: el depósito ─────────────────────────────────────────────────
-- Público para leer: la vidriera la abre gente sin cuenta. Los nombres de
-- archivo son aleatorios, así que no se pueden adivinar ni recorrer.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('catalogo', 'catalogo', true, 1048576, ARRAY['image/webp', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ── PASO 3: quién sube y quién borra ────────────────────────────────────
-- Cada negocio escribe sólo en su carpeta: catalogo/<org_id>/...
-- Un local no puede subir ni borrar fotos de otro.
DROP POLICY IF EXISTS "catalogo_fotos_ver"    ON storage.objects;
DROP POLICY IF EXISTS "catalogo_fotos_subir"  ON storage.objects;
DROP POLICY IF EXISTS "catalogo_fotos_borrar" ON storage.objects;

-- Borrar exige además poder "ver" el archivo. Se limita a la carpeta propia:
-- listar las carpetas de otros locales no se puede.
CREATE POLICY "catalogo_fotos_ver" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'catalogo'
         AND (storage.foldername(name))[1] = public.current_user_org_id()::text);

CREATE POLICY "catalogo_fotos_subir" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'catalogo'
              AND (storage.foldername(name))[1] = public.current_user_org_id()::text);

CREATE POLICY "catalogo_fotos_borrar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'catalogo'
         AND (storage.foldername(name))[1] = public.current_user_org_id()::text);


-- ── PASO 4: la vista pública, con las fotos ─────────────────────────────
-- Misma vista que 20260919_catalogo_publico.sql con `fotos` agregada al
-- final (CREATE OR REPLACE sólo permite sumar columnas al final). Siguen
-- sin salir el costo, el proveedor, las notas ni el IMEI.
CREATE OR REPLACE VIEW public.catalogo_equipos AS
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
  st.created_at,
  st.photos AS fotos
FROM public.stock st
JOIN public.organizations o ON o.id = st.org_id
WHERE o.catalog_enabled = true
  AND o.catalog_slug IS NOT NULL
  AND st.in_catalog = true
  AND st.status = 'available'
  AND st.price IS NOT NULL
  AND st.price > 0;

GRANT SELECT ON public.catalogo_equipos TO anon, authenticated;


-- ── Para volver atrás, si hiciera falta ─────────────────────────────────
-- Esconder las fotos de la vidriera sin borrar nada:
--     UPDATE storage.buckets SET public = false WHERE id = 'catalogo';
