-- ============================================================================
-- Cerrar la tabla de perfiles.
--
-- En producción convivían las políticas correctas (filtradas por negocio)
-- con varias que decían `true`. En Postgres las políticas permisivas se
-- suman: alcanza con que UNA diga que sí. Con eso, cualquier usuario
-- logueado —y cualquiera puede crearse una cuenta de prueba desde la
-- landing— podía:
--
--   * VER los perfiles de todos los negocios (nombre, email, rol, org_id).
--     Así aparecían empleadas de otro local en la lista de vendedores.
--   * MODIFICAR cualquier perfil, incluido el propio: ponerse rol de dueño
--     o cambiarse el org_id al de otro negocio. Toda la separación entre
--     negocios de las demás tablas se basa en ese org_id, así que eso daba
--     acceso completo al stock, ventas y clientes de cualquier local.
--   * BORRAR perfiles de cualquier negocio.
--
-- Este paso saca esas políticas y deja las que filtran por negocio.
-- NO BORRA NI MODIFICA NINGÚN DATO: sólo reglas de acceso.
--
-- Queda un segundo paso: hoy un usuario todavía puede editar su PROPIO
-- perfil (la política correcta lo permite, para que cambie su nombre), y
-- eso incluye su rol y su negocio. Se cierra con un trigger que necesita
-- conocer antes cómo se crean los usuarios en esta base.
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "Authenticated users can view profiles"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_select"                         ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update"                         ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete"                         ON public.profiles;
DROP POLICY IF EXISTS "profiles_org"                            ON public.profiles;

-- "profiles_org" (ALL, true) también habilitaba altas. Para que el dueño
-- pueda seguir creando empleados, se habilita explícito y sólo en SU negocio.
DROP POLICY IF EXISTS "Owners can insert profiles in their org" ON public.profiles;
CREATE POLICY "Owners can insert profiles in their org" ON public.profiles
  FOR INSERT WITH CHECK (
    org_id = public.current_user_org_id()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
  );

COMMIT;
