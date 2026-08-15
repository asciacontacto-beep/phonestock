-- Tracking de visitas al landing + métricas para el superadmin. Aditivo.
--
-- site_visits: una fila por visita al link público (landing). El insert lo hace
-- el navegador del visitante (rol anon), por eso se permite INSERT anónimo.
-- Nadie puede leer la tabla directamente; los totales se obtienen por la RPC
-- get_visit_stats(), restringida al superadmin.
--
-- Usa id UUID (gen_random_uuid) para no depender de una secuencia y evitar
-- tener que otorgar permisos sobre ella.

CREATE TABLE IF NOT EXISTS public.site_visits (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  path       text,
  referrer   text
);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Sólo se puede insertar (contar la visita). No SELECT/UPDATE/DELETE para nadie.
DROP POLICY IF EXISTS "anon puede registrar visita" ON public.site_visits;
CREATE POLICY "anon puede registrar visita" ON public.site_visits
  FOR INSERT TO anon, authenticated WITH CHECK (true);

GRANT INSERT ON public.site_visits TO anon, authenticated;

-- Métricas de visitas para el superadmin (bypassa RLS con SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.get_visit_stats()
RETURNS TABLE (total bigint, today bigint, last7 bigint, prev7 bigint, last30 bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(auth.jwt() ->> 'email', '') <> 'asciacontacto@gmail.com' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  RETURN QUERY
  SELECT
    count(*)::bigint,
    count(*) FILTER (WHERE created_at >= date_trunc('day', now()))::bigint,
    count(*) FILTER (WHERE created_at >= now() - interval '7 days')::bigint,
    count(*) FILTER (WHERE created_at >= now() - interval '14 days' AND created_at < now() - interval '7 days')::bigint,
    count(*) FILTER (WHERE created_at >= now() - interval '30 days')::bigint
  FROM public.site_visits;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_visit_stats() TO authenticated;
