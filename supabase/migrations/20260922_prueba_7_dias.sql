-- ============================================================================
-- La prueba gratis pasa de 48 horas a 7 días.
--
-- Por qué: en la Biblioteca de anuncios de Meta, los sistemas que compiten en
-- Argentina ofrecen entre 10 y 30 días de prueba (Nexo 14, iVMSTOCK 30,
-- Gestioo 10, Loop 7). Con 48 horas el anuncio arranca en desventaja, y son
-- dos días para que un local cargue su stock y llegue a ver si le sirve:
-- alcanza para mirar, no para probar.
--
-- Sólo cambia el valor por defecto de las organizaciones NUEVAS. No toca los
-- negocios que ya existen: a los que estén en prueba se les extiende a mano
-- desde el panel (Superadmin → Negocios → Prueba gratis), que para eso está.
--
-- Correr una sola vez en el SQL Editor.
-- ============================================================================

ALTER TABLE public.organizations
  ALTER COLUMN trial_expires_at SET DEFAULT (NOW() + INTERVAL '7 days');

-- Para verificar que quedó aplicado (debe decir 7 days):
--   SELECT column_default
--   FROM information_schema.columns
--   WHERE table_name = 'organizations' AND column_name = 'trial_expires_at';
