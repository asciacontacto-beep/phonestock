/** Skeleton con la forma de Rentabilidad: encabezado, tarjetas de totales y gráficos. */
export default function ReportsLoading() {
  return (
    <div className="page" aria-busy="true" aria-label="Cargando la rentabilidad">
      <div className="sh" style={{ marginBottom: 22 }}>
        <div>
          <div className="skeleton" style={{ width: 160, height: 24, borderRadius: 8 }} />
          <div className="skeleton" style={{ width: 230, height: 13, borderRadius: 4, marginTop: 10 }} />
        </div>
        <div className="skeleton" style={{ width: 220, height: 34, borderRadius: 20 }} />
      </div>

      {/* Tarjetas de totales */}
      <div className="sg" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 16 }}>
        {[0, 1, 2, 3].map(i => (
          <div className="sc" key={i}>
            <div className="skeleton" style={{ width: 70, height: 11, borderRadius: 4, marginBottom: 12 }} />
            <div className="skeleton" style={{ width: 100, height: 24, borderRadius: 6 }} />
          </div>
        ))}
      </div>

      {/* Dos bloques de gráfico */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {[0, 1].map(i => (
          <div className="panel" key={i} style={{ padding: 18 }}>
            <div className="skeleton" style={{ width: 140, height: 13, borderRadius: 4, marginBottom: 18 }} />
            <div className="skeleton" style={{ width: '100%', height: 200, borderRadius: 10 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
