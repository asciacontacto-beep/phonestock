"use client"
import {
  LayoutDashboard, BarChart3, Package, Headphones, Warehouse, ScanLine, ShoppingCart, FileText, Receipt,
  CreditCard, Wallet, Wrench, CalendarDays, Users2, ShoppingBag, Truck, Settings, User as UserIcon, Store,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { pestanaDe, rutaDe } from '@/utils/secciones';
import { useEffect, useState } from 'react';
import { SideNav, type NavSeccion as Rama } from './SideNav';

interface SidebarProps {
  user: { role?: string } | null;
  page: string;
  setPage: (page: string) => void;
  isOpen?: boolean;
  isSuperAdmin?: boolean;
}

const I = 15;

/* El dueño ve siete temas, siempre abiertos; adentro, cada pantalla. Antes
   eran diecinueve entradas sueltas. Las pestañas de arriba de cada pantalla
   (utils/secciones.ts) siguen siendo el atajo dentro del tema. */
export const DUENO: Rama[] = [
  { label: 'Resumen', hijos: [
    { id: 'dashboard', label: 'Resumen', icon: <LayoutDashboard size={I} /> },
    { id: 'reports', label: 'Rentabilidad', icon: <BarChart3 size={I} /> },
  ] },
  { label: 'Ventas', hijos: [
    { id: 'sell', label: 'Nueva operación', icon: <ShoppingCart size={I} /> },
    { id: 'sales', label: 'Historial', icon: <FileText size={I} /> },
    { id: 'recibos', label: 'Recibo manual', icon: <Receipt size={I} /> },
  ] },
  { label: 'Inventario', hijos: [
    { id: 'stock', label: 'Equipos', icon: <Package size={I} /> },
    { id: 'accessories', label: 'Accesorios', icon: <Headphones size={I} /> },
    { id: 'deposits', label: 'Depósitos', icon: <Warehouse size={I} /> },
    { id: 'scan', label: 'Carga EAN', icon: <ScanLine size={I} /> },
  ] },
  { label: 'Caja', hijos: [
    { id: 'cashiers', label: 'Cajas', icon: <CreditCard size={I} /> },
    { id: 'expenses', label: 'Gastos', icon: <Wallet size={I} /> },
  ] },
  { label: 'Taller', hijos: [
    { id: 'repairs', label: 'Servicio técnico', icon: <Wrench size={I} /> },
    { id: 'turnos', label: 'Turnos', icon: <CalendarDays size={I} /> },
  ] },
  { label: 'Contactos', hijos: [
    { id: 'customers', label: 'Clientes', icon: <Users2 size={I} /> },
    { id: 'mayoristas', label: 'Mayoristas', icon: <ShoppingBag size={I} /> },
    { id: 'suppliers', label: 'Proveedores', icon: <Truck size={I} /> },
  ] },
  { label: 'Configuración', hijos: [
    { id: 'settings', label: 'Ajustes', icon: <Settings size={I} /> },
    { id: 'users', label: 'Usuarios', icon: <UserIcon size={I} /> },
    { id: 'catalogo', label: 'Catálogo', icon: <Store size={I} /> },
  ] },
];

export const VENDEDOR: Rama[] = [
  { label: 'Mi terminal', hijos: [
    { id: 'dashboard', label: 'Resumen', icon: <LayoutDashboard size={I} /> },
    { id: 'sell', label: 'Nueva operación', icon: <ShoppingCart size={I} /> },
    { id: 'stock', label: 'Ver stock', icon: <Package size={I} /> },
    { id: 'scan', label: 'Ingresar equipo', icon: <ScanLine size={I} /> },
    { id: 'cashier_me', label: 'Mi caja', icon: <CreditCard size={I} /> },
    { id: 'repairs', label: 'Servicio técnico', icon: <Wrench size={I} /> },
  ] },
];

export const SUPERADMIN: Rama[] = [
  { label: 'Stackr Admin', hijos: [
    { id: 'superadmin', label: 'Resumen', icon: <LayoutDashboard size={I} /> },
    { id: 'superadmin/negocios', label: 'Negocios', icon: <Store size={I} /> },
    { id: 'superadmin/seguimiento', label: 'Seguimiento', icon: <Users2 size={I} /> },
    { id: 'superadmin/cobros', label: 'Cobros', icon: <Wallet size={I} /> },
    { id: 'superadmin/agenda', label: 'Agenda', icon: <CalendarDays size={I} /> },
  ] },
];

export function Sidebar({ user, setPage, isOpen, isSuperAdmin }: SidebarProps) {
  const pathname = usePathname();
  const items = isSuperAdmin ? SUPERADMIN : user?.role === 'owner' ? DUENO : VENDEDOR;

  // La ruta exacta si está en el menú (superadmin/negocios); si no, la
  // pantalla a la que pertenece (mayoristas/123 → Mayoristas).
  const ruta = rutaDe(pathname);
  const enMenu = items.some(it => it.hijos.some(h => h.id === ruta));
  const activo = enMenu ? ruta : pestanaDe(pathname);

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
      <div className="s-nav s-nav-sn">
        {/* La clave cambia con el rol: el perfil llega después del primer
            dibujo, y el menú del dueño entra con su propia animación. */}
        <SideNav key={isSuperAdmin ? 'admin' : user?.role || 'seller'} secciones={items} activo={activo} onNavigate={() => setPage(activo)} />
      </div>
      <PieDelMenu />
    </div>
  );
}

/* Abajo de todo: si hay conexión y qué versión corre. En un local con
   wifi que se corta, ver "Sin conexión" explica por qué no guarda. */
function PieDelMenu() {
  const [enLinea, setEnLinea] = useState(true);
  useEffect(() => {
    const actualizar = () => setEnLinea(navigator.onLine);
    actualizar();
    window.addEventListener('online', actualizar);
    window.addEventListener('offline', actualizar);
    return () => {
      window.removeEventListener('online', actualizar);
      window.removeEventListener('offline', actualizar);
    };
  }, []);
  return (
    <div className="s-pie" aria-live="polite">
      <span className="s-pie-estado" data-off={enLinea ? undefined : ''}>
        <i aria-hidden="true" />{enLinea ? 'En línea' : 'Sin conexión'}
      </span>
      <span className="s-pie-ver">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
    </div>
  );
}
