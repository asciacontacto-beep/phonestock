# Scripts SQL legacy

Migraciones y parches SQL ad-hoc que se fueron aplicando a mano a la base
antes de adoptar `supabase/migrations/`. Se conservan **sólo como referencia
histórica** — la mayoría ya está aplicada en producción.

⚠️ **No re-ejecutar contra producción sin revisar.** Varios contienen `UPDATE`,
`DROP POLICY` o cambios de esquema que podrían afectar datos existentes.

Para cambios nuevos de base, crear una migración con timestamp en
`supabase/migrations/`.
