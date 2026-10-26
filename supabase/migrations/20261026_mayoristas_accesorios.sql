-- ============================================================================
-- Accesorios en los pedidos de revendedores.
--
-- Un revendedor también se lleva accesorios al por mayor (fundas, vidrios,
-- cargadores). Hasta ahora el pedido sólo admitía equipos del stock. Cada
-- renglón puede apuntar ahora a un accesorio: al entregar el pedido se
-- descuenta la cantidad de su stock y se anota la venta de accesorios.
--
-- NO BORRA NI MODIFICA NINGÚN DATO. Agrega una columna vacía.
-- ============================================================================

ALTER TABLE public.wholesale_order_items
  ADD COLUMN IF NOT EXISTS accessory_id UUID REFERENCES public.accessories(id) ON DELETE SET NULL;

-- Que PostgREST vea la columna nueva sin esperar.
NOTIFY pgrst, 'reload schema';
