/**
 * Skeleton genérico para las pantallas de lista (stock, ventas, clientes,
 * gastos, accesorios, etc.). Reemplaza al spinner: dibuja la forma típica
 * —encabezado, filtros y filas— para que la espera se sienta más corta y la
 * página no "salte" al llegar los datos. Cada pantalla puede tener su propio
 * loading.tsx si su forma es distinta (ver stock/ y reports/).
 */
export default function Loading() {
  return (
    <div className="page" aria-busy="true" aria-label="Cargando">
      {/* Encabezado: título + acción */}
      <div className="sh" style={{ marginBottom: 22 }}>
        <div>
          <div className="skeleton" style={{ width: 180, height: 24, borderRadius: 8 }} />
          <div className="skeleton" style={{ width: 240, height: 13, borderRadius: 4, marginTop: 10 }} />
        </div>
        <div className="skeleton" style={{ width: 130, height: 38, borderRadius: 10 }} />
      </div>

      {/* Barra de filtros / búsqueda */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="skeleton" style={{ flex: 2, minWidth: 200, height: 40, borderRadius: 10 }} />
        <div className="skeleton" style={{ flex: 1, minWidth: 130, height: 40, borderRadius: 10 }} />
        <div className="skeleton" style={{ flex: 1, minWidth: 130, height: 40, borderRadius: 10 }} />
      </div>

      {/* Filas */}
      <div className="panel">
        <div className="panel-head">
          <div className="skeleton" style={{ width: 160, height: 13, borderRadius: 4 }} />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div className="panel-row" key={i} style={{ minHeight: 52 }}>
            <span className="skeleton skeleton-circle" style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0 }} />
            <div className="panel-main">
              <div className="skeleton" style={{ width: `${52 - (i % 4) * 7}%`, height: 13, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: `${34 - (i % 3) * 5}%`, height: 11, borderRadius: 4, marginTop: 7 }} />
            </div>
            <div className="skeleton" style={{ width: 70, height: 15, borderRadius: 5, flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
