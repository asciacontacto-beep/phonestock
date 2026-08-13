"use client"

/**
 * Sparkline dibujado a mano en SVG.
 *
 * El dashboard ya no carga recharts, y traerlo de vuelta por una línea de
 * 30 puntos serían ~90kb. Esto son 30 líneas y cero dependencias.
 *
 * Muestra si el negocio viene subiendo o cayendo, que es la única pregunta
 * que un número solo no puede responder.
 */
export function Sparkline({
  data,
  color = 'var(--green)',
  height = 56,
}: {
  data: number[]
  color?: string
  height?: number
}) {
  const pts = data.filter(n => Number.isFinite(n))
  if (pts.length < 2) return null

  const min = Math.min(...pts, 0)
  const max = Math.max(...pts, 0)
  const span = max - min || 1

  // viewBox fijo + preserveAspectRatio="none": la curva se estira al ancho
  // disponible sin recalcular nada en JS al cambiar el tamaño.
  const W = 100
  const H = 30
  const x = (i: number) => (i / (pts.length - 1)) * W
  const y = (v: number) => H - ((v - min) / span) * H

  const line = pts.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ')
  const area = `0,${H} ${line} ${W},${H}`

  const gradId = `spark-${color.replace(/[^a-z]/gi, '')}`
  const lastX = x(pts.length - 1)
  const lastY = y(pts[pts.length - 1])

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block', overflow: 'visible' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      <polygon points={area} fill={`url(#${gradId})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r="2.4" fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
