-- Tabla de turnos
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL DEFAULT public.current_user_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  customer_instagram TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  -- Teléfono a comprar (snapshot del stock al momento de crear el turno)
  phone_id BIGINT REFERENCES public.stock(id) ON DELETE SET NULL,
  phone_brand TEXT,
  phone_model TEXT,
  phone_storage TEXT,
  phone_color TEXT,
  phone_imei TEXT,
  phone_price NUMERIC,
  phone_currency TEXT DEFAULT 'ARS',
  -- Plan canje (opcional)
  trade_in_brand TEXT,
  trade_in_model TEXT,
  trade_in_storage TEXT,
  trade_in_color TEXT,
  trade_in_price NUMERIC,
  trade_in_currency TEXT DEFAULT 'ARS',
  -- Al confirmar la venta
  deposit_id INTEGER,
  seller_id UUID REFERENCES auth.users(id),
  sale_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.appointments
  USING (org_id = public.current_user_org_id());

GRANT ALL ON public.appointments TO authenticated;
