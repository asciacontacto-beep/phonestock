-- ============================================================================
-- Reparar un equipo propio del inventario antes de venderlo.
--
-- El módulo de Reparaciones es para equipos de clientes: guarda el nombre y
-- el modelo como texto libre, sin vínculo con el stock. Si arreglabas un
-- equipo tuyo, podías editar a mano la batería y la condición, pero el costo
-- de los repuestos NO se sumaba al costo del equipo: gastabas 75 dólares y
-- el margen seguía mostrando el de antes.
--
-- NO BORRA NI MODIFICA NINGÚN DATO EXISTENTE. Agrega una columna que
-- arranca en null.
-- ============================================================================


-- ── La reparación puede apuntar a un equipo del inventario ──────────────
-- Con `stock_id` es una reparación interna; sin él es de un cliente, como
-- todas las que ya existen. Las reparaciones viejas quedan en null y siguen
-- funcionando igual.

ALTER TABLE public.repairs
  ADD COLUMN IF NOT EXISTS stock_id BIGINT REFERENCES public.stock(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS repairs_stock_id_idx ON public.repairs (stock_id);


-- ── Sobre el estado `in_repair` del stock ───────────────────────────────
-- No hace falta migración: `stock.status` es TEXT libre. Un equipo en
-- reparación pasa a `in_repair` y vuelve a `available` al cerrarse.
--
-- OJO con el índice único de IMEI (20260914_imei_unico.sql): es PARCIAL
-- sobre `status = 'available'`. Un equipo en `in_repair` sale de ese índice,
-- así que mientras está en reparación su IMEI no bloquea nada — que es lo
-- correcto: no está disponible para vender. Al volver a `available` el
-- índice lo toma de nuevo.


-- ── Para volver atrás, si hiciera falta ─────────────────────────────────
--     UPDATE public.stock SET status = 'available' WHERE status = 'in_repair';
--     ALTER TABLE public.repairs DROP COLUMN stock_id;
