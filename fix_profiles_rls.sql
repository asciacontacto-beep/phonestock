-- Script para corregir el aislamiento de inquilinos (tenant isolation) en la tabla profiles
-- Elimina políticas permisivas antiguas que podrían estar filtrando usuarios de otros tenants.

BEGIN;

-- 1. Asegurar que RLS esté activado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar todas las políticas existentes en profiles para limpiar el estado
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can see profiles in their org" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles in their org" ON public.profiles;
DROP POLICY IF EXISTS "Owners can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Todos pueden ver perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Todos los usuarios autenticados pueden ver perfiles" ON public.profiles;
DROP POLICY IF EXISTS "All authenticated users can view profiles" ON public.profiles;

-- 3. Crear las políticas correctas basadas en org_id
-- Lectura: Solo pueden ver perfiles de su misma organización (o su propio perfil en caso de que acaben de registrarse y no tengan org_id aún)
CREATE POLICY "Users can see profiles in their org" ON public.profiles 
  FOR SELECT USING (org_id = public.current_user_org_id() OR id = auth.uid());

-- Inserción: Solo pueden insertar su propio perfil (generalmente manejado por un trigger de auth, pero por si acaso)
CREATE POLICY "Users can insert their own profile" ON public.profiles 
  FOR INSERT WITH CHECK (id = auth.uid());

-- Actualización: Pueden actualizar su propio perfil, o si son administradores (owner) pueden actualizar perfiles de su organización
CREATE POLICY "Users can update profiles in their org" ON public.profiles 
  FOR UPDATE USING (id = auth.uid() OR (org_id = public.current_user_org_id() AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'));

-- Eliminación: Solo los administradores (owner) pueden eliminar perfiles dentro de su misma organización
CREATE POLICY "Owners can delete profiles" ON public.profiles 
  FOR DELETE USING (org_id = public.current_user_org_id() AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner');

COMMIT;
