import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { puedeBorrarUsuario, origenPropio, esUuid, eventoSeguridad } from '@/utils/autorizacion';

export async function POST(req: NextRequest) {
  // Segunda capa contra pedidos armados desde otro sitio (CSRF).
  if (!origenPropio(req.headers.get('origin'), req.headers.get('host'))) {
    eventoSeguridad('borrar_usuario_origen_ajeno', { origin: req.headers.get('origin') });
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 });
  }

  let userId: unknown;
  try {
    ({ userId } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 });
  }
  if (!esUuid(userId)) return NextResponse.json({ error: 'userId required' }, { status: 400 });

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

  // getUser() valida el JWT contra el servidor de auth. Imprescindible acá:
  // es el gate previo a operaciones con service role (bypassea RLS).
  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const callerId = caller.id;
  const isSuperAdmin = caller.email === 'asciacontacto@gmail.com';

  // Use service role to bypass RLS for all checks + deletion
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const [{ data: callerProfile }, { data: targetProfile }] = await Promise.all([
    admin.from('profiles').select('role, org_id').eq('id', callerId).maybeSingle(),
    admin.from('profiles').select('role, org_id').eq('id', userId).maybeSingle(),
  ]);

  // La decisión vive en utils/autorizacion.ts, con sus tests: antes el
  // dueño se salteaba la comparación de negocio y podía borrar usuarios de
  // cualquier otro local.
  const decision = puedeBorrarUsuario({
    llamadorId: callerId, esSuperadmin: isSuperAdmin,
    llamador: callerProfile, objetivoId: userId, objetivo: targetProfile,
  });
  if (!decision.ok) {
    eventoSeguridad('borrar_usuario_denegado', { llamador: callerId, objetivo: userId, motivo: decision.motivo });
    return NextResponse.json({ error: decision.motivo }, { status: decision.status });
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

  eventoSeguridad('usuario_borrado', { llamador: callerId, objetivo: userId, superadmin: isSuperAdmin });
  return NextResponse.json({ ok: true });
}
