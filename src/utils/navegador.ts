/** "Safari 15.6 · iPhone", "Chrome 129 · Windows"… lo justo para ubicar el problema. */
export function navegadorDe(ua: string | null): string {
  if (!ua) return 'Desconocido'
  const so = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : ''
  const m = ua.match(/Edg\/(\d+)/) ? `Edge ${ua.match(/Edg\/(\d+)/)![1]}`
    : ua.match(/(?:Chrome|CriOS)\/(\d+)/) ? `Chrome ${ua.match(/(?:Chrome|CriOS)\/(\d+)/)![1]}`
    : ua.match(/(?:Firefox|FxiOS)\/(\d+)/) ? `Firefox ${ua.match(/(?:Firefox|FxiOS)\/(\d+)/)![1]}`
    : ua.match(/Version\/([\d.]+).*Safari/) ? `Safari ${ua.match(/Version\/([\d.]+)/)![1]}`
    : 'Otro'
  return so ? `${m} · ${so}` : m
}
