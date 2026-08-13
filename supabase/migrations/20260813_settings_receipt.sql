-- Configuración ampliada del negocio y personalización del recibo.
--
-- Aditiva y no destructiva: sólo agrega columnas nuevas (nullable) a la tabla
-- settings que ya existe. No toca ni borra datos.
--
-- receipt_config guarda TODA la personalización del recibo como un único JSON,
-- así el resto de las opciones futuras no necesitan más migraciones.

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS logo_url       text;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS email          text;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS cuit           text;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS website        text;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS receipt_config jsonb;
