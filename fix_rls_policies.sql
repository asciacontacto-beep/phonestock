-- Eliminar las políticas conflictivas restantes
DROP POLICY IF EXISTS "deposits_org_isolation" ON public.deposits;

DROP POLICY IF EXISTS "Allow delete on suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow insert on suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow select on suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow update on suppliers" ON public.suppliers;

-- Verificar resultado final (debe quedar solo Tenant Isolation Policy en cada tabla)
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('stock', 'sales', 'deposits', 'expenses', 'customers', 'suppliers')
ORDER BY tablename, policyname;
