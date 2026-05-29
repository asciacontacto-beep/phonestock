-- Tabla de organizaciones (si no existe)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RPC: crea una nueva organización y devuelve el org_id
-- Se llama desde el frontend durante el registro
CREATE OR REPLACE FUNCTION public.create_new_tenant(org_name TEXT, user_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Crear la organización
  INSERT INTO public.organizations (name)
  VALUES (org_name)
  RETURNING id INTO new_org_id;

  -- Actualizar el perfil del usuario autenticado con el org_id y rol owner
  INSERT INTO public.profiles (id, name, email, role, org_id, initials, color)
  VALUES (
    auth.uid(),
    user_name,
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    'owner',
    new_org_id,
    UPPER(LEFT(user_name, 2)),
    '#f59e0b'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = 'owner',
    org_id = new_org_id,
    initials = EXCLUDED.initials,
    color = EXCLUDED.color;

  RETURN new_org_id;
END;
$$;

-- Dar permiso a usuarios autenticados para ejecutar el RPC
GRANT EXECUTE ON FUNCTION public.create_new_tenant(TEXT, TEXT) TO authenticated;

-- Agregar política para que un usuario pueda insertar su propio perfil
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());
