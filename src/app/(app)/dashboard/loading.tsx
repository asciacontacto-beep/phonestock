/**
 * Skeleton con la forma real del dashboard.
 *
 * Un spinner centrado no dice nada y hace que la página "salte" cuando
 * llegan los datos. Dibujar los bloques que van a aparecer hace que la
 * espera se sienta más corta y que nada se mueva de lugar al cargar.
 */
export default function DashboardLoading() {
  return (
    <div className="page" aria-busy="true" aria-label="Cargando el resumen">
      {/* Encabezado */}
      <div className="sh" style={{ marginBottom: 20 }}>
        <div className="skeleton" style={{ width: 130, height: 26, borderRadius: 8 }} />
        <div className="skeleton" style={{ width: 220, height: 32, borderRadius: 20 }} />
      </div>

      {/* Hero */}
      <div className="d-hero">
        <div className="skeleton" style={{ width: 110, height: 11, borderRadius: 4, marginBottom: 14 }} />
        <div className="skeleton" style={{ width: 200, height: 40, borderRadius: 10 }} />
        <div className="skeleton" style={{ width: 260, height: 13, borderRadius: 4, marginTop: 14 }} />
        <div className="skeleton" style={{ height: 8, borderRadius: 4, marginTop: 22 }} />
        <div className="d-legend">
          {[0, 1, 2].map(i => (
            <div key={i}>
              <div className="skeleton" style={{ width: 62, height: 11, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: 78, height: 16, borderRadius: 5, marginTop: 6 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Estado del negocio */}
      <div className="sg" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 14 }}>
        {[0, 1, 2, 3].map(i => (
          <div className="sc" key={i}>
            <div className="skeleton" style={{ width: 66, height: 11, borderRadius: 4, marginBottom: 12 }} />
            <div className="skeleton" style={{ width: 92, height: 24, borderRadius: 6 }} />
            <div className="skeleton" style={{ width: 108, height: 11, borderRadius: 4, marginTop: 8 }} />
          </div>
        ))}
      </div>

      {/* Un panel de filas */}
      <div className="panel">
        <div className="panel-head">
          <div className="skeleton" style={{ width: 150, height: 13, borderRadius: 4 }} />
        </div>
        {[0, 1, 2].map(i => (
          <div className="panel-row" key={i}>
            <span className="skeleton skeleton-circle" style={{ width: 7, height: 7 }} />
            <div className="panel-main">
              <div className="skeleton" style={{ width: `${58 - i * 9}%`, height: 13, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
