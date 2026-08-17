-- ============================================================================
-- Actividad real de cada negocio, para el panel de superadmin.
--
-- Hasta ahora el panel sabía cuántos usuarios tenía cada org, pero no si la
-- estaban usando: un local que factura todos los días y otro que se registró
-- y nunca volvió se veían igual. Sin eso no se puede anticipar quién no va a
-- renovar ni saber a quién conviene acompañar.
--
-- Correr una sola vez en el SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_org_activity()
RETURNS TABLE (
  org_id          UUID,
  sales_total     BIGINT,
  sales_30d       BIGINT,
  sales_7d        BIGINT,
  last_sale_at    TIMESTAMPTZ,
  stock_total     BIGINT,
  stock_available BIGINT,
  repairs_total   BIGINT,
  last_activity   TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Sólo el superadmin ve datos de todas las organizaciones. Para cualquier
  -- otro usuario la función no devuelve ninguna fila.
  WITH permiso AS (
    SELECT (SELECT email FROM auth.users WHERE id = auth.uid()) = 'asciacontacto@gmail.com' AS ok
  ),
  ventas AS (
    SELECT s.org_id,
           COUNT(*)                                                            AS total,
           COUNT(*) FILTER (WHERE s.created_at >= NOW() - INTERVAL '30 days')  AS d30,
           COUNT(*) FILTER (WHERE s.created_at >= NOW() - INTERVAL '7 days')   AS d7,
           MAX(s.created_at)                                                   AS ultima
    FROM public.sales s
    WHERE s.brand IS DISTINCT FROM 'MOVIMIENTO'
    GROUP BY s.org_id
  ),
  equipos AS (
    SELECT st.org_id,
           COUNT(*)                                            AS total,
           COUNT(*) FILTER (WHERE st.status = 'available')      AS disponibles,
           MAX(st.created_at)                                   AS ultimo
    FROM public.stock st
    GROUP BY st.org_id
  ),
  arreglos AS (
    SELECT r.org_id, COUNT(*) AS total, MAX(r.created_at) AS ultimo
    FROM public.repairs r
    GROUP BY r.org_id
  )
  SELECT
    o.id,
    COALESCE(v.total, 0)::bigint,
    COALESCE(v.d30, 0)::bigint,
    COALESCE(v.d7, 0)::bigint,
    v.ultima,
    COALESCE(e.total, 0)::bigint,
    COALESCE(e.disponibles, 0)::bigint,
    COALESCE(a.total, 0)::bigint,
    -- Lo último que hicieron en cualquier parte del sistema: sirve para
    -- distinguir "no vendió" de "no entró nunca más".
    GREATEST(COALESCE(v.ultima, o.created_at),
             COALESCE(e.ultimo, o.created_at),
             COALESCE(a.ultimo, o.created_at))
  FROM public.organizations o
  CROSS JOIN permiso p
  LEFT JOIN ventas   v ON v.org_id = o.id
  LEFT JOIN equipos  e ON e.org_id = o.id
  LEFT JOIN arreglos a ON a.org_id = o.id
  WHERE p.ok;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_activity() TO authenticated;

-- Estos índices son los que hacen que el agregado no recorra las tablas enteras
CREATE INDEX IF NOT EXISTS sales_org_created_idx   ON public.sales   (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_org_created_idx   ON public.stock   (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS repairs_org_created_idx ON public.repairs (org_id, created_at DESC);
