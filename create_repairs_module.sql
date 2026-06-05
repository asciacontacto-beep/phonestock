-- 1. Create Repairs table
CREATE TABLE IF NOT EXISTS public.repairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    org_id UUID NOT NULL DEFAULT public.current_user_org_id(),
    
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    
    device_brand TEXT NOT NULL,
    device_model TEXT NOT NULL,
    device_color TEXT,
    device_password TEXT,
    
    issue_description TEXT NOT NULL,
    visual_condition TEXT,
    
    status TEXT NOT NULL DEFAULT 'INGRESADO', -- INGRESADO, REVISION, REPUESTO, REPARADO, ENTREGADO, CANCELADO
    
    budget NUMERIC,
    deposit_paid NUMERIC DEFAULT 0,
    deposit_id INTEGER, -- Caja donde entró la seña
    
    assigned_technician TEXT,
    notes TEXT
);

-- 2. Enable RLS
ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;

-- 3. Create Policy
DROP POLICY IF EXISTS "Tenant Isolation Policy" ON public.repairs;
CREATE POLICY "Tenant Isolation Policy" ON public.repairs 
  FOR ALL USING (org_id = public.current_user_org_id()) 
  WITH CHECK (org_id = public.current_user_org_id());
