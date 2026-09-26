"use client"
import { useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import s from '../landing.module.css'
import ScrollVelocity from '../reactbits/ScrollVelocity'
import RubberSegment from '../reactbits/RubberSegment'
import { useMenosMovimiento } from '../preferencias'
import {
  IPhone, BarraApp, PantallaInventario, PantallaVenta, PantallaCuotas, PantallaTaller, PantallaCaja, PantallaCatalogo,
} from './Dispositivos'

/*
  Funciones, sin la grilla de tarjetas con ícono (la marca de las páginas
  hechas con IA). Arriba una franja de texto que corre con el scroll; abajo
  un explorador: elegís una función y el celular muestra esa pantalla del
  sistema. Se muestra el producto en vez de describirlo.
*/

type Funcion = { value: string; label: string; titulo: string; texto: string; puntos: string[]; pantalla: ReactNode }

const FUNCIONES: Funcion[] = [
  {
    value: 'stock', label: 'Stock', titulo: 'Cada equipo, con nombre y apellido.',
    texto: 'IMEI, costo, precio y estado de cada equipo. Cuando lo vendés, sale del stock solo.',
    puntos: ['Carga con lector de código de barras', 'Nuevos, usados y en reparación', 'Buscás por modelo o por IMEI'],
    pantalla: <PantallaInventario />,
  },
  {
    value: 'ventas', label: 'Ventas', titulo: 'Cobrás como te paguen.',
    texto: 'Efectivo, transferencia, tarjeta, dólares o un equipo en parte de pago. Todo en la misma venta.',
    puntos: ['Canje que entra solo al stock', 'Recargo de cada plan de tarjeta', 'Ticket para imprimir o mandar'],
    pantalla: <PantallaVenta />,
  },
  {
    value: 'cuotas', label: 'Cuotas', titulo: 'Quién te debe, con fecha.',
    texto: 'Ventas en cuotas con sus vencimientos y la cuenta corriente de cada cliente.',
    puntos: ['Aviso de cuotas por vencer', 'Los cobros entran a la caja', 'Saldo en pesos y en dólares'],
    pantalla: <PantallaCuotas />,
  },
  {
    value: 'taller', label: 'Taller', titulo: 'El servicio técnico, ordenado.',
    texto: 'Órdenes de reparación con estado, repuestos y presupuesto. De tus equipos y de los de tus clientes.',
    puntos: ['Repuestos que se descuentan del stock', 'Orden impresa para el cliente', 'Avisás por WhatsApp cuando está listo'],
    pantalla: <PantallaTaller />,
  },
  {
    value: 'caja', label: 'Caja', titulo: 'La caja cierra. O te dice por qué.',
    texto: 'Arqueo por turno y por vendedor. Cada peso tiene un motivo: una venta, un cobro, un gasto.',
    puntos: ['Pesos, transferencias y dólares', 'Gastos del turno', 'Historial de cierres'],
    pantalla: <PantallaCaja />,
  },
  {
    value: 'catalogo', label: 'Catálogo', titulo: 'Tu vidriera, en un link.',
    texto: 'Los equipos que elijas, con fotos y precio, listos para la bio de Instagram.',
    puntos: ['Hasta 3 fotos por equipo', 'Botón de WhatsApp con el equipo elegido', 'Lo vendido desaparece solo'],
    pantalla: <PantallaCatalogo />,
  },
]

export function Funciones() {
  const quieto = useMenosMovimiento()
  const [actual, setActual] = useState(FUNCIONES[0].value)
  const f = FUNCIONES.find(x => x.value === actual) ?? FUNCIONES[0]

  return (
    <section className={s.seccion} id="funciones">
      {quieto ? (
        <p className={s.velocidadQuieta}>Stock con IMEI · Ventas en cuotas · Cuenta corriente · Taller · Caja · Catálogo</p>
      ) : (
        <div className={s.velocidad} aria-hidden>
          <ScrollVelocity
            texts={['Stock con IMEI · Ventas en cuotas · Cuenta corriente · ', 'Reparaciones · Caja por turno · Catálogo con fotos · ']}
            velocity={45}
            className={s.velocidadTexto}
            numCopies={4}
          />
        </div>
      )}

      <div className={s.ancho}>
        <div className={s.centro} style={{ marginTop: 72 }}>
          <span className={s.etiqueta}>Funciones</span>
          <h2 className={s.h2}>Todo el local, <em>en tu mano.</em></h2>
        </div>

        <div className={s.selector}>
          <RubberSegment
            items={FUNCIONES.map(x => ({ value: x.value, label: x.label }))}
            value={actual}
            onChange={v => setActual(v)}
            size="md"
            trackColor="#ffffff"
            thumbColor="#0a2540"
            textColor="#425466"
            activeTextColor="#ffffff"
            aria-label="Elegí una función"
          />
        </div>

        <div className={s.explorador}>
          <div key={f.value} className={s.exploradorTexto}>
            <h3 className={s.exploradorTitulo}>{f.titulo}</h3>
            <p className={s.parrafo}>{f.texto}</p>
            <ul className={s.checks}>
              {f.puntos.map(p => (
                <li key={p}><span className={s.checkIcono}><Check size={14} strokeWidth={3} /></span>{p}</li>
              ))}
            </ul>
          </div>
          <div className={s.exploradorCelular} aria-hidden>
            <div className={s.exploradorBrillo} />
            <IPhone>
              <div key={f.value} className={s.pantallaEntra}>{f.pantalla}</div>
              <BarraApp activa={f.value === 'catalogo' ? 'stock' : f.value} />
            </IPhone>
          </div>
        </div>
      </div>
    </section>
  )
}
