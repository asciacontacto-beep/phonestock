-- ============================================================================
-- Locales con cuentas aparte.
--
-- Un negocio con un local que vende sólo accesorios (u otra cosa) puede
-- querer sus números separados. Marcado así, en Inicio, Rentabilidad, Mes a
-- mes y Análisis la vista "General" no suma sus ventas ni sus gastos, y se lo
-- puede ver por separado eligiéndolo arriba. Los demás locales siguen igual.
--
-- NO BORRA NI MODIFICA NINGÚN DATO. Agrega una columna que arranca en "no"
-- para todos los locales.
-- ============================================================================

ALTER TABLE public.deposits
  ADD COLUMN IF NOT EXISTS cuentas_aparte BOOLEAN NOT NULL DEFAULT false;

-- Verificación: tiene que devolver 1 fila.
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'deposits' AND column_name = 'cuentas_aparte';
