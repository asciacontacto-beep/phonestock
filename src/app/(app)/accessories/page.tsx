import { createClient, getUser, getProfile } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import AccessoriesClient from './AccessoriesClient';

export default async function AccessoriesPage() {
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

  return (
    <AccessoriesClient 
      initialAccessories={accessories || []} 
      deposits={deposits || []} 
      user={profile} 
    />
  );
}
