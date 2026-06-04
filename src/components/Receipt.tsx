export function Receipt({ sale, shop }: any) {
  const paid = (sale.payments || []).reduce((a: any, p: any) => a + p.amount, 0);
  
  return (
    <div className="receipt-view" style={{ color: '#000' }}>
      <div className="receipt-header" style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: -1 }}>{shop?.shop_name?.toUpperCase() || 'STACKR'}</div>
        {shop?.address && <div style={{ fontSize: 10, marginTop: 4 }}>{shop.address}</div>}
        <div style={{ fontSize: 10, display: 'flex', justifyContent: 'center', gap: 10, marginTop: 4 }}>
          {shop?.phone && <span>WA: {shop.phone}</span>}
          {shop?.instagram && <span>IG: {shop.instagram}</span>}
        </div>
      </div>
      <div className="receipt-row"><span>ORDEN:</span><span>#REC-{sale.id?.toString().slice(-6) || 'N/A'}</span></div>
      <div className="receipt-row"><span>ASESOR:</span><span>{sale.seller_name}</span></div>
      <div style={{ margin: '15px 0', borderBottom: '1px dashed #ccc' }} />
      <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 11 }}>CLIENTE</div>
      <div className="receipt-row"><span>Nombre:</span><span>{sale.customer?.name}</span></div>
      {sale.customer?.dni && <div className="receipt-row"><span>DNI:</span><span>{sale.customer?.dni}</span></div>}
      <div style={{ margin: '15px 0', borderBottom: '1px dashed #ccc' }} />
      <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 11 }}>PRODUCTO</div>
      <div style={{ fontSize: 12, marginBottom: 10, lineHeight: 1.4 }}>
        <strong>{sale.brand} {sale.model}</strong><br />
        <span style={{ fontSize: 11 }}>{sale.storage} · {sale.color}</span><br />
        <span style={{ fontSize: 10, opacity: 0.8 }}>IMEI/Serie: {sale.imei}</span>
      </div>
      <div style={{ margin: '15px 0', borderBottom: '1px dashed #ccc' }} />
      <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 11 }}>PAGOS</div>
      {sale.payments?.map((p: any, i: number) => (
        <div key={i} className="receipt-row" style={{ alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>{p.label || p.id}:</span>
            {p.exchange_rate && <span style={{ fontSize: 10, color: '#666' }}>({p.currency === 'USD' ? 'U$' : '$'} {p.original_amount.toLocaleString()} a cot. {p.exchange_rate})</span>}
          </div>
          <span>{sale.currency === 'USD' ? 'U$' : '$'} {p.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
      ))}
      <div style={{ marginTop: 20, padding: 12, background: '#f9f9f9', borderRadius: 4 }}>
        <div className="receipt-row" style={{ fontWeight: 'bold', fontSize: 14 }}>
          <span>TOTAL:</span>
          <span>{sale.currency === 'USD' ? 'U$' : '$'} {sale.price?.toLocaleString()}</span>
        </div>
        <div className="receipt-row" style={{ fontSize: 12, marginTop: 4 }}>
          <span>ABONADO:</span>
          <span>{sale.currency === 'USD' ? 'U$' : '$'} {paid.toLocaleString()}</span>
        </div>
      </div>
      
      {shop?.warranty_text && (
        <div style={{ marginTop: 24, fontSize: 9, color: '#444', textAlign: 'center', fontStyle: 'italic', lineHeight: 1.4, borderTop: '1px solid #eee', paddingTop: 12 }}>
          {shop.warranty_text}
        </div>
      )}
    </div>
  );
}
