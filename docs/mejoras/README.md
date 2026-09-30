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

## 3. Métricas de visitas del superadmin (para ver el tráfico del link)

**Archivo:** `supabase/migrations/20260813_site_visits.sql`

**Qué hace:** crea la tabla `site_visits` (registra cada visita al landing, con
INSERT anónimo) y la función `get_visit_stats()` (restringida a tu email de
superadmin). Con esto, el Panel Superadmin muestra **cuánta gente entró al
link** (total, hoy, 7 y 30 días) y la **conversión visita → registro**.

**Aplicala:** Supabase → SQL Editor → pegá el archivo → Run. Desde ese momento
se empiezan a contar las visitas (las anteriores no se pueden recuperar). Los
registros y usuarios ya se muestran sin necesidad de esta migración.

---

## 4. Verificar aislamiento entre tiendas (RLS) — solo lectura

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

---

## 5. Cuentas, financieras, cierre a ciegas y valores de toma

**Archivo:** `supabase/migrations/20260930_cuentas_financieras_y_caja.sql`

**Qué hace:** agrega todo lo que salió del relevamiento de Stuky
(`docs/mejoras/stuky/RELEVAMIENTO.md`). Es **aditivo y no destructivo**:
tablas y columnas nuevas, con valores por defecto que dejan todo como estaba.

- **`accounts`:** tus cuentas (banco, billetera, financiera, procesadora de
  tarjeta). Al cobrar por transferencia se elige a cuál entró; la cuenta queda
  guardada dentro del pago de la venta.
- **`card_plans`:** tres columnas nuevas.
  - `kind`: tarjeta o financiera.
  - `account_id`: la cuenta donde acredita.
  - `settlement_days`: los días que tarda en acreditar.
- **`cash_closures`:** los cierres de turno de los vendedores. Guarda solo lo
  que declaró cada uno; lo esperado lo calcula la app al mirarlo.
- **`settings.cierre_a_ciegas`:** con esto activado, el vendedor cierra sin ver
  lo esperado.
- **`tradein_values`:** cuánto pagás por un usado según modelo, capacidad y
  batería.

**La app degrada con gracia:** sin la migración, todo sigue como antes. Las
secciones nuevas de Configuración avisan que falta aplicarla, y la venta no
pregunta a qué cuenta entra la transferencia.

**Cómo aplicarla:**
1. Supabase → SQL Editor → pegá el archivo → Run. Se puede correr dos veces
   sin problema.
2. Andá a **Configuración → Cobros** y cargá tus cuentas (por ejemplo: Galicia,
   Mercado Pago, la financiera).
3. En los planes, marcá dónde acredita cada uno y a cuántos días.
4. Si querés el cierre a ciegas: **Configuración → Caja**, tildalo y guardá.

**Para volver atrás:** las instrucciones están al pie del archivo. Las ventas
no se tocan: cada pago guarda el nombre de su cuenta.

**Un cambio en los números que vas a notar:** la ganancia del Dashboard y de
Rentabilidad ahora descuenta lo que se queda la tarjeta o la financiera cuando
el recargo **lo absorbe el local**. Antes no se descontaba, así que esas ventas
figuraban con más ganancia de la real. El recargo que paga el cliente sigue sin
contar como ganancia.
