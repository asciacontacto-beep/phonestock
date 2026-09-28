import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { origenPropio, eventoSeguridad } from '@/utils/autorizacion';
import { validarAlta } from '@/utils/altaUsuario';

/**
 * Alta de un usuario del local. Ver utils/altaUsuario.ts: por qué es del
 * lado del servidor y qué se valida.
 */
export async function POST(req: NextRequest) {
  if (!origenPropio(req.headers.get('origin'), req.headers.get('host'))) {
    eventoSeguridad('alta_usuario_origen_ajeno', { origin: req.headers.get('origin') });
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 }); }
  const v = validarAlta(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const d = v.datos;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  // getUser valida la sesión contra Supabase: es la puerta antes de usar la llave maestra.
  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: perfil } = await admin.from('profiles').select('role, org_id').eq('id', caller.id).maybeSingle();
  if (!perfil || perfil.role !== 'owner' || !perfil.org_id) {
    eventoSeguridad('alta_usuario_denegada', { llamador: caller.id, rol: perfil?.role ?? null });
    return NextResponse.json({ error: 'Sólo el dueño del negocio puede dar de alta usuarios' }, { status: 403 });
  }
  const orgId = perfil.org_id as string;

  // Los depósitos tienen que ser de este negocio.
  if (d.deposit_ids.length > 0) {
    const { data: propios } = await admin.from('deposits').select('id').eq('org_id', orgId).in('id', d.deposit_ids);
    const ids = new Set((propios || []).map(x => String(x.id)));
    if (!d.deposit_ids.every(id => ids.has(id))) {
      eventoSeguridad('alta_usuario_deposito_ajeno', { llamador: caller.id });
      return NextResponse.json({ error: 'Depósitos inválidos' }, { status: 400 });
    }
  }

  const { data: creado, error: authErr } = await admin.auth.admin.createUser({
    email: d.email,
    password: d.password,
    email_confirm: true,
    user_metadata: { name: d.name },
  });
  if (authErr || !creado?.user) {
    const yaExiste = /already|registered|exists/i.test(authErr?.message || '');
    return NextResponse.json(
      { error: yaExiste ? 'Ese email ya tiene una cuenta.' : 'No se pudo crear el usuario.' },
      { status: yaExiste ? 409 : 500 },
    );
  }

  const { error: perfilErr } = await admin.from('profiles').insert({
    id: creado.user.id,
    name: d.name,
    email: d.email,
    role: d.role,
    initials: d.initials,
    color: d.color,
    org_id: orgId,
    deposit_ids: d.deposit_ids,
  });
  if (perfilErr) {
    // Sin perfil la cuenta no sirve y quedaría huérfana: se deshace.
    await admin.auth.admin.deleteUser(creado.user.id);
    console.error('[create-user]', perfilErr.message);
    return NextResponse.json({ error: 'No se pudo crear el perfil del usuario.' }, { status: 500 });
  }

  eventoSeguridad('usuario_creado', { llamador: caller.id, nuevo: creado.user.id, rol: d.role });
  return NextResponse.json({ ok: true });
}
