"use client"
import { useRouter } from 'next/navigation'
import { Check, ArrowRight, Package, ShoppingCart, TrendingUp } from 'lucide-react'

/**
 * Los primeros pasos, en el tablero, mientras el negocio está vacío.
 *
 * Un local que entra por primera vez ve todos los indicadores en cero: cero
 * facturado, cero ganancia, cero equipos. Un tablero en cero no se lee como
 * "todavía no cargaste nada", se lee como "esto no funciona" — y es el peor
 * momento para que lo piense, porque es el único rato que le va a dedicar
 * antes de decidir si sigue.
 *
 * Desaparece solo: cuando hay stock y ventas, no se muestra más.
 */
export function PrimerosPasos({
  tieneStock, tieneVentas,
}: {
  tieneStock: boolean
  tieneVentas: boolean
}) {
  const router = useRouter()

  const pasos = [
    {
      hecho: tieneStock,
      icon: <Package size={16} />,
      titulo: 'Cargá tu inventario',
      texto: 'Escaneá el código de barras o escribí marca, modelo y precio. Con el costo cargado, el sistema puede decirte la ganancia real.',
      accion: 'Cargar equipos',
      ir: '/stock',
    },
    {
      hecho: tieneVentas,
      icon: <ShoppingCart size={16} />,
      titulo: 'Hacé tu primera venta',
      texto: 'Elegí el equipo, cobrá como cobrás siempre —efectivo, transferencia, tarjeta, en cuotas— y el stock se descuenta solo.',
      accion: 'Ir a vender',
      ir: '/sell',
    },
    {
      hecho: tieneStock && tieneVentas,
      icon: <TrendingUp size={16} />,
      titulo: 'Mirá lo que te quedó',
      texto: 'Acá mismo vas a ver cuánto facturaste, cuánto ganaste de verdad y qué equipo te deja más.',
      accion: null,
      ir: null,
    },
  ]

  const listos = pasos.filter(p => p.hecho).length

  return (
    <div className="panel" style={{ marginBottom: 18 }}>
      <div className="panel-head">
        <span className="panel-title">Empezá por acá</span>
        <span className="panel-count">({listos} de {pasos.length})</span>
      </div>

      <div style={{ padding: '4px 0' }}>
        {pasos.map((p, i) => (
          <div
            key={p.titulo}
            style={{
              display: 'flex', gap: 14, alignItems: 'flex-start',
              padding: '16px 18px',
              borderTop: i > 0 ? '1px solid var(--border)' : 'none',
              opacity: p.hecho ? 0.55 : 1,
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              display: 'grid', placeItems: 'center',
              background: p.hecho ? 'var(--green-dim)' : 'var(--surface-3)',
              color: p.hecho ? 'var(--green)' : 'var(--text-3)',
            }}>
              {p.hecho ? <Check size={16} /> : p.icon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 600, fontSize: 14, marginBottom: 3,
                textDecoration: p.hecho ? 'line-through' : 'none',
              }}>
                {p.titulo}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.55 }}>{p.texto}</div>
            </div>

            {!p.hecho && p.ir && (
              <button
                className="btn btn-dark"
                style={{ flexShrink: 0, padding: '7px 13px', fontSize: 12.5 }}
                onClick={() => router.push(p.ir!)}
              >
                {p.accion} <ArrowRight size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
