"use client"
import { useState, useEffect } from 'react';
import { LayoutDashboard, Box, ScanLine, ShoppingCart, Wallet, User as UserIcon, Settings, Warehouse, Users2, FileText, Package, Headphones, Wrench, Truck, BarChart3, CreditCard, ShoppingBag, CalendarDays, Receipt, Building2, MessageSquare, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  user: any;
  page: string;
  setPage: (page: string) => void;
  isOpen?: boolean;
  isSuperAdmin?: boolean;
}

export function Sidebar({ user, page, setPage, isOpen, isSuperAdmin }: SidebarProps) {
  const pathname = usePathname();
  // Derive active from real pathname so it updates instantly on navigation
  const currentPage = pathname.replace('/', '') || 'dashboard';

  const nav = isSuperAdmin ?
    [
      { g: 'Stackr Admin' },
      { id: 'superadmin',             l: 'Resumen',      i: <LayoutDashboard size={17} /> },
      { id: 'superadmin/negocios',    l: 'Negocios',     i: <Building2 size={17} /> },
      { id: 'superadmin/seguimiento', l: 'Seguimiento',  i: <MessageSquare size={17} /> },
      { id: 'superadmin/cobros',      l: 'Cobros',       i: <DollarSign size={17} /> },
      { id: 'superadmin/agenda',      l: 'Agenda',       i: <CalendarDays size={17} /> },
    ] :
    user.role === 'owner' ?
    [
      { g: 'General' },
      { id: 'dashboard',   l: 'Resumen',        i: <LayoutDashboard size={17} /> },
      { id: 'reports',     l: 'Rentabilidad',    i: <BarChart3 size={17} /> },
      { g: 'Inventario' },
      { id: 'stock',       l: 'Inventario',      i: <Package size={17} /> },
      { id: 'accessories', l: 'Accesorios',      i: <Headphones size={17} /> },
      { id: 'deposits',    l: 'Depósitos',        i: <Warehouse size={17} /> },
      { id: 'scan',        l: 'Carga EAN',        i: <ScanLine size={17} /> },
      { g: 'Operaciones' },
      { id: 'sell',        l: 'Nueva Operación',  i: <ShoppingCart size={17} /> },
      { id: 'sales',       l: 'Historial Ventas', i: <FileText size={17} /> },
      { id: 'recibos',     l: 'Recibo',           i: <Receipt size={17} /> },
      { id: 'repairs',     l: 'Servicio Técnico', i: <Wrench size={17} /> },
      { id: 'turnos',      l: 'Turnos',           i: <CalendarDays size={17} /> },
      { id: 'cashiers',    l: 'Cajas',            i: <CreditCard size={17} /> },
      { id: 'expenses',    l: 'Gastos',           i: <Wallet size={17} /> },
      { g: 'Contactos' },
      { id: 'customers',   l: 'Clientes',         i: <Users2 size={17} /> },
      { id: 'mayoristas',  l: 'Mayoristas',       i: <ShoppingBag size={17} /> },
      { id: 'suppliers',   l: 'Proveedores',      i: <Truck size={17} /> },
      { g: 'Configuración' },
      { id: 'users',       l: 'Usuarios',         i: <UserIcon size={17} /> },
      { id: 'settings',    l: 'Configuración',    i: <Settings size={17} /> },
    ] :
    [
      { g: 'Mi Terminal' },
      { id: 'dashboard',  l: 'Resumen',          i: <LayoutDashboard size={17} /> },
      { id: 'sell',       l: 'Nueva Operación',  i: <ShoppingCart size={17} /> },
      { id: 'stock',      l: 'Ver Stock',        i: <Box size={17} /> },
      { id: 'scan',       l: 'Ingresar Equipo',  i: <ScanLine size={17} /> },
      { id: 'cashier_me', l: 'Mi Caja',          i: <CreditCard size={17} /> },
      { id: 'repairs',    l: 'Servicio Técnico', i: <Wrench size={17} /> },
    ];

  return (
    <div className={`sidebar no-print ${isOpen ? 'open' : ''}`}>
      {/* La misma marca que la landing y el login: el glifo de tres barras y
          el nombre escrito. Antes era un bloque de 120px con la "S" que se
          comía el alto de la barra y no se parecía a nada del resto. */}
      <div className="s-brand">
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden style={{ flexShrink: 0, color: 'var(--text)' }}>
          <rect y="1.5" width="17" height="3" rx="1.5" fill="currentColor" />
          <rect y="7" width="12" height="3" rx="1.5" fill="currentColor" opacity=".7" />
          <rect y="12.5" width="7" height="3" rx="1.5" fill="currentColor" opacity=".45" />
        </svg>
        <span className="s-name">Stackr</span>
      </div>
      <div className="s-nav">
        {nav.map((it: any, i) => it.g ?
          <div key={i} className="s-group">{it.g}</div> :
          <Link
            key={it.id}
            href={`/${it.id}`}
            prefetch={true}
            className={`s-item ${currentPage === it.id || (currentPage === '' && it.id === 'dashboard') ? 'on' : ''}`}
            onClick={() => setPage(it.id)}
          >
            {it.i}
            {it.l}
          </Link>
        )}
      </div>
    </div>
  );
}
