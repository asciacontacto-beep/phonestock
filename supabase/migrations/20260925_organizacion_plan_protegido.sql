-- ============================================================================
-- El plan de un negocio no lo cambia el propio negocio.
--
-- Después de 20260925_settings_organizations_cerrar.sql, el dueño todavía
-- puede editar la fila de SU negocio (lo necesita para publicar el
-- catálogo). Y esa fila tiene también el plan: vencimiento de la prueba,
-- pago, licencia de por vida. La app no lo ofrece, pero cualquiera con un
-- poco de conocimiento podía marcarse la licencia sin pagar desde la
-- consola del navegador.
--
-- Las políticas no pueden limitar columnas, así que lo cierra un trigger:
-- desde la app sólo se puede cambiar lo que la app de verdad edita (el
-- catálogo). Es una lista BLANCA: cualquier columna que se agregue mañana
-- —un campo de facturación nuevo— queda protegida sin tener que acordarse.
--
-- Quedan afuera, como en proteger_perfil():
--   * las funciones con permisos propios (extend_trial, set_trial_expiration,
--     create_new_tenant…) y la clave de servicio: `current_user` no es
--     `authenticated` en esos casos;
--   * la cuenta de superadmin, la misma que reconoce la app, para que el
--     panel de negocios funcione aunque alguna de sus funciones corra con
--     los permisos del que la llama.
--
-- NO BORRA NI MODIFICA NINGÚN DATO: agrega una regla y un permiso.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.proteger_organizacion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  -- Lo único que un negocio puede cambiar de sí mismo desde la app.
  editables TEXT[] := ARRAY['catalog_slug', 'catalog_enabled', 'updated_at'];
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF coalesce(auth.jwt() ->> 'email', '') = 'asciacontacto@gmail.com' THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - editables) IS DISTINCT FROM (to_jsonb(OLD) - editables) THEN
    RAISE EXCEPTION 'El plan y los datos del negocio los gestiona Stackr. Desde acá sólo se puede cambiar el catálogo.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proteger_organizacion ON public.organizations;
CREATE TRIGGER proteger_organizacion
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.proteger_organizacion();

-- El panel de superadmin sigue viendo y gestionando todos los negocios aunque
-- alguna de sus funciones no tenga permisos propios.
DROP POLICY IF EXISTS "superadmin_gestiona_negocios" ON public.organizations;
CREATE POLICY "superadmin_gestiona_negocios" ON public.organizations
  FOR ALL TO authenticated
  USING (coalesce(auth.jwt() ->> 'email', '') = 'asciacontacto@gmail.com')
  WITH CHECK (coalesce(auth.jwt() ->> 'email', '') = 'asciacontacto@gmail.com');

COMMIT;

-- ── Para comprobar ──────────────────────────────────────────────────────
-- `definer = true` significa que la función corre con permisos propios.
SELECT p.proname AS funcion, p.prosecdef AS definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('activate_organization', 'delete_organization', 'extend_trial',
                    'set_trial_expiration', 'create_new_tenant', 'set_referral',
                    'get_all_organizations')
ORDER BY 1;
