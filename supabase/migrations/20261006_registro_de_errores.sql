-- ============================================================================
-- Registro de errores de la app.
--
-- Cuando algo falla en el teléfono o la compu de un cliente (una pantalla
-- que no carga, un botón que no responde, el ingreso en un Safari viejo),
-- hoy no queda rastro: sólo nos enteramos si nos lo cuentan, y sin detalle.
-- La app manda cada error a /api/errores y se guarda acá, con la pantalla,
-- el navegador y el rol de quien lo vio. El superadmin lo lee en
-- Superadmin → Errores.
--
-- Escribe sólo el servidor (con la clave de servicio, desde /api/errores):
-- nadie puede leer ni escribir esta tabla desde el navegador.
--
-- NO BORRA NI MODIFICA NINGÚN DATO: agrega una tabla y una función.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_errors (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  org_id      UUID,
  user_id     UUID,
  role        TEXT,
  kind        TEXT NOT NULL DEFAULT 'error',   -- error | promesa | pantalla | consulta
  message     TEXT NOT NULL,
  stack       TEXT,
  path        TEXT,
  user_agent  TEXT,
  release     TEXT
);

CREATE INDEX IF NOT EXISTS app_errors_created_idx ON public.app_errors (created_at DESC);

-- Con RLS activo y sin políticas, desde el navegador no se puede leer ni
-- escribir: sólo el servidor con la clave de servicio.
ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;

-- Lectura para el superadmin, con el nombre del negocio.
CREATE OR REPLACE FUNCTION public.get_app_errors(p_dias INT DEFAULT 14)
RETURNS TABLE (
  id bigint,
  created_at timestamptz,
  org_id uuid,
  org_name text,
  role text,
  kind text,
  message text,
  stack text,
  path text,
  user_agent text,
  release text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Sin permisos' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT e.id, e.created_at, e.org_id, o.name, e.role, e.kind, e.message, e.stack, e.path, e.user_agent, e.release
  FROM public.app_errors e
  LEFT JOIN public.organizations o ON o.id = e.org_id
  WHERE e.created_at >= NOW() - make_interval(days => GREATEST(1, LEAST(COALESCE(p_dias, 14), 90)))
  ORDER BY e.created_at DESC
  LIMIT 1000;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_app_errors(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_app_errors(INT) TO authenticated;

COMMIT;
