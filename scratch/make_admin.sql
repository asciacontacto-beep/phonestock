-- Hacer que clubverted@gmail.com sea Administrador (owner)

-- 1. Actualizar en la tabla de perfiles (que es la que usa la aplicación para mostrar los menús)
UPDATE public.profiles
SET role = 'owner'
WHERE email = 'clubverted@gmail.com';

-- 2. (Opcional) Actualizar también los metadatos internos de autenticación de Supabase
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', '"owner"')
WHERE email = 'clubverted@gmail.com';
