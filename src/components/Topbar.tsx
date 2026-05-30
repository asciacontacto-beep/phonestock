import { Menu } from 'lucide-react';

interface TopbarProps {
  page: string;
  user: any;
  onMenu: () => void;
}

export function Topbar({ page, user, onMenu }: TopbarProps) {
  const TITLES: Record<string, string> = {
    dashboard: 'Panel de Control',
    '': 'Panel de Control',
    stock: 'Inventario Global',
    scan: 'Carga por Escáner',
    sales: 'Ventas y Facturas',
    sell: 'Nueva Operación de Venta',
    cashiers: 'Control de Cajas',
    cashier_me: 'Mi Terminal de Caja',
    users: 'Gestión de Usuarios',
    settings: 'Configuración'
  };

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
      <div className="badge b-green" style={{ display: 'none' }}>En Línea</div>
    </div>
  );
}
