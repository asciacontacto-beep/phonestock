import type { ReceiptConfig, ReceiptLine, ReceiptExtraField, ShopSettings } from '@/types/receipt';
import { DEFAULT_RECEIPT_CONFIG, normalizeReceiptConfig } from '@/types/receipt';

/* ── helpers ─────────────────────────────────────────── */
const money = (n: number, currency?: string) =>
  `${currency === 'USD' ? 'U$' : '$'} ${(Number(n) || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

const MONO = "'JetBrains Mono', monospace";

export interface ReceiptData {
  receiptNumber?: string;
  date?: string;
  seller?: string;
  client: { name?: string; dni?: string; phone?: string };
  lines: ReceiptLine[];
  paymentText?: string;
  payments?: { label: string; amount: number; note?: string }[];
  currency: string;
  total: number;
  paid?: number;
  warranty?: string;
  notes?: string;
  extraFields?: ReceiptExtraField[];
}

function businessContactLine(shop: ShopSettings): string[] {
  return [shop.address, shop.phone && `WA ${shop.phone}`, shop.instagram && `IG ${shop.instagram}`, shop.email, shop.website]
    .filter(Boolean) as string[];
}

/* ═══════════════════ TICKET (tira térmica angosta) ═══════════════════ */
function TicketReceipt({ shop, config: c, data }: { shop: ShopSettings; config: ReceiptConfig; data: ReceiptData }) {
  const accent = c.accent || '#111';
  const rule = <div style={{ margin: '11px 0', borderBottom: '1px dashed #cfcfcf' }} />;
  const title = (t: string) => <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', color: accent, marginBottom: 6, textTransform: 'uppercase' }}>{t}</div>;
  const kv = (k: string, v?: string | null) => v ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11.5, padding: '2px 0' }}>
      <span style={{ color: '#777' }}>{k}</span><span style={{ fontWeight: 500, textAlign: 'right' }}>{v}</span>
    </div>
  ) : null;

  return (
    <div className="receipt-view" style={{ width: 300, maxWidth: '100%', margin: '0 auto', padding: 20, background: '#fff', color: '#111', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        {c.showLogo && shop.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shop.logo_url} alt="logo" style={{ maxHeight: 48, maxWidth: '65%', objectFit: 'contain', marginBottom: 8 }} />
        )}
        {c.headerNote && <div style={{ fontSize: 8.5, letterSpacing: '0.18em', color: '#999', marginBottom: 3 }}>{c.headerNote}</div>}
        <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.03em' }}>{(shop.shop_name || 'STACKR').toUpperCase()}</div>
        {c.showBusinessDetails && (
          <div style={{ fontSize: 9.5, color: '#666', marginTop: 5, lineHeight: 1.5 }}>
            {businessContactLine(shop).map((l, i) => <div key={i}>{l}</div>)}
            {c.showCuit && shop.cuit && <div>CUIT {shop.cuit}</div>}
          </div>
        )}
      </div>
      <div style={{ height: 2, background: accent, borderRadius: 2 }} />
      <div style={{ marginTop: 10 }}>
        {kv('Comprobante', data.receiptNumber)}
        {kv('Fecha', data.date)}
        {c.showSeller && kv('Asesor', data.seller)}
        {(data.extraFields || []).map(f => kv(f.label, f.value))}
      </div>
      {rule}
      {(data.client?.name || data.client?.dni || data.client?.phone) && (<>
        {title('Cliente')}
        {kv('Nombre', data.client.name)}{kv('DNI/CUIT', data.client.dni)}{kv('Tel', data.client.phone)}
        {rule}
      </>)}
      {title('Detalle')}
      {data.lines.map(l => (
        <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '4px 0', fontSize: 11.5 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{l.qty > 1 ? `${l.qty}× ` : ''}{l.description}</div>
            {l.detail && <div style={{ fontSize: 9.5, color: '#888' }}>{l.detail}</div>}
          </div>
          <div style={{ fontWeight: 600, whiteSpace: 'nowrap', fontFamily: MONO }}>{money(l.amount, data.currency)}</div>
        </div>
      ))}
      {data.notes && <div style={{ fontSize: 9.5, color: '#888', marginTop: 4 }}>{data.notes}</div>}
      {c.showPayments && (data.payments?.length || data.paymentText) && (<>
        {rule}{title('Pago')}
        {data.paymentText && !data.payments?.length && <div style={{ fontSize: 11 }}>{data.paymentText}</div>}
        {data.payments?.map((p, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, padding: '2px 0' }}>
            <span>{p.label}{p.note && <span style={{ color: '#999', fontSize: 9.5 }}> {p.note}</span>}</span>
            <span style={{ fontFamily: MONO }}>{money(p.amount, data.currency)}</span>
          </div>
        ))}
      </>)}
      <div style={{ marginTop: 12, padding: '10px 12px', background: '#f7f7f6', borderRadius: 8, border: '1px solid #eee' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontWeight: 700, fontSize: 12 }}>TOTAL</span>
          <span style={{ fontWeight: 800, fontSize: 17, color: accent, fontFamily: MONO }}>{money(data.total, data.currency)}</span>
        </div>
        {data.paid != null && data.paid !== data.total && (<>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 5, color: '#666' }}><span>Abonado</span><span style={{ fontFamily: MONO }}>{money(data.paid, data.currency)}</span></div>
          {data.total - data.paid > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#b45309', fontWeight: 600 }}><span>Saldo</span><span style={{ fontFamily: MONO }}>{money(data.total - data.paid, data.currency)}</span></div>}
        </>)}
      </div>
      {c.showWarranty && data.warranty && <div style={{ marginTop: 12, fontSize: 10.5 }}><b style={{ color: accent }}>Garantía: </b>{data.warranty}</div>}
      {c.showSignature && <div style={{ borderTop: '1px solid #bbb', marginTop: 34, paddingTop: 4, textAlign: 'center', fontSize: 9, color: '#888' }}>Firma del cliente</div>}
      {(c.thankYouText || c.footerText || shop.warranty_text) && (
        <div style={{ marginTop: 16, paddingTop: 10, borderTop: '1px solid #eee', textAlign: 'center' }}>
          {c.thankYouText && <div style={{ fontSize: 11, fontWeight: 700, color: accent }}>{c.thankYouText}</div>}
          {shop.warranty_text && <div style={{ fontSize: 8.5, color: '#777', fontStyle: 'italic', lineHeight: 1.5, marginTop: 5 }}>{shop.warranty_text}</div>}
          {c.footerText && <div style={{ fontSize: 9, color: '#777', marginTop: 5 }}>{c.footerText}</div>}
        </div>
      )}
      {c.showFooterBrand && <div style={{ marginTop: 10, textAlign: 'center', fontSize: 8, color: '#bbb' }}>Generado con Stackr</div>}
    </div>
  );
}

/* ═══════════════════ A4 (documento tipo factura) ═══════════════════ */
function A4Receipt({ shop, config: c, data }: { shop: ShopSettings; config: ReceiptConfig; data: ReceiptData }) {
  const accent = c.accent || '#111';
  const contacts = businessContactLine(shop);

  return (
    <div className="receipt-view" style={{ width: '100%', maxWidth: 720, margin: '0 auto', padding: '40px 44px', background: '#fff', color: '#111', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box' }}>
      {/* Membrete */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', minWidth: 0 }}>
          {c.showLogo && shop.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop.logo_url} alt="logo" style={{ maxHeight: 76, maxWidth: 130, objectFit: 'contain' }} />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 26, letterSpacing: '-0.03em', lineHeight: 1.05 }}>{shop.shop_name || 'Stackr'}</div>
            {c.showBusinessDetails && (
              <div style={{ fontSize: 11, color: '#555', marginTop: 6, lineHeight: 1.6 }}>
                {contacts.map((l, i) => <div key={i}>{l}</div>)}
                {c.showCuit && shop.cuit && <div>CUIT {shop.cuit}</div>}
              </div>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', color: '#999' }}>{c.headerNote || 'RECIBO'}</div>
          <div style={{ fontWeight: 800, fontSize: 20, color: accent, fontFamily: MONO, marginTop: 2 }}>{data.receiptNumber}</div>
          <div style={{ fontSize: 11.5, color: '#555', marginTop: 8 }}>{data.date}</div>
          {c.showSeller && data.seller && <div style={{ fontSize: 11.5, color: '#555' }}>Asesor: {data.seller}</div>}
        </div>
      </div>

      <div style={{ height: 3, background: accent, borderRadius: 2, marginTop: 20 }} />

      {/* Cliente + extras */}
      {(data.client?.name || data.client?.dni || data.client?.phone || (data.extraFields || []).length > 0) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, marginTop: 22, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', color: '#999', marginBottom: 6 }}>CLIENTE</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{data.client.name || '—'}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
              {[data.client.dni && `DNI/CUIT ${data.client.dni}`, data.client.phone && `Tel ${data.client.phone}`].filter(Boolean).join(' · ')}
            </div>
          </div>
          {(data.extraFields || []).length > 0 && (
            <div style={{ textAlign: 'right' }}>
              {(data.extraFields || []).map(f => (
                <div key={f.id} style={{ fontSize: 12, color: '#555' }}><span style={{ color: '#999' }}>{f.label}: </span>{f.value}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabla de ítems */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 24, fontSize: 13 }}>
        <thead>
          <tr style={{ background: accent, color: '#fff' }}>
            <th style={{ textAlign: 'left', padding: '9px 12px', fontWeight: 600, fontSize: 11, letterSpacing: '0.04em' }}>DESCRIPCIÓN</th>
            <th style={{ textAlign: 'center', padding: '9px 12px', fontWeight: 600, fontSize: 11, width: 60 }}>CANT.</th>
            <th style={{ textAlign: 'right', padding: '9px 12px', fontWeight: 600, fontSize: 11, width: 130 }}>IMPORTE</th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((l, i) => (
            <tr key={l.id} style={{ borderBottom: '1px solid #eee', background: i % 2 ? '#fafafa' : '#fff' }}>
              <td style={{ padding: '10px 12px' }}>
                <div style={{ fontWeight: 600 }}>{l.description}</div>
                {l.detail && <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{l.detail}</div>}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#555' }}>{l.qty}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: MONO, fontWeight: 600 }}>{money(l.amount, data.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.notes && <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>{data.notes}</div>}

      {/* Totales + pagos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, marginTop: 22, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          {c.showPayments && (data.payments?.length || data.paymentText) && (
            <>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', color: '#999', marginBottom: 6 }}>PAGO</div>
              {data.paymentText && !data.payments?.length && <div style={{ fontSize: 12 }}>{data.paymentText}</div>}
              {data.payments?.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, padding: '2px 0', maxWidth: 260 }}>
                  <span>{p.label}</span><span style={{ fontFamily: MONO }}>{money(p.amount, data.currency)}</span>
                </div>
              ))}
            </>
          )}
        </div>
        <div style={{ width: 260, maxWidth: '100%' }}>
          <div style={{ background: '#f7f7f6', border: '1px solid #eee', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>TOTAL</span>
              <span style={{ fontWeight: 800, fontSize: 22, color: accent, fontFamily: MONO }}>{money(data.total, data.currency)}</span>
            </div>
            {data.paid != null && data.paid !== data.total && (<>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 8, color: '#555' }}><span>Abonado</span><span style={{ fontFamily: MONO }}>{money(data.paid, data.currency)}</span></div>
              {data.total - data.paid > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 3, color: '#b45309', fontWeight: 700 }}><span>Saldo</span><span style={{ fontFamily: MONO }}>{money(data.total - data.paid, data.currency)}</span></div>}
            </>)}
          </div>
        </div>
      </div>

      {c.showWarranty && data.warranty && (
        <div style={{ marginTop: 22, fontSize: 12, padding: '10px 14px', background: '#fafafa', borderRadius: 8, border: '1px solid #eee' }}>
          <b style={{ color: accent }}>Garantía: </b>{data.warranty}
        </div>
      )}

      {c.showSignature && (
        <div style={{ display: 'flex', gap: 40, marginTop: 56 }}>
          {['Firma del cliente', 'Aclaración'].map(l => (
            <div key={l} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #999', marginBottom: 5 }} />
              <span style={{ fontSize: 10.5, color: '#888' }}>{l}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 30, paddingTop: 16, borderTop: '1px solid #eee', textAlign: 'center' }}>
        {c.thankYouText && <div style={{ fontSize: 13, fontWeight: 700, color: accent }}>{c.thankYouText}</div>}
        {shop.warranty_text && <div style={{ fontSize: 10, color: '#777', fontStyle: 'italic', lineHeight: 1.6, marginTop: 8, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>{shop.warranty_text}</div>}
        {c.footerText && <div style={{ fontSize: 10.5, color: '#777', marginTop: 6 }}>{c.footerText}</div>}
        {c.showFooterBrand && <div style={{ marginTop: 12, fontSize: 9, color: '#bbb', letterSpacing: '0.04em' }}>Generado con Stackr</div>}
      </div>
    </div>
  );
}

/**
 * Documento del recibo. Elige el layout según el formato: ticket (tira angosta
 * térmica) o A4 (documento tipo factura con membrete y tabla). Los dos son
 * visualmente muy distintos.
 */
export function ReceiptDocument({ shop, config, data }: { shop: ShopSettings; config: ReceiptConfig; data: ReceiptData }) {
  return config.format === 'a4'
    ? <A4Receipt shop={shop} config={config} data={data} />
    : <TicketReceipt shop={shop} config={config} data={data} />;
}

/* ── Wrapper retrocompatible: usado por SalesClient ({ sale, shop }) ── */
export function Receipt({ sale, shop }: { sale: Record<string, unknown>; shop: Record<string, unknown> }) {
  const s = sale as Record<string, unknown>;
  const settings = shop as ShopSettings;
  const config = normalizeReceiptConfig(settings.receipt_config ?? DEFAULT_RECEIPT_CONFIG);
  const currency = (s.currency as string) || 'ARS';
  const accessories = (s.accessories as Array<Record<string, unknown>>) || [];
  const payments = (s.payments as Array<Record<string, unknown>>) || [];
  const isAccessory = String(s.brand || '').toUpperCase() === 'ACCESORIOS';

  const lines: ReceiptLine[] = isAccessory
    ? accessories.map((a, i) => ({
        id: String(i), description: String(a.name || 'Accesorio'), detail: a.is_gift ? 'regalo' : undefined,
        qty: Number(a.qty) || 1, amount: a.is_gift ? 0 : (Number(a.price) || 0) * (Number(a.qty) || 1),
      }))
    : [
        { id: 'main', description: `${s.brand || ''} ${s.model || ''}`.trim(), detail: [s.storage, s.color].filter(Boolean).join(' · ') || undefined, qty: 1, amount: Number(s.price) || 0 },
        ...accessories.map((a, i) => ({ id: `acc-${i}`, description: String(a.name || 'Accesorio'), detail: a.is_gift ? 'regalo' : undefined, qty: Number(a.qty) || 1, amount: a.is_gift ? 0 : (Number(a.price) || 0) * (Number(a.qty) || 1) })),
      ];

  const paid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const client = (s.customer as { name?: string; dni?: string; phone?: string }) || {};

  return (
    <ReceiptDocument
      shop={settings}
      config={config}
      data={{
        receiptNumber: `REC-${String(s.id ?? '').slice(-6) || 'N/A'}`,
        date: s.created_at ? new Date(String(s.created_at)).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : undefined,
        seller: (s.seller_name as string) || undefined,
        client, lines,
        payments: config.showPayments ? payments.map(p => ({ label: String(p.label || p.id || 'Pago'), amount: Number(p.amount) || 0, note: p.exchange_rate ? `(${p.currency === 'USD' ? 'U$' : 'ARS'} ${Number(p.original_amount || 0).toLocaleString('es-AR')} @ ${p.exchange_rate})` : undefined })) : undefined,
        currency, total: Number(s.price) || 0, paid,
        warranty: config.showWarranty ? (String(s.notes || '') || config.warrantyDefault) : undefined,
        notes: config.showImei && s.imei ? `IMEI/Serie: ${s.imei}` : undefined,
      }}
    />
  );
}
