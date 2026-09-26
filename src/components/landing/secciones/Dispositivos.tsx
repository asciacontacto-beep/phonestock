import type { ReactNode } from 'react'
import s from '../landing.module.css'

/*
  Los dispositivos y lo que muestran, hechos en código y no con capturas:
  se ven nítidos en cualquier pantalla, pesan casi nada y los datos de
  ejemplo son siempre los mismos en toda la página (el iPhone 15 Pro de
  U$ 980 es el mismo en la portada, en el bento y en la vidriera).
*/

export function Notebook({ children }: { children: ReactNode }) {
  return (
    <div className={s.notebook} aria-hidden>
      <div className={s.notebookTapa}>
        <span className={s.notebookCamara} />
        <div className={s.notebookPantalla}>{children}</div>
      </div>
      <div className={s.notebookBase} />
    </div>
  )
}

export function IPhone({ children }: { children: ReactNode }) {
  return (
    <div className={s.iphone} aria-hidden>
      <div className={s.iphonePantalla}>
        <span className={s.iphoneIsla} />
        {children}
      </div>
    </div>
  )
}

export const EQUIPOS = [
  { modelo: 'iPhone 15 Pro', detalle: '256GB · Titanio natural', precio: 'U$ 980', estado: 'Disponible' },
  { modelo: 'iPhone 14', detalle: '128GB · Azul', precio: 'U$ 610', estado: 'Disponible' },
  { modelo: 'Galaxy S24', detalle: '256GB · Negro', precio: 'U$ 780', estado: 'En reparación' },
  { modelo: 'Moto G15', detalle: '128GB · Gris', precio: '$ 280.000', estado: 'Disponible' },
]

