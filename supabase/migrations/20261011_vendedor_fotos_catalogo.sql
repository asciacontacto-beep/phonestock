-- ============================================================================
-- El vendedor también arma el catálogo: sube y saca fotos de los equipos.
--
-- En 20260928_permisos_por_rol.sql (punto 6) las fotos del catálogo
-- quedaron sólo para el dueño. Pero quien tiene el equipo en la mano y le
-- saca la foto suele ser el vendedor. Esto quita esas dos reglas extra.
--
-- Sigue igual:
--   * cada negocio sube y borra sólo en su carpeta (catalogo/<org_id>/...),
--     por las reglas de 20260921_catalogo_fotos.sql, que no se tocan;
--   * el depósito sigue aceptando sólo imágenes de hasta 1 MB;
--   * prender o apagar el catálogo y cambiar el link sigue siendo del dueño
--     (eso está en la tabla organizations, que esto no toca).
--
-- NO BORRA NI MODIFICA NINGÚN DATO NI NINGUNA FOTO. Sólo quita dos reglas
-- de permisos.
-- ============================================================================

DROP POLICY IF EXISTS "catalogo_fotos_solo_dueno_i" ON storage.objects;
DROP POLICY IF EXISTS "catalogo_fotos_solo_dueno_d" ON storage.objects;


-- ── Verificación: tiene que devolver 0 filas ────────────────────────────
SELECT policyname FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname IN ('catalogo_fotos_solo_dueno_i', 'catalogo_fotos_solo_dueno_d');


-- ── Para volver atrás, si hiciera falta ─────────────────────────────────
-- Volver a correr el punto 6 de 20260928_permisos_por_rol.sql.
