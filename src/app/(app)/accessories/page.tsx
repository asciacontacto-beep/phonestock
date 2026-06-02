import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AccessoriesClient from './AccessoriesClient';

export default async function AccessoriesPage() {
  const supabase = createServerComponentClient({ cookies });
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
  if (!profile) redirect('/login');

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
