"use client"
import { useState, useEffect } from 'react';
import { LayoutGrid, Box, ScanLine, ShoppingCart, Wallet, LogOut, Smartphone, User as UserIcon, Settings, Warehouse, Users2, ShieldAlert, FileText, Package, Headphones, Wrench } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  user: any;
  page: string;
  setPage: (page: string) => void;
  onLogout: () => void;
  isOpen?: boolean;
  isSuperAdmin?: boolean;
}

export function Sidebar({ user, page, setPage, onLogout, isOpen, isSuperAdmin }: SidebarProps) {
  const pathname = usePathname();
  // Derive active from real pathname so it updates instantly on navigation
  const currentPage = pathname.replace('/', '') || 'dashboard';

  const nav = isSuperAdmin ?
    [
      { g: 'Stackr Admin' },
      { id: 'superadmin', l: 'Negocios', i: <ShieldAlert size={18} /> },
    ] :
    user.role === 'owner' ?
    [
      { g: 'Sistema' },
      { id: 'dashboard', l: 'Resumen', i: <LayoutGrid size={18} /> },
      { id: 'stock', l: 'Inventario', i: <Package size={18} /> },
      { id: 'accessories', l: 'Accesorios', i: <Headphones size={18} /> },
      { id: 'deposits', l: 'Depósitos', i: <Warehouse size={18} /> },
      { id: 'suppliers', l: 'Proveedores', i: <LayoutGrid size={18} /> },
      { id: 'scan', l: 'Carga EAN', i: <ScanLine size={18} /> },
      { id: 'customers', l: 'Clientes', i: <Users2 size={18} /> },
      { id: 'expenses', l: 'Gastos', i: <Wallet size={18} /> },
      { id: 'reports', l: 'Rentabilidad', i: <LayoutGrid size={18} /> },
      { id: 'users', l: 'Usuarios', i: <UserIcon size={18} /> },
      { id: 'settings', l: 'Configuración', i: <Settings size={18} /> },
      { g: 'Operaciones' },
      { id: 'sell', l: 'Nueva Operación', i: <ShoppingCart size={18} /> },
      { id: 'sales', l: 'Historial Ventas', i: <FileText size={18} /> },
      { id: 'cashiers', l: 'Cajas', i: <Wallet size={18} /> },
      { id: 'repairs', l: 'Servicio Técnico', i: <Wrench size={18} /> }
    ] :
    [
      { g: 'Mi Terminal' },
      { id: 'dashboard', l: 'Resumen', i: <LayoutGrid size={18} /> },
      { id: 'sell', l: 'Nueva Operación', i: <ShoppingCart size={18} /> },
      { id: 'stock', l: 'Ver Stock', i: <Box size={18} /> },
      { id: 'scan', l: 'Ingresar Equipo', i: <ScanLine size={18} /> },
      { id: 'cashier_me', l: 'Mi Caja', i: <Wallet size={18} /> },
      { id: 'repairs', l: 'Servicio Técnico', i: <Wrench size={18} /> }
    ];

  return (
    <div className={`sidebar no-print ${isOpen ? 'open' : ''}`}>
      <div className="s-brand" style={{ justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: 64, height: 64, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <img src="/logo.png?v=2" alt="Stackr Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      </div>
      <div className="s-nav">
        {nav.map((it: any, i) => it.g ?
          <div key={i} className="s-group">{it.g}</div> :
          <Link
            key={it.id}
            href={`/${it.id}`}
            className={`s-item ${currentPage === it.id || (currentPage === '' && it.id === 'dashboard') ? 'on' : ''}`}
            onClick={() => setPage(it.id)}
          >
            {it.i}
            {it.l}
          </Link>
        )}
      </div>
      <div className="s-foot">
        <div className="u-row">
          <div className="av" style={{ background: user.color, color: '#000', width: 32, height: 32 }}>
            {user.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="u-name">{user.name}</div>
            <div className="u-role">{user.role}</div>
          </div>
          <button className="btn-ghost" onClick={onLogout} style={{ padding: 4 }}>
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
