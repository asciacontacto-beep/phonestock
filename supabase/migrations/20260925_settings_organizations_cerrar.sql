-- ============================================================================
-- Cerrar `settings` y `organizations` a otros negocios.
--
-- Encontrado el 25/9/2026 porque un ticket salió impreso con el nombre, el
-- logo y los datos de OTRO local. Comprobado sin iniciar sesión, sólo con la
-- clave pública de la página:
--   * settings:      8 filas visibles  (nombre, teléfono, dirección, CUIT, logo)
--   * organizations: 31 filas visibles (todos los negocios)
-- Ventas, clientes y stock daban 0: esas tablas están bien.
--
-- Es el mismo problema que tenía `profiles` (20260921_perfiles_cerrar.sql):
-- las políticas permisivas se suman, y alcanza con una que diga `true` para
-- que cualquiera —con o sin cuenta— lea la tabla entera.
--
-- Qué hace:
--   1. Borra de estas dos tablas las políticas que dicen `true` (y avisa
--      cuáles borró, en la pestaña de mensajes).
--   2. Deja las que filtran por el negocio del que consulta.
--
-- Quién sigue funcionando igual:
--   * El catálogo público lee por vistas (catalogo_tienda / catalogo_equipos),
--     que no dependen de estas políticas.
--   * Superadmin, el alta de negocios y las pruebas usan funciones propias
--     (get_all_organizations, create_new_tenant, extend_trial…).
--   * Cada local sigue leyendo y guardando SU configuración y SU negocio.
--
-- NO BORRA NI MODIFICA NINGÚN DATO: sólo reglas de acceso.
-- ============================================================================

BEGIN;

-- ── 1. Sacar las políticas abiertas ─────────────────────────────────────
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('settings', 'organizations')
      AND (qual = 'true' OR with_check = 'true')
  LOOP
    RAISE NOTICE 'Se borra la política abierta "%" de %', pol.policyname, pol.tablename;
    EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ── 2. settings: cada local, sólo la suya ───────────────────────────────
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_del_local" ON public.settings;
CREATE POLICY "settings_del_local" ON public.settings
  FOR ALL TO authenticated
  USING (org_id = public.current_user_org_id())
  WITH CHECK (org_id = public.current_user_org_id());

-- ── 3. organizations: cada uno ve su negocio; sólo el dueño lo edita ────
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizacion_propia_ver" ON public.organizations;
CREATE POLICY "organizacion_propia_ver" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.current_user_org_id());

-- El dueño publica el catálogo (link y encendido) desde la app.
DROP POLICY IF EXISTS "organizacion_propia_editar" ON public.organizations;
CREATE POLICY "organizacion_propia_editar" ON public.organizations
  FOR UPDATE TO authenticated
  USING (
    id = public.current_user_org_id()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
  )
  WITH CHECK (id = public.current_user_org_id());

COMMIT;

-- ── Lo que quedó (para comprobar) ───────────────────────────────────────
SELECT tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('settings', 'organizations')
ORDER BY tablename, policyname;