export function PantallaInventario() {
  return (
    <div className={s.app}>
      <div className={s.appCel}>
        <p className={s.appTitulo}>Inventario</p>
        <div className={s.appBuscar}>Buscar modelo o IMEI</div>
        {EQUIPOS.map(e => (
          <div className={s.appFila} key={e.modelo}>
            <div>
              <div className={s.appModelo}>{e.modelo}</div>
              <div className={s.appDetalle}>{e.detalle}</div>
            </div>
            <div className={s.appPrecio}>
              {e.precio}
              <br />
              <span className={`${s.chip} ${e.estado === 'Disponible' ? s.chipVerde : s.chipGris}`}>{e.estado}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const BARRAS = [38, 52, 44, 61, 57, 72, 66, 80, 74, 92]

export function PantallaPanel() {
  return (
    <div className={s.app}>
      <div className={s.appPanel}>
        <div className={s.appLateral}>
          <div className={s.appLateralMarca}>Stackr</div>
          {['Panel', 'Vender', 'Inventario', 'Clientes', 'Reparaciones', 'Caja'].map((item, i) => (
            <div key={item} className={`${s.appLateralItem} ${i === 0 ? s.appLateralActivo : ''}`}>{item}</div>
          ))}
        </div>
        <div className={s.appCuerpo}>
          <div style={{ fontWeight: 700, fontSize: '1.9em', letterSpacing: '-0.03em' }}>Septiembre</div>
          <div className={s.appKpis}>
            <div className={s.appKpi}>
              <div className={s.appKpiLabel}>Facturado</div>
              <div className={s.appKpiValor}>U$ 48.250</div>
            </div>
            <div className={s.appKpi}>
              <div className={s.appKpiLabel}>Ganancia real</div>
              <div className={s.appKpiValor} style={{ color: 'var(--verde)' }}>U$ 9.870</div>
            </div>
            <div className={s.appKpi}>
              <div className={s.appKpiLabel}>Equipos vendidos</div>
              <div className={s.appKpiValor}>63</div>
            </div>
          </div>
          <div className={s.appBarras}>
            {BARRAS.map((h, i) => (
              <div key={i} className={`${s.appBarra} ${i === BARRAS.length - 1 ? s.appBarraFuerte : ''}`} style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className={s.appTabla}>
            <div className={`${s.appTablaFila} ${s.appTablaCab}`}><span>Equipo</span><span>Costo</span><span>Venta</span><span>Deja</span></div>
            <div className={s.appTablaFila}><span>iPhone 15 Pro Max 512</span><span>U$ 1.180</span><span>U$ 1.430</span><span style={{ color: 'var(--verde)', fontWeight: 600 }}>U$ 250</span></div>
            <div className={s.appTablaFila}><span>iPhone 14 Pro 256</span><span>U$ 720</span><span>U$ 910</span><span style={{ color: 'var(--verde)', fontWeight: 600 }}>U$ 190</span></div>
            <div className={s.appTablaFila}><span>iPhone 13 128</span><span>U$ 475</span><span>U$ 620</span><span style={{ color: 'var(--verde)', fontWeight: 600 }}>U$ 145</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Pantallas del explorador de funciones ─────────────────────────── */

/** Barra de pestañas de la app, abajo de la pantalla del celular. */
export function BarraApp({ activa }: { activa: string }) {
  const tabs = [
    { id: 'stock', t: 'Stock' }, { id: 'ventas', t: 'Vender' }, { id: 'cuotas', t: 'Clientes' },
    { id: 'taller', t: 'Taller' }, { id: 'caja', t: 'Caja' },
  ]
  return (
    <div className={s.appTabs}>
      {tabs.map(x => (
        <span key={x.id} className={x.id === activa ? s.appTabActiva : undefined}>
          <i />{x.t}
        </span>
      ))}
    </div>
  )
}

function Cabecera({ titulo, sub }: { titulo: string; sub?: string }) {
  return (
    <>
      <p className={s.appTitulo}>{titulo}</p>
      {sub && <div className={s.appDetalle} style={{ marginTop: '-0.4em', marginBottom: '0.8em', fontSize: '0.8em' }}>{sub}</div>}
    </>
  )
}

function Fila({ a, b, sub, fuerte }: { a: ReactNode; b: ReactNode; sub?: string; fuerte?: boolean }) {
  const color = fuerte ? { color: 'var(--verde)' } : undefined
  return (
    <div className={s.appFila}>
      <div>
        <div className={s.appModelo} style={color}>{a}</div>
        {sub && <div className={s.appDetalle}>{sub}</div>}
      </div>
      <div className={s.appPrecio} style={color}>{b}</div>
    </div>
  )
}

function BotonApp({ children }: { children: ReactNode }) {
  return <div className={s.appBoton}>{children}</div>
}

export function PantallaVenta() {
  return (
    <div className={s.app}><div className={s.appCel}>
      <Cabecera titulo="Nueva venta" sub="iPhone 15 Pro · 256GB · IMEI ···3421" />
      <Fila a="Precio" b="U$ 980" />
      <Fila a="Efectivo" b="U$ 500" sub="En pesos, al dólar del día" />
      <Fila a="Canje iPhone 12" b="U$ 280" sub="Entra al stock como usado" />
      <Fila a="Tarjeta · 3 cuotas" b="U$ 200" sub="Con el recargo del plan" />
      <Fila a="Te queda" b="U$ 250" fuerte />
      <BotonApp>Confirmar venta</BotonApp>
    </div></div>
  )
}

export function PantallaCuotas() {
  return (
    <div className={s.app}><div className={s.appCel}>
      <Cabecera titulo="Martín G." sub="Debe U$ 380 · plan en 3 cuotas" />
      <Fila a="Cuota 1 de 3" b={<span className={`${s.chip} ${s.chipVerde}`}>Pagada</span>} sub="18/09 · U$ 190" />
      <Fila a="Cuota 2 de 3" b={<span className={`${s.chip} ${s.chipGris}`}>Vence en 4 días</span>} sub="18/10 · U$ 190" />
      <Fila a="Cuota 3 de 3" b={<span className={`${s.chip} ${s.chipGris}`}>Pendiente</span>} sub="18/11 · U$ 190" />
      <BotonApp>Registrar cobro</BotonApp>
    </div></div>
  )
}

export function PantallaTaller() {
  return (
    <div className={s.app}><div className={s.appCel}>
      <Cabecera titulo="Orden #1024" sub="Samsung A54 · Cambio de módulo" />
      <div style={{ display: 'flex', gap: '0.35em', margin: '0.2em 0 0.9em' }}>
        {['Recibido', 'En reparación', 'Listo'].map((e, i) => (
          <span key={e} className={`${s.chip} ${i < 2 ? s.chipVerde : s.chipGris}`}>{e}</span>
        ))}
      </div>
      <Fila a="Módulo A54 original" b="U$ 62" sub="Repuesto · sale del stock" />
      <Fila a="Mano de obra" b="$ 35.000" />
      <Fila a="Presupuesto" b="$ 128.000" sub="Aprobado por WhatsApp" />
      <BotonApp>Avisar que está listo</BotonApp>
    </div></div>
  )
}

export function PantallaCaja() {
  return (
    <div className={s.app}><div className={s.appCel}>
      <Cabecera titulo="Cierre de caja" sub="Turno tarde · Sucursal Centro" />
      <Fila a="Efectivo" b="$ 1.240.000" />
      <Fila a="Transferencias" b="$ 880.000" />
      <Fila a="Dólares" b="U$ 1.150" />
      <Fila a="Gastos del turno" b="− $ 45.000" sub="Envíos y limpieza" />
      <Fila a="Diferencia" b="$ 0" fuerte />
      <BotonApp>Cerrar turno</BotonApp>
    </div></div>
  )
}

export function PantallaCatalogo() {
  const fichas = [
    { m: 'iPhone 15 Pro', p: 'U$ 980', f: 'linear-gradient(150deg, #d9d6cf, #a8a39a)' },
    { m: 'Galaxy S24', p: 'U$ 780', f: 'linear-gradient(150deg, #4a4d55, #1d1f24)' },
    { m: 'iPhone 14', p: 'U$ 610', f: 'linear-gradient(150deg, #b9cde3, #7d9bbd)' },
    { m: 'Moto G15', p: '$ 280.000', f: 'linear-gradient(150deg, #c9ced6, #8a93a0)' },
  ]
  return (
    <div className={s.app}><div className={s.appCel}>
      <Cabecera titulo="Tu local" sub="stackrarg.vercel.app/c/tu-local" />
      <div className={s.appFichas}>
        {fichas.map(x => (
          <div key={x.m} className={s.appFicha}>
            <div className={s.appFichaFoto} style={{ background: x.f }} />
            <div className={s.appModelo} style={{ fontSize: '0.72em' }}>{x.m}</div>
            <div className={s.appFichaPrecio}>{x.p}</div>
            <div className={s.appFichaBoton}>Consultar</div>
          </div>
        ))}
      </div>
    </div></div>
  )
}
