# Scripts SQL legacy

Migraciones y parches SQL ad-hoc que se fueron aplicando a mano a la base
antes de adoptar `supabase/migrations/`. Se conservan **sólo como referencia
histórica** — la mayoría ya está aplicada en producción.

⚠️ **No re-ejecutar contra producción sin revisar.** Varios contienen `UPDATE`,
`DROP POLICY` o cambios de esquema que podrían afectar datos existentes.

Para cambios nuevos de base, crear una migración con timestamp en
`supabase/migrations/`.

## 🛑 NUNCA correr estos (rompen la seguridad o borran datos)

| Archivo | Qué haría hoy |
|---|---|
| `reset_cajas.sql` | **Borra ventas** y devuelve equipos al stock. |
| `create_expenses_table.sql` | Crea reglas `auth.role() = 'authenticated'`: cualquier usuario de cualquier negocio vería y editaría los gastos de todos. |
| `fix_rls_policies.sql`, `fix_profiles_rls.sql` | Reemplazan reglas de acceso por versiones viejas, sin las protecciones actuales. |
| `create_tenant_rpc.sql` | Vuelve a crear `create_new_tenant` sin `search_path` ni controles. |
| `migration_multitenant.sql` | Recrea las reglas base de todas las tablas, pisando las actuales. |

Las reglas vigentes están en `supabase/migrations/` (en especial
`20260921_perfiles_guardia.sql`, `20260925_settings_organizations_cerrar.sql`,
`20260926_seguridad_superadmin.sql` y `20260928_permisos_por_rol.sql`).
