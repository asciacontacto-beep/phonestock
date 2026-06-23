-- Agrega owner_email al resultado de get_all_organizations
-- Correr en Supabase > SQL Editor

CREATE OR REPLACE FUNCTION public.get_all_organizations()
RETURNS TABLE (
  id uuid,
  name text,
  plan text,
  trial_expires_at timestamptz,
  created_at timestamptz,
  user_count bigint,
  owner_email text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.name,
    o.plan,
    o.trial_expires_at,
    o.created_at,
    COUNT(p.id)::bigint AS user_count,
    MAX(CASE WHEN p.role = 'owner' THEN p.email END) AS owner_email
  FROM public.organizations o
  LEFT JOIN public.profiles p ON p.org_id = o.id
  GROUP BY o.id, o.name, o.plan, o.trial_expires_at, o.created_at
$$;
