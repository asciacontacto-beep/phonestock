/** Skeleton con la forma del inventario: encabezado, filtros y grilla de equipos. */
export default function StockLoading() {
  return (
    <div className="page" aria-busy="true" aria-label="Cargando el inventario">
      <div className="sh" style={{ marginBottom: 22 }}>
        <div>
          <div className="skeleton" style={{ width: 150, height: 24, borderRadius: 8 }} />
          <div className="skeleton" style={{ width: 220, height: 13, borderRadius: 4, marginTop: 10 }} />
        </div>
        <div className="skeleton" style={{ width: 140, height: 38, borderRadius: 10 }} />
      </div>

      <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="skeleton" style={{ flex: 2, minWidth: 200, height: 40, borderRadius: 10 }} />
        <div className="skeleton" style={{ flex: 1, minWidth: 130, height: 40, borderRadius: 10 }} />
      </div>

      <div className="stock-grid">
        {Array.from({ length: 10 }).map((_, i) => (
          <div className="stock-card" key={i}>
            <div className="skeleton" style={{ width: '70%', height: 15, borderRadius: 5 }} />
            <div className="skeleton" style={{ width: '45%', height: 12, borderRadius: 4, marginTop: 10 }} />
            <div className="skeleton" style={{ width: '100%', height: 1, marginTop: 14, marginBottom: 14 }} />
            <div className="skeleton" style={{ width: '55%', height: 18, borderRadius: 6 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
