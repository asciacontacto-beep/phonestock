-- 1. Create Accessories table
CREATE TABLE IF NOT EXISTS public.accessories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    org_id UUID NOT NULL DEFAULT public.current_user_org_id(),
    deposit_id UUID REFERENCES public.deposits(id),
    category TEXT NOT NULL, -- e.g. "Funda", "Vidrio Templado", "Cargador", "Auricular Generico"
    compatible_model TEXT, -- e.g. "iPhone 15 Pro Max"
    color TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    cost_price NUMERIC,
    sale_price NUMERIC
);

-- 2. Add accessories column to sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS accessories JSONB;

-- 3. Enable RLS for Accessories
ALTER TABLE public.accessories ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies for Accessories
DROP POLICY IF EXISTS "Tenant Isolation Policy" ON public.accessories;
CREATE POLICY "Tenant Isolation Policy" ON public.accessories 
  FOR ALL USING (org_id = public.current_user_org_id()) 
  WITH CHECK (org_id = public.current_user_org_id());
