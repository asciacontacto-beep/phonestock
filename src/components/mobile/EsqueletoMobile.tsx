/**
 * Lo que se ve en el celular mientras llega una pantalla: la misma forma
 * que va a tener (búsqueda, filtros, lista), así nada salta al cargar y la
 * espera se siente más corta. En la compu se usa el esqueleto de siempre.
 */
export function EsqueletoMobile({ tipo = 'lista' }: { tipo?: 'lista' | 'inicio' }) {
  return (
    <div className="page solo-mob" aria-busy="true" aria-label="Cargando">
      <div className="m-pantalla em">
        {tipo === 'inicio' ? (
          <>
            <div className="skeleton" style={{ width: 150, height: 14, borderRadius: 6, margin: '2px 4px 0' }} />
            <div className="m-card" style={{ height: 172 }}>
              <div className="skeleton" style={{ width: 90, height: 13, borderRadius: 5 }} />
              <div className="skeleton" style={{ width: '55%', height: 40, borderRadius: 10, marginTop: 14 }} />
              <div className="skeleton" style={{ width: '38%', height: 13, borderRadius: 5, marginTop: 14 }} />
            </div>
            <div className="m-grid2">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="m-card m-kpi" style={{ height: 96 }}>
                  <div className="skeleton" style={{ width: '50%', height: 12, borderRadius: 5 }} />
                  <div className="skeleton" style={{ width: '70%', height: 22, borderRadius: 7, marginTop: 12 }} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="skeleton" style={{ height: 48, borderRadius: 14 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              {[70, 84, 96].map((w, i) => <div key={i} className="skeleton" style={{ width: w, height: 36, borderRadius: 18 }} />)}
            </div>
          </>
        )}
        <div className="m-list">
          {Array.from({ length: tipo === 'inicio' ? 4 : 8 }).map((_, i) => (
            <div key={i} className="m-row">
              <div className="m-row-main">
                <div className="skeleton" style={{ width: `${62 - (i % 4) * 8}%`, height: 14, borderRadius: 5 }} />
                <div className="skeleton" style={{ width: `${40 - (i % 3) * 6}%`, height: 11, borderRadius: 5, marginTop: 8 }} />
              </div>
              <div className="skeleton" style={{ width: 72, height: 15, borderRadius: 6 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
