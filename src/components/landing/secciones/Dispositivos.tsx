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
