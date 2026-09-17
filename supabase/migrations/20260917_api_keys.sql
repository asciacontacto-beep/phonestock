-- ============================================================================
-- Claves de API por negocio.
--
-- La API pública (/api/v1) no tiene un usuario logueado, y todo el
-- aislamiento entre negocios de Stackr depende de uno: las políticas RLS
-- comparan `org_id` con `current_user_org_id()`, las columnas `org_id` se
-- completan solas con ese valor, y algunos triggers PISAN el org_id con el
-- del usuario (ver fill_mayoristas_org_id). Con la clave de servicio,
-- `auth.uid()` es nulo: los inserts quedarían sin negocio y cada lectura
-- dependería de no olvidarse jamás un filtro por organización.
--
-- Por eso cada clave pertenece a un usuario DUEÑO del negocio, y la API
-- actúa como ese usuario: en cada pedido firma un token de 60 segundos a su
-- nombre. La base aplica RLS, defaults y triggers exactamente igual que en
-- la app. La separación entre negocios la sigue haciendo Postgres.
--
-- La clave nunca se guarda: sólo su hash SHA-256 y un prefijo para
-- reconocerla en la lista. Se muestra completa una única vez, al crearla.
--
-- NO BORRA NI MODIFICA DATOS EXISTENTES. Sólo crea una tabla.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL DEFAULT public.current_user_org_id()
                REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- La API actúa como este usuario. Si se elimina, la clave deja de andar.
  user_id       UUID NOT NULL DEFAULT auth.uid()
                REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  key_prefix    TEXT NOT NULL,
  key_hash      TEXT NOT NULL UNIQUE,
  scopes        TEXT[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS api_keys_org_idx ON public.api_keys (org_id, created_at DESC);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Sólo los dueños ven y administran las claves de su negocio. Un vendedor
-- con una clave podría leer costos y márgenes que en la app no ve.
DROP POLICY IF EXISTS "duenos administran claves" ON public.api_keys;
CREATE POLICY "duenos administran claves" ON public.api_keys
  FOR ALL
  USING (
    org_id = public.current_user_org_id()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
  )
  WITH CHECK (
    org_id = public.current_user_org_id()
    AND user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
  );

GRANT SELECT, INSERT, UPDATE ON public.api_keys TO authenticated;
