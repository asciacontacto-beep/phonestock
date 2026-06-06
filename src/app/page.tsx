import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/supabase/server";
import LandingPage from "@/components/LandingPage";

export default async function RootPage() {
  const user = await getUser();
  if (!user) {
    return <LandingPage />;
  }
  
  const isSuperAdmin = user.email === 'asciacontacto@gmail.com';
  if (isSuperAdmin) {
    redirect("/dashboard");
  }
  
  const profile = await getProfile(user.id);
  if (profile?.role === 'owner') {
    redirect("/dashboard");
  } else {
    redirect("/sell");
  }
}
