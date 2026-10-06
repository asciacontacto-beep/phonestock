"use client"
/**
 * El marco de Stackr en el celular: encabezado compacto arriba, barra de
 * pestañas abajo y el resto de las secciones en "Más".
 *
 * En la compu nada de esto se ve (ver .solo-mob en globals.css): ahí
 * siguen el menú lateral y la barra superior de siempre.
 */
import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Receipt, Package, Users2, LayoutGrid, ShoppingCart, ScanLine, Wallet, Search,
  LogOut, MessageCircle, DollarSign, ChevronRight, Moon, Sun,
} from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { DUENO, VENDEDOR, SUPERADMIN } from '@/components/Sidebar'
import { pestanaDe, rutaDe } from '@/utils/secciones'
import { CLAVE_TEMA } from '@/components/BotonTema'

interface Usuario { name?: string; email?: string; role?: string; initials?: string; color?: string }

type Pestana = { id: string; label: string; icon: ReactNode; activaEn: string[] }

const PESTANAS_DUENO: Pestana[] = [
  { id: 'dashboard', label: 'Inicio', icon: <Home size={22} />, activaEn: ['dashboard', 'reports'] },
  { id: 'sales', label: 'Ventas', icon: <Receipt size={22} />, activaEn: ['sales', 'recibos', 'sell'] },
  { id: 'stock', label: 'Stock', icon: <Package size={22} />, activaEn: ['stock', 'accessories', 'deposits', 'scan'] },
  { id: 'customers', label: 'Clientes', icon: <Users2 size={22} />, activaEn: ['customers', 'mayoristas'] },
]

const PESTANAS_VENDEDOR: Pestana[] = [
  { id: 'dashboard', label: 'Inicio', icon: <Home size={22} />, activaEn: ['dashboard'] },
  { id: 'sell', label: 'Vender', icon: <ShoppingCart size={22} />, activaEn: ['sell'] },
  { id: 'stock', label: 'Stock', icon: <Package size={22} />, activaEn: ['stock'] },
  { id: 'cashier_me', label: 'Caja', icon: <Wallet size={22} />, activaEn: ['cashier_me'] },
]

const SOPORTE = '5492262559559'

function menuDe(u: Usuario | null, superadmin: boolean) {
  return superadmin ? SUPERADMIN : u?.role === 'owner' ? DUENO : VENDEDOR
}

/** El título de la pantalla actual, sacado del mismo menú que la compu. */
function tituloDe(pathname: string, u: Usuario | null, superadmin: boolean): string {
  const ruta = rutaDe(pathname)
  const p = pestanaDe(pathname)
  for (const s of menuDe(u, superadmin)) {
    const h = s.hijos.find(x => x.id === ruta) || s.hijos.find(x => x.id === p)
    if (h) return h.id === 'dashboard' ? 'Inicio' : h.id === 'sales' ? 'Ventas' : h.id === 'stock' ? 'Stock' : h.label
  }
  if (ruta === 'cashier_me') return 'Mi caja'
  return 'Stackr'
}

