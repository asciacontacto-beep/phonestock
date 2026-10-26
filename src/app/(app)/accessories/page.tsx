import { createClient, getUser, getProfile } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import AccessoriesClient from './AccessoriesClient';
import { soloDueno } from "@/utils/permisos"
import { configuracionDelLocal } from '@/utils/configuracion'

export const dynamic = 'force-dynamic'

export default async function AccessoriesPage() {
  await soloDueno()
  const user = await getUser();
  if (!user) redirect('/login');

  const profile = await getProfile(user.id);
  if (!profile) redirect('/login');

  const supabase = await createClient();

  const { data: accessories } = await supabase
    .from('accessories')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: deposits } = await supabase
    .from('deposits')
    .select('*')
    .order('name');

  const { data: ajustes } = await configuracionDelLocal(supabase, profile.org_id, 'exchange_rate');

  return (
    <AccessoriesClient 
      cotizacion={Number(ajustes?.exchange_rate) || 0}
      initialAccessories={accessories || []} 
      deposits={deposits || []} 
      user={profile} 
    />
  );
}
