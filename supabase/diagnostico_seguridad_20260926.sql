-- ============================================================================
-- Diagnóstico de seguridad — SÓLO LECTURA. No cambia nada.
-- Muestra lo que el repositorio no puede ver de la base en producción.
-- ============================================================================

-- 1) Funciones sensibles: ¿controlan que sea el superadmin?
SELECT 'funcion' AS tipo,
       p.proname AS nombre,
       CASE WHEN p.prosrc ILIKE '%is_superadmin%' OR p.prosrc ILIKE '%asciacontacto%'
            THEN 'controla superadmin' ELSE '⚠ NO controla superadmin' END
         || ' · definer=' || p.prosecdef
         || ' · anon puede ejecutar=' || has_function_privilege('anon', p.oid, 'EXECUTE') AS detalle
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('activate_organization', 'delete_organization', 'get_all_organizations')

UNION ALL
-- 2) Triggers que protegen perfiles y organizaciones: ¿están instalados?
SELECT 'trigger', t.tgname, 'en ' || c.relname
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
WHERE NOT t.tgisinternal AND c.relname IN ('profiles', 'organizations')

UNION ALL
-- 3) Tablas sin RLS activado.
SELECT 'tabla sin RLS', c.relname, '⚠ RLS desactivado'
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity

UNION ALL
-- 4) Políticas que no filtran por negocio ni por superadmin: posibles fugas.
SELECT 'politica sospechosa', tablename || ' · ' || policyname,
       cmd || ' · USING: ' || coalesce(qual, '-') || ' · CHECK: ' || coalesce(with_check, '-')
FROM pg_policies
WHERE schemaname = 'public'
  AND coalesce(qual, '') NOT ILIKE '%org_id%'
  AND coalesce(qual, '') NOT ILIKE '%current_user_org_id%'
  AND coalesce(qual, '') NOT ILIKE '%is_superadmin%'
  AND coalesce(qual, '') NOT ILIKE '%auth.uid()%'
  AND coalesce(with_check, '') NOT ILIKE '%org_id%'
  AND coalesce(with_check, '') NOT ILIKE '%is_superadmin%'
  AND coalesce(with_check, '') NOT ILIKE '%auth.uid()%'

ORDER BY 1, 2;
