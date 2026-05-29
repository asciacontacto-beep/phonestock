-- 1. Helper function to get current user's org_id
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Add org_id to tables (if not exists)
DO $$
DECLARE
    main_org_id UUID;
    t text;
    tables text[] := ARRAY['stock', 'sales', 'deposits', 'expenses', 'customers', 'suppliers'];
BEGIN
    -- Get the main org_id from one of the two known main accounts first,
    -- then fall back to any owner with an org_id
    SELECT org_id INTO main_org_id FROM public.profiles 
      WHERE id IN ('78c6b1e4-562e-4be0-b7e4-25c730e72af6', '83e28f5a-2541-4244-a15e-3f3591829b7f')
      AND org_id IS NOT NULL LIMIT 1;
    
    -- If neither main account has an org_id yet, grab any owner's org_id
    IF main_org_id IS NULL THEN
        SELECT org_id INTO main_org_id FROM public.profiles WHERE role = 'owner' AND org_id IS NOT NULL LIMIT 1;
    END IF;

    -- Make sure both main accounts share the same organization so they both have access
    IF main_org_id IS NOT NULL THEN
        UPDATE public.profiles 
        SET org_id = main_org_id 
        WHERE id IN (
            '78c6b1e4-562e-4be0-b7e4-25c730e72af6', -- gvallina85@gmail.com
            '83e28f5a-2541-4244-a15e-3f3591829b7f'  -- juanpenielsen1904@gmail.com
        );
    END IF;

    FOREACH t IN ARRAY tables LOOP
        -- Check if org_id column exists, if not add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'org_id') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN org_id UUID', t);
            
            -- Assign existing data to the main account
            IF main_org_id IS NOT NULL THEN
                EXECUTE format('UPDATE public.%I SET org_id = %L WHERE org_id IS NULL', t, main_org_id);
            END IF;
            
            -- Make it NOT NULL and set default
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN org_id SET NOT NULL', t);
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN org_id SET DEFAULT public.current_user_org_id()', t);
        END IF;
    END LOOP;
END
$$;

-- 3. Enable RLS and create Policies for each table
DO $$
DECLARE
    t text;
    tables text[] := ARRAY['stock', 'sales', 'deposits', 'expenses', 'customers', 'suppliers'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        
        -- Drop old permissive policies if they exist (ignoring errors if they don't)
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS "All authenticated users can manage %I" ON public.%I', t, t);
        EXCEPTION WHEN undefined_object THEN
            -- ignore
        END;
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS "Todos los usuarios autenticados pueden manejar %I" ON public.%I', t, t);
        EXCEPTION WHEN undefined_object THEN
            -- ignore
        END;
        
        -- Create new tenant isolation policy
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Policy" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Tenant Isolation Policy" ON public.%I FOR ALL USING (org_id = public.current_user_org_id()) WITH CHECK (org_id = public.current_user_org_id())', t, t);
    END LOOP;
END
$$;

-- Ensure profiles has RLS correctly setup as well
-- Profiles should be viewable by users in the same organization
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can see profiles in their org" ON public.profiles;
CREATE POLICY "Users can see profiles in their org" ON public.profiles 
  FOR SELECT USING (org_id = public.current_user_org_id() OR id = auth.uid());

-- Allow inserting profile for self
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles 
  FOR INSERT WITH CHECK (id = auth.uid());

-- Allow updating profile for self or admins in the same org
DROP POLICY IF EXISTS "Users can update profiles in their org" ON public.profiles;
CREATE POLICY "Users can update profiles in their org" ON public.profiles 
  FOR UPDATE USING (id = auth.uid() OR (org_id = public.current_user_org_id() AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'));

-- Allow deleting profiles in the same org (for owners)
DROP POLICY IF EXISTS "Owners can delete profiles" ON public.profiles;
CREATE POLICY "Owners can delete profiles" ON public.profiles 
  FOR DELETE USING (org_id = public.current_user_org_id() AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner');

-- Ensure settings table has RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant Isolation Policy" ON public.settings;
CREATE POLICY "Tenant Isolation Policy" ON public.settings FOR ALL USING (org_id = public.current_user_org_id()) WITH CHECK (org_id = public.current_user_org_id());

