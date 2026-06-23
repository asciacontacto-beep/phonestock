-- Tabla de repuestos
CREATE TABLE IF NOT EXISTS public.spare_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ARS',
  stock INTEGER NOT NULL DEFAULT 0,
  deposit_id UUID REFERENCES public.deposits(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.spare_parts
  USING (org_id = public.current_user_org_id());
GRANT ALL ON public.spare_parts TO authenticated;

-- Tabla de repuestos usados por reparación
CREATE TABLE IF NOT EXISTS public.repair_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  repair_id UUID NOT NULL REFERENCES public.repairs(id) ON DELETE CASCADE,
  spare_part_id UUID NOT NULL REFERENCES public.spare_parts(id),
  spare_part_name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  cost_price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS'
);
ALTER TABLE public.repair_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.repair_parts
  USING (org_id = public.current_user_org_id());
GRANT ALL ON public.repair_parts TO authenticated;

-- Agregar mano de obra a reparaciones
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS labor_cost NUMERIC DEFAULT 0;

-- RPCs de stock
CREATE OR REPLACE FUNCTION public.decrement_spare_part_stock(part_id UUID, qty INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.spare_parts SET stock = stock - qty
  WHERE id = part_id AND org_id = public.current_user_org_id();
END;
$$;
GRANT EXECUTE ON FUNCTION public.decrement_spare_part_stock(UUID, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.increment_spare_part_stock(part_id UUID, qty INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.spare_parts SET stock = stock + qty
  WHERE id = part_id AND org_id = public.current_user_org_id();
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_spare_part_stock(UUID, INTEGER) TO authenticated;
