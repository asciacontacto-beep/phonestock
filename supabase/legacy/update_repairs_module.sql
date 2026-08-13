ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS cost NUMERIC;