export function MobileHeader({ user, superadmin, onLogout }: { user: Usuario | null; superadmin: boolean; onLogout: () => void }) {
  const pathname = usePathname()
  const [cuenta, setCuenta] = useState(false)
  // Cada vez que se abre, la hoja se arma de nuevo y lee el tema de ese momento.
  const [vez, setVez] = useState(0)
  const esInicio = rutaDe(pathname) === 'dashboard' || rutaDe(pathname) === 'superadmin'
  const titulo = tituloDe(pathname, user, superadmin)
  const iniciales = user?.initials || (user?.name || 'S').slice(0, 2).toUpperCase()

  /* Mientras haya un modal abierto (los `.mo` de siempre), la barra de
     pestañas y el botón flotante se van. El modal es una hoja que llega
     hasta abajo y ahí están sus botones (Guardar, Crear, Confirmar): nada
     puede quedar encima de ellos. Se observa el DOM en vez de tocar cada
     modal, así vale también para los que se agreguen mañana. */
  useEffect(() => {
    const raiz = document.documentElement
    const mirar = () => raiz.toggleAttribute('data-m-modal', !!document.querySelector('.mo'))
    const obs = new MutationObserver(mirar)
    obs.observe(document.body, { childList: true, subtree: true })
    mirar()
    return () => { obs.disconnect(); raiz.removeAttribute('data-m-modal') }
  }, [])

  /* Al scrollear: el encabezado marca una línea cuando hay contenido debajo
     y el botón flotante se corre al bajar y vuelve al subir. Se escribe en
     atributos del documento, sin re-renderizar nada: el scroll queda libre. */
  useEffect(() => {
    const main = document.querySelector<HTMLElement>('.main')
    if (!main) return
    const raiz = document.documentElement
    let ultimo = main.scrollTop
    let pedido = 0
    const leer = () => {
      pedido = 0
      const y = main.scrollTop
      raiz.toggleAttribute('data-m-scroll', y > 4)
      if (Math.abs(y - ultimo) > 6) {
        raiz.toggleAttribute('data-m-bajando', y > ultimo && y > 80)
        ultimo = y
      }
    }
    const alScrollear = () => { if (!pedido) pedido = requestAnimationFrame(leer) }
    main.addEventListener('scroll', alScrollear, { passive: true })
    leer()
    return () => {
      main.removeEventListener('scroll', alScrollear)
      if (pedido) cancelAnimationFrame(pedido)
      raiz.removeAttribute('data-m-scroll')
      raiz.removeAttribute('data-m-bajando')
    }
  }, [pathname])

  return (
    <>
      <header className="mt-bar solo-mob">
        <div className="mt-izq">
          {esInicio ? (
            <span className="mt-marca">
              <svg width="18" height="18" viewBox="0 0 17 17" fill="none" aria-hidden>
                <rect y="1.5" width="17" height="3" rx="1.5" fill="currentColor" />
                <rect y="7" width="12" height="3" rx="1.5" fill="currentColor" opacity=".7" />
                <rect y="12.5" width="7" height="3" rx="1.5" fill="currentColor" opacity=".45" />
              </svg>
              Stackr
            </span>
          ) : (
            <h1 className="mt-titulo">{titulo}</h1>
          )}
        </div>
        <div className="mt-der">
          <button className="mt-btn" aria-label="Buscar" onClick={() => window.dispatchEvent(new Event('open-command-palette'))}>
            <Search size={20} />
          </button>
          <button className="mt-avatar" aria-label="Mi cuenta" onClick={() => { setVez(v => v + 1); setCuenta(true) }} style={{ background: user?.color || 'var(--text)' }}>
            {iniciales}
          </button>
        </div>
      </header>
      <HojaCuenta key={vez} open={cuenta} onClose={() => setCuenta(false)} user={user} onLogout={onLogout} />
    </>
  )
}

/** La cuenta: quién está, el dólar del día, tema, soporte y salir. */
function HojaCuenta({ open, onClose, user, onLogout }: { open: boolean; onClose: () => void; user: Usuario | null; onLogout: () => void }) {
  const [blue, setBlue] = useState<{ compra: number; venta: number } | null>(null)
  const [oscuro, setOscuro] = useState(() => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark')
  useEffect(() => {
    if (!open) return
    fetch('https://dolarapi.com/v1/dolares/blue').then(r => r.json())
      .then(d => setBlue({ compra: d.compra, venta: d.venta })).catch(() => {})
  }, [open])

  const cambiarTema = () => {
    const nuevo = oscuro ? 'light' : 'dark'
    document.documentElement.dataset.theme = nuevo
    try { localStorage.setItem(CLAVE_TEMA, nuevo) } catch { /* sin almacenamiento */ }
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])') || Object.assign(document.createElement('meta'), { name: 'theme-color' })
    meta.content = nuevo === 'dark' ? '#0b0c0d' : '#fbfbfa'
    if (!meta.parentNode) document.head.appendChild(meta)
    setOscuro(!oscuro)
  }

  const rol = user?.role === 'owner' ? 'Dueño' : user?.role === 'admin' ? 'Admin' : 'Vendedor'

  return (
    <BottomSheet open={open} onClose={onClose} label="Mi cuenta">
      <div className="mc-quien">
        <span className="mc-avatar" style={{ background: user?.color || 'var(--text)' }}>{user?.initials || (user?.name || 'S').slice(0, 2).toUpperCase()}</span>
        <div style={{ minWidth: 0 }}>
          <div className="mc-nombre">{user?.name || 'Mi cuenta'}</div>
          <div className="mc-mail">{user?.email} · {rol}</div>
        </div>
      </div>
      <div className="m-list">
        <div className="m-row">
          <span className="m-row-ico"><DollarSign size={18} /></span>
          <div className="m-row-main"><div className="m-row-t">Dólar blue</div><div className="m-row-s">{blue ? `Compra $${blue.compra.toLocaleString('es-AR')}` : 'Cargando…'}</div></div>
          <div className="m-row-num">{blue ? `$${blue.venta.toLocaleString('es-AR')}` : '—'}</div>
        </div>
        <button className="m-row" onClick={cambiarTema}>
          <span className="m-row-ico">{oscuro ? <Sun size={18} /> : <Moon size={18} />}</span>
          <div className="m-row-main"><div className="m-row-t">{oscuro ? 'Tema claro' : 'Tema oscuro'}</div></div>
          <span className={`m-switch ${oscuro ? 'on' : ''}`} aria-hidden="true"><i /></span>
        </button>
        <a className="m-row" href={`https://wa.me/${SOPORTE}?text=${encodeURIComponent('Hola! Necesito una mano con Stackr')}`} target="_blank" rel="noopener noreferrer">
          <span className="m-row-ico"><MessageCircle size={18} /></span>
          <div className="m-row-main"><div className="m-row-t">Soporte por WhatsApp</div><div className="m-row-s">Te respondemos ahí</div></div>
          <ChevronRight size={18} className="m-row-flecha" />
        </a>
      </div>
      <button className="m-row m-row-sola m-peligro" onClick={() => { onClose(); onLogout() }}>
        <span className="m-row-ico"><LogOut size={18} /></span>
        <div className="m-row-main"><div className="m-row-t">Cerrar sesión</div></div>
      </button>
      <div className="mc-ver">Stackr v{process.env.NEXT_PUBLIC_APP_VERSION}</div>
    </BottomSheet>
  )
}

