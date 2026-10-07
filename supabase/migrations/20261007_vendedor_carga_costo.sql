-- ============================================================================
-- Opción por local: que el vendedor pueda escribir el costo al ingresar un
-- equipo. Apagada para todos: nada cambia hasta que el dueño la prenda en
-- Configuración → Vendedores.
--
-- Prendida, el vendedor ve el campo de costo VACÍO al cargar un equipo y
-- escribe lo que pagó. Nunca ve costos ya guardados.
--
-- NO BORRA NI MODIFICA NINGÚN DATO: agrega una columna que arranca en false.
-- ============================================================================

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS vendedor_carga_costo BOOLEAN NOT NULL DEFAULT false;
