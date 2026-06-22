"use client"
import { useState, useEffect, useRef } from 'react';
import { Menu, Bell, ShoppingBag, X } from 'lucide-react';
import Link from 'next/link';

interface TopbarProps {
  page: string;
  user: any;
  onMenu: () => void;
}

const NOTIFICATIONS = [
  {
    id: 'mayoristas-launch',
    icon: <ShoppingBag size={16} />,
    color: '#7c3aed',
    title: '¡Nueva sección: Mayoristas!',
    body: 'Gestioná revendedores, pedidos al por mayor y cuentas corrientes.',
    href: '/mayoristas',
    cta: 'Ir a Mayoristas',
  },
]

const STORAGE_KEY = 'stackr_notif_read'

export function Topbar({ page, user, onMenu }: TopbarProps) {
  const TITLES: Record<string, string> = {
    dashboard: 'Panel de Control',
    '': 'Panel de Control',
    stock: 'Inventario Global',
    scan: 'Carga por Escáner',
    sales: 'Ventas y Facturas',
    sell: 'Vender',
    cashiers: 'Control de Cajas',
    cashier_me: 'Mi Terminal de Caja',
    users: 'Gestión de Usuarios',
    settings: 'Configuración',
    mayoristas: 'Mayoristas',
    suppliers: 'Proveedores',
    customers: 'Clientes',
    repairs: 'Reparaciones',
    reports: 'Rentabilidad',
    expenses: 'Gastos',
    accessories: 'Accesorios',
  };

  const [open, setOpen] = useState(false)
  const [read, setRead] = useState<string[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      setRead(stored)
    } catch { setRead([]) }
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unread = NOTIFICATIONS.filter(n => !read.includes(n.id))
  const hasUnread = unread.length > 0

  const dismiss = (id: string) => {
    const next = [...read, id]
    setRead(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const dismissAll = () => {
    const next = NOTIFICATIONS.map(n => n.id)
    setRead(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setOpen(false)
  }

  return (
    <div className="topbar no-print">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="btn-icon mobile-menu-btn" onClick={onMenu} style={{ display: 'none' }}>
          <Menu size={22} />
        </button>
        <div>
          <div className="tb-title">{TITLES[page] || 'Stackr'}</div>
          <div className="tb-sub">Bienvenido, {user.name}</div>
        </div>
      </div>

      <div ref={ref} style={{ position: 'relative' }}>
        <button
          className="btn-icon"
          onClick={() => setOpen(v => !v)}
          style={{ position: 'relative' }}
          aria-label="Notificaciones"
        >
          <Bell size={20} />
          {hasUnread && (
            <span style={{
              position: 'absolute', top: 4, right: 4,
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--red)', border: '2px solid var(--surface)',
              pointerEvents: 'none',
            }} />
          )}
        </button>

        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
            width: 320, background: 'var(--surface)',
            border: '1px solid var(--border-md)', borderRadius: 14,
            boxShadow: 'var(--shadow)', zIndex: 200, overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px 10px', borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Novedades</span>
              {hasUnread && (
                <button
                  onClick={dismissAll}
                  style={{ fontSize: 11, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>

            {NOTIFICATIONS.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                Sin novedades
              </div>
            ) : (
              <div>
                {NOTIFICATIONS.map(n => {
                  const isRead = read.includes(n.id)
                  return (
                    <div key={n.id} style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--border)',
                      background: isRead ? 'transparent' : 'var(--surface-2)',
                      position: 'relative',
                    }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                          background: n.color + '18', color: n.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {n.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{n.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.4 }}>{n.body}</div>
                          {n.href && (
                            <Link
                              href={n.href}
                              onClick={() => { dismiss(n.id); setOpen(false) }}
                              style={{
                                display: 'inline-block', marginTop: 8, fontSize: 12,
                                fontWeight: 600, color: n.color, textDecoration: 'none',
                              }}
                            >
                              {n.cta} →
                            </Link>
                          )}
                        </div>
                        {!isRead && (
                          <button
                            className="btn-icon"
                            onClick={() => dismiss(n.id)}
                            style={{ flexShrink: 0, color: 'var(--text-3)' }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
