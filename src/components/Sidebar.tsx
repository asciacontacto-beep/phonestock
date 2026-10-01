"use client"
import { useState, useEffect } from 'react';
import { LayoutDashboard, Box, ScanLine, ShoppingCart, Settings, Users2, FileText, Package, Wrench, Truck, CreditCard, CalendarDays, Building2, MessageSquare, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { menuActivo, rutaDe } from '@/utils/secciones';

interface SidebarProps {
  user: any;
  page: string;
  setPage: (page: string) => void;
  isOpen?: boolean;
  isSuperAdmin?: boolean;
}

export function Sidebar({ user, page, setPage, isOpen, isSuperAdmin }: SidebarProps) {
  const pathname = usePathname();

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
      // Una entrada por tema; las pantallas del tema son pestañas arriba
      // (ver utils/secciones.ts).
      { g: 'Negocio' },
      { id: 'dashboard',   l: 'Resumen',          i: <LayoutDashboard size={17} /> },
      { id: 'stock',       l: 'Inventario',       i: <Package size={17} /> },
      { g: 'Operaciones' },
      { id: 'sell',        l: 'Nueva Operación',  i: <ShoppingCart size={17} /> },
      { id: 'sales',       l: 'Ventas',           i: <FileText size={17} /> },
      { id: 'cashiers',    l: 'Caja y gastos',    i: <CreditCard size={17} /> },
      { id: 'repairs',     l: 'Servicio Técnico', i: <Wrench size={17} /> },
      { id: 'turnos',      l: 'Turnos',           i: <CalendarDays size={17} /> },
      { g: 'Contactos' },
      { id: 'customers',   l: 'Clientes',         i: <Users2 size={17} /> },
      { id: 'suppliers',   l: 'Proveedores',      i: <Truck size={17} /> },
      { g: 'Ajustes' },
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

  // Derive active from real pathname so it updates instantly on navigation.
  // Accesorios marca Inventario, Gastos marca Caja, etc. Si la pantalla
  // tiene su propia entrada (el vendedor tiene "Ingresar Equipo"), va esa.
  const ruta = rutaDe(pathname);
  const currentPage = nav.some(it => 'id' in it && it.id === ruta) ? ruta : menuActivo(pathname);

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
            className={`s-item ${currentPage === it.id ? 'on' : ''}`}
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
