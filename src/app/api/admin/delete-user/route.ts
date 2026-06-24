import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  // Verify caller is owner/admin of the same org as target user
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: callerProfile } = await supabase.from('profiles').select('role, org_id').eq('id', caller.id).single();
  if (!callerProfile || !['owner', 'admin'].includes(callerProfile.role)) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  const { data: targetProfile } = await supabase.from('profiles').select('org_id, role').eq('id', userId).single();
  if (!targetProfile || targetProfile.org_id !== callerProfile.org_id) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }
  if (targetProfile.role === 'owner' && callerProfile.role !== 'owner') {
    return NextResponse.json({ error: 'No podés borrar al owner' }, { status: 403 });
  }

  // Use service role to delete from auth.users (also cascades profile)
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
