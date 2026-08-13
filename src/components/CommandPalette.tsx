"use client"
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, LayoutDashboard, BarChart3, Package, Headphones, Warehouse, ScanLine,
  ShoppingCart, FileText, Receipt, Wrench, CalendarDays, CreditCard, Wallet,
  Users2, ShoppingBag, Truck, User as UserIcon, Settings, CornerDownLeft,
} from 'lucide-react';

type Cmd = {
  id: string;
  label: string;
  hint?: string;
  route: string;
  icon: React.ReactNode;
  keywords?: string;
};

/** Comandos para owner/admin. Los vendedores ven un subconjunto. */
const ALL_COMMANDS: Cmd[] = [
  { id: 'sell',        label: 'Nueva operación',   hint: 'Vender / canje',       route: '/sell',        icon: <ShoppingCart size={16} />, keywords: 'venta vender nueva operacion canje' },
  { id: 'scan',        label: 'Ingresar equipo',   hint: 'Cargar al stock',      route: '/scan',        icon: <ScanLine size={16} />,     keywords: 'cargar ingresar ean escanear equipo alta' },
  { id: 'dashboard',   label: 'Resumen',           hint: 'Dashboard',            route: '/dashboard',   icon: <LayoutDashboard size={16} />, keywords: 'inicio home resumen dashboard' },
  { id: 'reports',     label: 'Rentabilidad',      hint: 'Reportes',             route: '/reports',     icon: <BarChart3 size={16} />,    keywords: 'reportes rentabilidad ganancia margen analytics' },
  { id: 'stock',       label: 'Inventario',        hint: 'Ver stock',            route: '/stock',       icon: <Package size={16} />,      keywords: 'stock inventario equipos' },
  { id: 'accessories', label: 'Accesorios',        route: '/accessories', icon: <Headphones size={16} />, keywords: 'accesorios fundas cargadores' },
  { id: 'deposits',    label: 'Depósitos',         route: '/deposits',    icon: <Warehouse size={16} />,  keywords: 'depositos sucursales' },
  { id: 'sales',       label: 'Historial de ventas', route: '/sales',     icon: <FileText size={16} />,   keywords: 'ventas historial operaciones facturas' },
  { id: 'recibos',     label: 'Recibos',           route: '/recibos',     icon: <Receipt size={16} />,    keywords: 'recibo comprobante factura' },
  { id: 'repairs',     label: 'Servicio técnico',  hint: 'Reparaciones',  route: '/repairs',     icon: <Wrench size={16} />,     keywords: 'reparaciones servicio tecnico arreglos' },
  { id: 'turnos',      label: 'Turnos',            route: '/turnos',      icon: <CalendarDays size={16} />, keywords: 'turnos agenda citas' },
  { id: 'cashiers',    label: 'Cajas',             route: '/cashiers',    icon: <CreditCard size={16} />, keywords: 'cajas caja arqueo' },
  { id: 'expenses',    label: 'Gastos',            route: '/expenses',    icon: <Wallet size={16} />,     keywords: 'gastos egresos' },
  { id: 'customers',   label: 'Clientes',          route: '/customers',   icon: <Users2 size={16} />,     keywords: 'clientes contactos' },
  { id: 'mayoristas',  label: 'Mayoristas',        route: '/mayoristas',  icon: <ShoppingBag size={16} />, keywords: 'mayoristas mayorista' },
  { id: 'suppliers',   label: 'Proveedores',       route: '/suppliers',   icon: <Truck size={16} />,      keywords: 'proveedores compras' },
  { id: 'users',       label: 'Usuarios',          route: '/users',       icon: <UserIcon size={16} />,   keywords: 'usuarios empleados equipo permisos' },
  { id: 'settings',    label: 'Configuración',     route: '/settings',    icon: <Settings size={16} />,   keywords: 'configuracion ajustes settings negocio' },
];

/** Rutas que ve un vendedor (mismo criterio que el sidebar). */
const SELLER_IDS = new Set(['dashboard', 'sell', 'stock', 'scan', 'repairs']);

export function CommandPalette({ role }: { role?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo(
    () => (role === 'seller' ? ALL_COMMANDS.filter(c => SELLER_IDS.has(c.id)) : ALL_COMMANDS),
    [role],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      (c.hint || '').toLowerCase().includes(q) ||
      (c.keywords || '').includes(q),
    );
  }, [query, commands]);

  // Abrir/cerrar con ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    // También se puede abrir desde un botón (Topbar) vía evento custom.
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-command-palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-command-palette', onOpen);
    };
  }, []);

  // Al abrir: limpiar y enfocar
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // foco en el próximo tick, cuando el input ya está montado
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  if (!open) return null;

  const go = (cmd?: Cmd) => {
    const target = cmd || results[active];
    if (!target) return;
    setOpen(false);
    router.push(target.route);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(a => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(a => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go();
    }
  };

  return (
    <div className="cmdk-overlay" onMouseDown={() => setOpen(false)}>
      <div className="cmdk" onMouseDown={e => e.stopPropagation()} role="dialog" aria-label="Buscar o navegar">
        <div className="cmdk-input-row">
          <Search size={17} className="cmdk-search-icon" />
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder="Buscar o navegar…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd className="cmdk-esc">ESC</kbd>
        </div>

        <div className="cmdk-list" ref={listRef}>
          {results.length === 0 ? (
            <div className="cmdk-empty">Sin resultados para “{query}”</div>
          ) : (
            results.map((c, i) => (
              <button
                key={c.id}
                className={`cmdk-item${i === active ? ' active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(c)}
              >
                <span className="cmdk-item-icon">{c.icon}</span>
                <span className="cmdk-item-label">{c.label}</span>
                {c.hint && <span className="cmdk-item-hint">{c.hint}</span>}
                {i === active && <CornerDownLeft size={14} className="cmdk-item-enter" />}
              </button>
            ))
          )}
        </div>

        <div className="cmdk-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
          <span><kbd>↵</kbd> abrir</span>
          <span><kbd>⌘</kbd><kbd>K</kbd> abrir/cerrar</span>
        </div>
      </div>
    </div>
  );
}
