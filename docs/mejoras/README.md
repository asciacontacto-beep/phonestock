# Mejoras — pasos que dependen de tu base de datos

Estos cambios necesitan que vos los apliques/verifiques en Supabase, porque
tocan la base de producción y no se ejecutan solos. Todo es **aditivo y no
destructivo**: no borra ni modifica datos existentes.

---

## 1. Anulación de venta atómica (recomendado)

**Archivo:** `supabase/migrations/20260813_void_sale_atomic.sql`

**Qué hace:** crea la función `void_sale(uuid)` que revierte una venta (devuelve
equipo, accesorios, saca el canje, borra la venta) dentro de **una sola
transacción**. Si algo falla, se revierte todo. Hoy eso son 4 llamadas sueltas
y un fallo a mitad deja la base inconsistente.

**La app ya está preparada:** usa la función si existe y, si no, cae al método
anterior. Podés aplicar la migración cuando quieras sin desplegar nada.

**Cómo aplicarla:**
1. Supabase → SQL Editor → pegá el contenido del archivo → Run.
2. Probá anular **una venta de prueba** (con equipo, accesorio y/o canje).
3. Verificá que el stock y el canje volvieron como esperabas.

Si algo no te cierra, borrá la función y la app vuelve sola al método anterior:
```sql
DROP FUNCTION IF EXISTS public.void_sale(uuid);
```

---

## 2. Configuración ampliada + personalización del recibo

**Archivo:** `supabase/migrations/20260813_settings_receipt.sql`

**Qué hace:** agrega columnas nuevas (todas nullable) a la tabla `settings`:
`logo_url`, `email`, `cuit`, `website` y `receipt_config` (jsonb con todo el
diseño del recibo). **No borra ni cambia nada** existente.

**La app degrada con gracia:** sin la migración, Configuración guarda los
campos básicos y te avisa; el recibo usa el diseño por defecto. Con la
migración aplicada se activan el logo, los datos extra y toda la
personalización del recibo (colores, formato ticket/A4, qué mostrar, etc.).

**Cómo aplicarla:** Supabase → SQL Editor → pegá el archivo → Run. Listo,
sin desplegar nada.

---

## 3. Verificar aislamiento entre tiendas (RLS) — solo lectura

Corré esto en el SQL Editor para confirmar que **cada tabla tiene la política de
aislamiento por organización** y no quedó ninguna política vieja permisiva
(por ejemplo, la que tenía `expenses` antes: "todos los autenticados"):

```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('stock','sales','deposits','expenses','customers',
                    'suppliers','accessories','spare_parts','repairs','settings')
ORDER BY tablename, policyname;
```

**Qué esperar:** cada tabla debería mostrar una política tipo *"Tenant Isolation
Policy"* con `qual` = `(org_id = current_user_org_id())`. Si ves alguna política
con `qual` = `(auth.role() = 'authenticated')` (sin filtrar por `org_id`),
**esa tabla está expuesta entre organizaciones** y hay que reemplazar esa
política. Avisame y te paso el fix exacto.

Verificá también que RLS esté activo en todas:
```sql
SELECT relname, relrowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN ('stock','sales','deposits','expenses','customers',
                  'suppliers','accessories','spare_parts','repairs','settings');
```
`relrowsecurity` debe ser `true` en todas.