export function TabBar({ user, superadmin }: { user: Usuario | null; superadmin: boolean }) {
  const pathname = usePathname()
  const [mas, setMas] = useState(false)
  // La pestaña tocada se marca en el acto, antes de que llegue la pantalla:
  // esperar a la navegación es lo que hace sentir lenta a una web.
  const [tocada, setTocada] = useState<string | null>(null)
  const ruta = rutaDe(pathname)
  const p = pestanaDe(pathname)
  // Hasta que llega el perfil no se sabe si es dueño o vendedor: la barra
  // espera vacía en vez de mostrar las pestañas equivocadas un instante.
  const pestanas = superadmin || !user ? [] : user.role === 'owner' ? PESTANAS_DUENO : PESTANAS_VENDEDOR
  const enRuta = pestanas.find(t => t.activaEn.includes(ruta) || t.activaEn.includes(p))?.id ?? (superadmin ? null : 'mas')
  const activa = mas ? 'mas' : (tocada ?? enRuta)

  // Al llegar a la pantalla nueva: se olvida el toque y la hoja se cierra.
  const [rutaVista, setRutaVista] = useState(pathname)
  if (rutaVista !== pathname) { setRutaVista(pathname); setMas(false); setTocada(null) }

  const ids = [...pestanas.map(t => t.id), 'mas']
  const indice = Math.max(0, ids.indexOf(activa || 'mas'))

  const tocar = (e: React.MouseEvent, id: string) => {
    if (id === enRuta && ruta === id) {
      // Tocar la pestaña en la que ya estás vuelve arriba, como en iOS.
      e.preventDefault()
      document.querySelector('.main')?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setTocada(id)
  }

  return (
    <>
      <nav className="mtab-bar solo-mob" aria-label="Secciones" style={{ '--n': ids.length, '--i': indice } as React.CSSProperties}>
        {pestanas.length > 0 && <span className="mtab-pildora" aria-hidden="true" />}
        {pestanas.map(t => (
          <Link key={t.id} href={`/${t.id}`} prefetch className={`mtab ${activa === t.id ? 'on' : ''}`}
            aria-current={enRuta === t.id ? 'page' : undefined} onClick={e => tocar(e, t.id)}>
            <span className="mtab-ico">{t.icon}</span>
            <span className="mtab-lbl">{t.label}</span>
          </Link>
        ))}
        {(user || superadmin) && <button className={`mtab ${activa === 'mas' ? 'on' : ''}`} onClick={() => setMas(true)} aria-haspopup="dialog">
          <span className="mtab-ico"><LayoutGrid size={22} /></span>
          <span className="mtab-lbl">Más</span>
        </button>}
      </nav>
      <HojaMas open={mas} onClose={() => setMas(false)} user={user} superadmin={superadmin} ocultas={pestanas.map(t => t.id)} />
    </>
  )
}

/** Todo lo que no está en la barra, agrupado como en la compu. */
function HojaMas({ open, onClose, user, superadmin, ocultas }: { open: boolean; onClose: () => void; user: Usuario | null; superadmin: boolean; ocultas: string[] }) {
  const pathname = usePathname()
  const actual = pestanaDe(pathname)
  const grupos = menuDe(user, superadmin)
    .map(s => ({ ...s, hijos: s.hijos.filter(h => !ocultas.includes(h.id) || h.id === 'scan') }))
    .filter(s => s.hijos.length > 0)

  return (
    <BottomSheet open={open} onClose={onClose} title="Más">
      {grupos.map(g => (
        <section key={g.label} className="mm-grupo">
          <div className="m-sec">{g.label}</div>
          <div className="m-list">
            {g.hijos.map(h => (
              <Link key={h.id} href={`/${h.id}`} prefetch className={`m-row mm-row ${actual === h.id ? 'on' : ''}`} onClick={onClose}>
                <span className="m-row-ico">{h.id === 'scan' ? <ScanLine size={18} /> : h.icon}</span>
                <div className="m-row-main"><div className="m-row-t">{h.label}</div></div>
                <ChevronRight size={18} className="m-row-flecha" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </BottomSheet>
  )
}
