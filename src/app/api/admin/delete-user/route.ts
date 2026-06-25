import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const callerId = session.user.id;
  const callerEmail = session.user.email;
  const isSuperAdmin = callerEmail === 'asciacontacto@gmail.com';

  // Use service role to bypass RLS for all checks + deletion
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  if (!isSuperAdmin) {
    const [{ data: callerProfile }, { data: targetProfile }] = await Promise.all([
      admin.from('profiles').select('role, org_id').eq('id', callerId).single(),
      admin.from('profiles').select('role, org_id').eq('id', userId).single(),
    ]);

    if (!callerProfile || !['owner', 'admin'].includes(callerProfile.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }
    // Owners can delete any user in their org (or with null org_id)
    // Admins must verify same org
    if (callerProfile.role !== 'owner' && targetProfile) {
      if (targetProfile.org_id !== callerProfile.org_id) {
        return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
      }
    }
    // Nobody can delete another owner unless they're also owner
    if (targetProfile?.role === 'owner' && callerProfile.role !== 'owner') {
      return NextResponse.json({ error: 'No podés borrar al owner' }, { status: 403 });
    }
  }

  // Nullify FK references to auth.users before deletion to avoid constraint errors
  await Promise.all([
    admin.from('appointments').update({ seller_id: null }).eq('seller_id', userId),
    admin.from('profiles').delete().eq('id', userId),
  ]);

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error('[delete-user]', error);
    return NextResponse.json({ error: 'No se pudo eliminar el usuario' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
