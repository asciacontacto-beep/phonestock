"use client"
import { useState, useEffect } from 'react';
import { LayoutGrid, Box, ScanLine, ShoppingCart, Wallet, LogOut, Smartphone, User as UserIcon, Settings, Warehouse, Users2, ShieldAlert } from 'lucide-react';
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
      { id: 'stock', l: 'Inventario', i: <Box size={18} /> },
      { id: 'deposits', l: 'Depósitos', i: <Warehouse size={18} /> },
      { id: 'suppliers', l: 'Proveedores', i: <LayoutGrid size={18} /> },
      { id: 'scan', l: 'Carga EAN', i: <ScanLine size={18} /> },
      { id: 'customers', l: 'Clientes', i: <Users2 size={18} /> },
      { id: 'users', l: 'Usuarios', i: <UserIcon size={18} /> },
      { id: 'settings', l: 'Configuración', i: <Settings size={18} /> },
      { g: 'Operaciones' },
      { id: 'sales', l: 'Ventas / Facturas', i: <ShoppingCart size={18} /> },
      { id: 'cashiers', l: 'Cajas de Vendedores', i: <Wallet size={18} /> }
    ] :
    [
      { g: 'Mi Terminal' },
      { id: 'sell', l: 'Nueva Operación', i: <ShoppingCart size={18} /> },
      { id: 'stock', l: 'Ver Stock', i: <Box size={18} /> },
      { id: 'scan', l: 'Ingresar Equipo', i: <ScanLine size={18} /> },
      { id: 'cashier_me', l: 'Mi Caja', i: <Wallet size={18} /> }
    ];

  return (
    <div className={`sidebar no-print ${isOpen ? 'open' : ''}`}>
      <div className="s-brand">
        <div className="s-mark">
          <Smartphone size={18} strokeWidth={2.5} color="#000" />
        </div>
        <div>
          <div className="s-name">Stackr</div>
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
