-- Script para restaurar el stock y eliminar ventas de usuarios sin caja (dinero sin depósito)
-- Ejecutar en Supabase SQL Editor

BEGIN;

-- 1. Restaurar el estado de los teléfonos a "available" (En Stock)
UPDATE public.stock
SET status = 'available'
WHERE imei IN (
  SELECT imei FROM public.sales
  WHERE brand != 'MOVIMIENTO' 
    AND (seller_id IS NULL OR seller_id NOT IN (
      SELECT id FROM public.profiles WHERE array_length(deposit_ids, 1) > 0
  ))
);

-- 2. Eliminar definitivamente esas ventas
DELETE FROM public.sales
WHERE brand != 'MOVIMIENTO' 
  AND (seller_id IS NULL OR seller_id NOT IN (
    SELECT id FROM public.profiles WHERE array_length(deposit_ids, 1) > 0
));

COMMIT;
