"use client"
import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { createClient } from '@/utils/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

export function AppShell({ user, profile, children }: { user: any, profile: any, children: React.ReactNode }) {
  const [sbOpen, setSbOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  
  const isSuperAdmin = user.email === 'asciacontacto@gmail.com'
  const finalRole = isSuperAdmin ? 'owner' : (profile?.role || 'seller')
  
  const mergedUser = {
    ...profile,
    id: user.id,
    email: user.email,
    name: profile?.name || (isSuperAdmin ? 'Administrador' : user.email),
    role: finalRole,
    initials: profile?.initials || (isSuperAdmin ? 'AD' : 'U'),
    color: profile?.color || (isSuperAdmin ? '#f59e0b' : '#ccc'),
    org_id: profile?.org_id || null
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Basic page detection from pathname
  const page = pathname.replace('/', '') || 'dashboard'

  return (
    <div className="app">
      <Sidebar 
        user={mergedUser} 
        page={page} 
        setPage={(p) => setSbOpen(false)} 
        onLogout={handleLogout} 
        isOpen={sbOpen} 
        isSuperAdmin={isSuperAdmin} 
      />
      <div className="main" onClick={() => sbOpen && setSbOpen(false)}>
        <Topbar page={page} user={mergedUser} onMenu={() => setSbOpen(true)} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
          {children}
        </div>
      </div>
      {sbOpen && (
        <div className="sidebar-overlay" onClick={() => setSbOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, backdropFilter: 'blur(4px)'
        }}></div>
      )}
    </div>
  )
}
