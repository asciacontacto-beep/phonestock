-- ============================================================================
-- Guardia de perfiles: nadie cambia su negocio ni se sube el rol.
--
-- Después de sacar las políticas `true` (20260921_perfiles_cerrar.sql) todavía
-- quedaba un camino: la política correcta de UPDATE deja que cada usuario
-- edite su PROPIO perfil —para que pueda cambiarse el nombre—, y eso alcanza
-- también al rol y al org_id. Un vendedor podía ponerse de dueño; cualquiera
-- podía moverse al negocio de otro y heredar su acceso, porque la
-- separación de todas las demás tablas se basa en ese org_id. Las políticas
-- no pueden limitar columnas, así que lo cierra un trigger.
--
-- Reglas, sólo para pedidos que vienen de la app (rol `authenticated`):
--   * org_id no cambia. Única excepción: un perfil recién creado sin negocio
--     que el dueño incorpora al suyo.
--   * el rol sólo lo cambia el dueño de ese negocio, y no el propio.
--   * al dar de alta un perfil con negocio, tiene que hacerlo el dueño de ese
--     negocio para otra persona, o ser el propio usuario re-guardando lo que
--     ya tiene (el registro lo hace después de create_new_tenant).
--
-- Quedan afuera las funciones con permisos propios (create_new_tenant corre
-- como su dueño) y la clave de servicio: `current_user` no es
-- `authenticated` en esos casos. Por eso la función NO es security definer:
-- con definer, current_user sería siempre el dueño de la función.
--
-- Verificado antes de escribirlo: en esta base no hay triggers en auth.users
-- ni en profiles, así que el alta de un usuario no crea el perfil sola.
--
-- NO BORRA NI MODIFICA NINGÚN DATO: sólo agrega una regla.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.proteger_perfil()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  yo_rol TEXT;
  yo_org UUID;
  org_destino UUID;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  SELECT role, org_id INTO yo_rol, yo_org FROM public.profiles WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    -- Sin negocio no da acceso a nada.
    IF NEW.org_id IS NULL THEN
      RETURN NEW;
    END IF;
    -- El dueño da de alta a un empleado de su negocio.
    IF yo_rol = 'owner' AND yo_org = NEW.org_id AND NEW.id <> auth.uid() THEN
      RETURN NEW;
    END IF;
    -- El propio usuario re-guarda lo que ya tiene (upsert tras registrarse).
    IF NEW.id = auth.uid() AND yo_org = NEW.org_id AND yo_rol IS NOT DISTINCT FROM NEW.role THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'No tenés permiso para dar de alta usuarios en ese negocio';
  END IF;

  -- UPDATE
  IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
    IF NOT (OLD.org_id IS NULL AND yo_rol = 'owner' AND yo_org = NEW.org_id AND NEW.id <> auth.uid()) THEN
      RAISE EXCEPTION 'No se puede cambiar el negocio de un usuario';
    END IF;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    org_destino := COALESCE(OLD.org_id, NEW.org_id);
    IF NOT (yo_rol = 'owner' AND yo_org = org_destino AND NEW.id <> auth.uid()) THEN
      RAISE EXCEPTION 'Sólo el dueño del negocio puede cambiar roles';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proteger_perfil ON public.profiles;
CREATE TRIGGER proteger_perfil
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.proteger_perfil();
