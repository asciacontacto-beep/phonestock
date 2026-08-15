-- Script para agregar deposit_id a las ventas para poder asignar el dinero correctamente a la caja del depósito del teléfono
BEGIN;

-- Agregamos la columna deposit_id
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS deposit_id UUID REFERENCES public.deposits(id) ON DELETE SET NULL;

COMMIT;
