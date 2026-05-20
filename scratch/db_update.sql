-- Crear tabla de proveedores
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS (Row Level Security) para la tabla suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir acceso (ajusta esto si tienes roles más específicos)
-- Permitir lectura a todos los usuarios autenticados
CREATE POLICY "Allow select on suppliers" ON suppliers FOR SELECT USING (auth.role() = 'authenticated');
-- Permitir inserción/modificación a todos los usuarios autenticados (o restringirlo a owners si prefieres)
CREATE POLICY "Allow insert on suppliers" ON suppliers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update on suppliers" ON suppliers FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete on suppliers" ON suppliers FOR DELETE USING (auth.role() = 'authenticated');

-- Añadir la columna supplier_id a la tabla stock
ALTER TABLE stock
ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL;
