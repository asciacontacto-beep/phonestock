-- 1. Ver el perfil de pedro nielsen y su org_id
SELECT id, name, email, role, org_id FROM public.profiles;

-- 2. Ver si la columna org_id existe en la tabla stock
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'stock' AND column_name = 'org_id';

-- 3. Ver las políticas RLS activas en stock
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('stock', 'sales', 'deposits', 'expenses');

-- 4. Ver los org_id distintos que tienen los registros de stock
SELECT DISTINCT org_id FROM public.stock LIMIT 10;
