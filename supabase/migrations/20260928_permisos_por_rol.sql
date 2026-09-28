-- ============================================================================
-- Permisos por ROL, no sólo por negocio.
--
-- Hasta ahora las reglas de la base separaban un negocio de otro, pero
-- dentro del negocio el vendedor podía escribir todo lo que el dueño. La
-- app no se lo mostraba, pero con las herramientas del navegador un
-- vendedor podía editar ventas ya registradas (cambiarles el precio o el
-- vendedor), borrar el registro de auditoría, cambiar la cotización o los
-- recargos de tarjeta, marcar cuotas como pagadas o borrar fotos.
--
-- Cómo: políticas RESTRICTIVAS. Se suman (con Y) a las que ya existen, así
-- que no hace falta tocar ni borrar ninguna. Sólo cubren lo que el
-- vendedor NO hace desde la app; revisado pantalla por pantalla:
--   * vender (alta de venta, cuotas, cliente)          → sigue igual
--   * cargar y editar equipos, mover de depósito        → sigue igual
--   * reparaciones                                      → sigue igual
--   * anular una venta desde el panel                   → sigue igual
--     (decidir aparte si el vendedor debe poder anular)
--
-- NO BORRA NI MODIFICA NINGÚN DATO.
-- ============================================================================

BEGIN;

-- ¿Quien llama es dueño de su negocio?
CREATE OR REPLACE FUNCTION public.is_org_owner()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner');
$$;
REVOKE EXECUTE ON FUNCTION public.is_org_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_owner() TO authenticated;


-- ── 1. Ventas: editar una venta registrada, sólo el dueño ──────────────
-- El vendedor registra ventas (INSERT) y las anula desde el panel
-- (DELETE): eso no se toca. Editar una venta hecha es cosa del dueño
-- (Historial de Ventas). El costo lo completa la base con funciones
-- propias, que no pasan por estas reglas.
DROP POLICY IF EXISTS "ventas_editar_solo_dueno" ON public.sales;
CREATE POLICY "ventas_editar_solo_dueno" ON public.sales
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.is_org_owner()) WITH CHECK (public.is_org_owner());


-- ── 2. Registro de auditoría: sólo se agrega, nunca se edita ni borra ──
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_log FROM authenticated, anon;


-- ── 3. Configuración del local y planes de tarjeta: sólo el dueño ─────
-- El vendedor los LEE (la venta usa la cotización y los recargos), no los
-- cambia: bajando la cotización podía vender en pesos por debajo del valor.
DROP POLICY IF EXISTS "settings_escribir_solo_dueno_i" ON public.settings;
DROP POLICY IF EXISTS "settings_escribir_solo_dueno_u" ON public.settings;
DROP POLICY IF EXISTS "settings_escribir_solo_dueno_d" ON public.settings;
CREATE POLICY "settings_escribir_solo_dueno_i" ON public.settings AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.is_org_owner());
CREATE POLICY "settings_escribir_solo_dueno_u" ON public.settings AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.is_org_owner()) WITH CHECK (public.is_org_owner());
CREATE POLICY "settings_escribir_solo_dueno_d" ON public.settings AS RESTRICTIVE FOR DELETE TO authenticated USING (public.is_org_owner());

DROP POLICY IF EXISTS "planes_tarjeta_solo_dueno_i" ON public.card_plans;
DROP POLICY IF EXISTS "planes_tarjeta_solo_dueno_u" ON public.card_plans;
DROP POLICY IF EXISTS "planes_tarjeta_solo_dueno_d" ON public.card_plans;
CREATE POLICY "planes_tarjeta_solo_dueno_i" ON public.card_plans AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.is_org_owner());
CREATE POLICY "planes_tarjeta_solo_dueno_u" ON public.card_plans AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.is_org_owner()) WITH CHECK (public.is_org_owner());
CREATE POLICY "planes_tarjeta_solo_dueno_d" ON public.card_plans AS RESTRICTIVE FOR DELETE TO authenticated USING (public.is_org_owner());


-- ── 4. Cobros de cuenta corriente: sólo el dueño ───────────────────────
-- Se cargan desde Clientes, que es del dueño. Un vendedor podía marcar
-- como pagada la deuda de un conocido.
DROP POLICY IF EXISTS "cobros_solo_dueno_i" ON public.customer_payments;
DROP POLICY IF EXISTS "cobros_solo_dueno_u" ON public.customer_payments;
DROP POLICY IF EXISTS "cobros_solo_dueno_d" ON public.customer_payments;
CREATE POLICY "cobros_solo_dueno_i" ON public.customer_payments AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.is_org_owner());
CREATE POLICY "cobros_solo_dueno_u" ON public.customer_payments AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.is_org_owner()) WITH CHECK (public.is_org_owner());
CREATE POLICY "cobros_solo_dueno_d" ON public.customer_payments AS RESTRICTIVE FOR DELETE TO authenticated USING (public.is_org_owner());


-- ── 5. Cuotas: el vendedor las crea al vender; cambiarlas, el dueño ────
DROP POLICY IF EXISTS "cuotas_cambiar_solo_dueno_u" ON public.sale_installments;
DROP POLICY IF EXISTS "cuotas_cambiar_solo_dueno_d" ON public.sale_installments;
CREATE POLICY "cuotas_cambiar_solo_dueno_u" ON public.sale_installments AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.is_org_owner()) WITH CHECK (public.is_org_owner());
CREATE POLICY "cuotas_cambiar_solo_dueno_d" ON public.sale_installments AS RESTRICTIVE FOR DELETE TO authenticated USING (public.is_org_owner());


-- ── 6. Fotos del catálogo: subir y borrar, sólo el dueño ───────────────
-- El catálogo lo maneja el dueño. Sólo afecta a este depósito de archivos.
DROP POLICY IF EXISTS "catalogo_fotos_solo_dueno_i" ON storage.objects;
DROP POLICY IF EXISTS "catalogo_fotos_solo_dueno_d" ON storage.objects;
CREATE POLICY "catalogo_fotos_solo_dueno_i" ON storage.objects
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (bucket_id <> 'catalogo' OR public.is_org_owner());
CREATE POLICY "catalogo_fotos_solo_dueno_d" ON storage.objects
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (bucket_id <> 'catalogo' OR public.is_org_owner());


-- ── 7. Visitas: la app ya no las registra; se cierra la escritura anónima
DROP POLICY IF EXISTS "anon puede registrar visita" ON public.site_visits;
REVOKE INSERT ON public.site_visits FROM anon, authenticated;

COMMIT;

-- Para comprobar: las reglas nuevas, una por fila.
SELECT tablename, policyname, permissive, cmd
FROM pg_policies
WHERE policyname IN (
  'ventas_editar_solo_dueno',
  'settings_escribir_solo_dueno_i', 'settings_escribir_solo_dueno_u', 'settings_escribir_solo_dueno_d',
  'planes_tarjeta_solo_dueno_i', 'planes_tarjeta_solo_dueno_u', 'planes_tarjeta_solo_dueno_d',
  'cobros_solo_dueno_i', 'cobros_solo_dueno_u', 'cobros_solo_dueno_d',
  'cuotas_cambiar_solo_dueno_u', 'cuotas_cambiar_solo_dueno_d',
  'catalogo_fotos_solo_dueno_i', 'catalogo_fotos_solo_dueno_d')
ORDER BY tablename, policyname;
