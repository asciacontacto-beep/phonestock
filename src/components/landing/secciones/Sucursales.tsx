"use client"
import { Check } from 'lucide-react'
import s from '../landing.module.css'

const LOCALES = [
  { nombre: 'Centro', equipos: 24, hoy: '$ 1.240.000', clase: s.local1 },
  { nombre: 'Güemes', equipos: 17, hoy: '$ 860.000', clase: s.local2 },
  { nombre: 'Depósito', equipos: 41, hoy: '—', clase: s.local3 },
]

export function Sucursales() {
  return (
    <section className={`${s.seccion} ${s.seccionBlanca}`} id="sucursales">
      <div className={`${s.ancho} ${s.dosColumnas}`}>
        <div>
          <span className={s.etiqueta}>Sucursales</span>
          <h2 className={s.h2}>Varios locales. <em>Un solo sistema.</em></h2>
          <p className={s.parrafo}>
            Cada sucursal con su stock, su caja y sus vendedores. Vos lo ves todo junto desde el mismo panel.
          </p>
          <ul className={s.checks}>
            {[
              'Stock separado por local o depósito',
              'Transferencias de equipos que quedan registradas',
              'Vendedores asignados a cada sucursal',
              'Gastos y caja de cada local por separado',
              'Sin costo extra por sucursal',
            ].map(t => (
              <li key={t}><span className={s.checkIcono}><Check size={14} strokeWidth={3} /></span>{t}</li>
            ))}
          </ul>
        </div>

        <div className={s.mapa} aria-hidden>
          <svg className={s.enlaces} viewBox="0 0 500 420" preserveAspectRatio="none">
            <defs>
              <linearGradient id="degradadoEnlace" x1="0" x2="1">
                <stop offset="0" stopColor="#00a37a" /><stop offset="1" stopColor="#7b61ff" />
              </linearGradient>
            </defs>
            <path d="M150 90 C 260 100, 300 170, 360 200" />
            <path d="M120 130 C 110 230, 140 290, 160 330" />
            <path d="M380 260 C 330 320, 270 350, 220 360" />
          </svg>
          {LOCALES.map(l => (
            <div key={l.nombre} className={`${s.local} ${l.clase}`}>
              <div className={s.localNombre}><span className={s.localPunto} />{l.nombre}</div>
              <div className={s.localDato}><span>Equipos</span><b>{l.equipos}</b></div>
              <div className={s.localDato}><span>Vendido hoy</span><b>{l.hoy}</b></div>
            </div>
          ))}
          <div className={s.traspaso}>iPhone 14 → Güemes</div>
        </div>
      </div>
    </section>
  )
}
