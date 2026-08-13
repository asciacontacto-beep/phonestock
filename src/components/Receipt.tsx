import type { ReceiptConfig, ReceiptLine, ReceiptExtraField, ShopSettings } from '@/types/receipt';
import { DEFAULT_RECEIPT_CONFIG, normalizeReceiptConfig } from '@/types/receipt';

/* ── helpers ─────────────────────────────────────────── */
const money = (n: number, currency?: string) =>
  `${currency === 'USD' ? 'U$' : '$'} ${(Number(n) || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

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

/**
 * Documento del recibo. Renderiza según la configuración (formato, colores,
 * qué secciones mostrar) y los datos ya resueltos. Es la única fuente visual:
 * tanto la vista previa de Configuración como el editor de Recibo lo usan.
 */
export function ReceiptDocument({
  shop, config, data,
}: {
  shop: ShopSettings;
  config: ReceiptConfig;
  data: ReceiptData;
}) {
  const c = config;
  const accent = c.accent || '#111111';
  const isA4 = c.format === 'a4';

  const width = isA4 ? 640 : 360;
  const pad = isA4 ? 40 : 24;
  const nameSize = isA4 ? 30 : 22;

  const rule = (dashed = false) => (
    <div style={{ margin: `${isA4 ? 18 : 13}px 0`, borderBottom: `1px ${dashed ? 'dashed' : 'solid'} ${dashed ? '#d4d4d4' : '#ececec'}` }} />
  );
  const sectionTitle = (t: string) => (
    <div style={{ fontWeight: 700, fontSize: 10.5, letterSpacing: '0.08em', color: accent, marginBottom: 8, textTransform: 'uppercase' }}>{t}</div>
  );
  const kv = (k: string, v?: string | null) => v ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, padding: '2px 0' }}>
      <span style={{ color: '#666' }}>{k}</span>
      <span style={{ fontWeight: 500, textAlign: 'right' }}>{v}</span>
    </div>
  ) : null;

  return (
    <div
      className="receipt-view"
      style={{
        color: '#111', background: '#fff', width, maxWidth: '100%', margin: '0 auto',
        padding: pad, fontFamily: "'Inter', -apple-system, sans-serif", boxSizing: 'border-box',
      }}
    >
      {/* Encabezado */}
      <div style={{ textAlign: 'center', marginBottom: isA4 ? 22 : 16 }}>
        {c.showLogo && shop.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shop.logo_url} alt="logo" style={{ maxHeight: isA4 ? 72 : 54, maxWidth: '70%', objectFit: 'contain', marginBottom: 10 }} />
        )}
        {c.headerNote && (
          <div style={{ fontSize: 9.5, letterSpacing: '0.16em', color: '#999', marginBottom: 4 }}>{c.headerNote}</div>
        )}
        <div style={{ fontWeight: 900, fontSize: nameSize, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
          {(shop.shop_name || 'STACKR').toUpperCase()}
        </div>
        {c.showBusinessDetails && (
          <div style={{ fontSize: 10, color: '#555', marginTop: 6, lineHeight: 1.5 }}>
            {shop.address && <div>{shop.address}</div>}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              {shop.phone && <span>WA {shop.phone}</span>}
              {shop.instagram && <span>IG {shop.instagram}</span>}
              {shop.email && <span>{shop.email}</span>}
              {shop.website && <span>{shop.website}</span>}
            </div>
            {c.showCuit && shop.cuit && <div style={{ marginTop: 2 }}>CUIT {shop.cuit}</div>}
          </div>
        )}
      </div>

      <div style={{ height: 2, background: accent, borderRadius: 2 }} />

      {/* Meta: número, fecha, asesor */}
      <div style={{ marginTop: 14 }}>
        {kv('Comprobante', data.receiptNumber)}
        {kv('Fecha', data.date)}
        {c.showSeller && kv('Asesor', data.seller)}
        {(data.extraFields || []).map(f => kv(f.label, f.value))}
      </div>

      {rule(true)}

      {/* Cliente */}
      {(data.client?.name || data.client?.dni || data.client?.phone) && (
        <>
          {sectionTitle('Cliente')}
          {kv('Nombre', data.client.name)}
          {kv('DNI / CUIT', data.client.dni)}
          {kv('Teléfono', data.client.phone)}
          {rule(true)}
        </>
      )}

      {/* Detalle de productos */}
      {sectionTitle('Detalle')}
      <div>
        {data.lines.map(l => (
          <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', fontSize: 12.5 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{l.qty > 1 ? `${l.qty}× ` : ''}{l.description}</div>
              {l.detail && <div style={{ fontSize: 10.5, color: '#777', marginTop: 1 }}>{l.detail}</div>}
            </div>
            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>
              {money(l.amount, data.currency)}
            </div>
          </div>
        ))}
        {c.showImei && data.notes && (
          <div style={{ fontSize: 10.5, color: '#777', marginTop: 4 }}>{data.notes}</div>
        )}
      </div>

      {/* Pagos */}
      {c.showPayments && (data.payments?.length || data.paymentText) && (
        <>
          {rule(true)}
          {sectionTitle('Pago')}
          {data.paymentText && !data.payments?.length && (
            <div style={{ fontSize: 12 }}>{data.paymentText}</div>
          )}
          {data.payments?.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, padding: '2px 0' }}>
              <div>
                <span>{p.label}</span>
                {p.note && <span style={{ fontSize: 10, color: '#888' }}> {p.note}</span>}
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{money(p.amount, data.currency)}</span>
            </div>
          ))}
        </>
      )}

      {/* Total */}
      <div style={{ marginTop: 16, padding: isA4 ? '16px 18px' : '12px 14px', background: '#f7f7f6', borderRadius: 10, border: `1px solid #efefee` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>TOTAL</span>
          <span style={{ fontWeight: 800, fontSize: isA4 ? 22 : 18, color: accent, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em' }}>
            {money(data.total, data.currency)}
          </span>
        </div>
        {data.paid != null && data.paid !== data.total && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6, color: '#555' }}>
              <span>Abonado</span><span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{money(data.paid, data.currency)}</span>
            </div>
            {data.total - data.paid > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 3, color: '#b45309', fontWeight: 600 }}>
                <span>Saldo</span><span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{money(data.total - data.paid, data.currency)}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Garantía */}
      {c.showWarranty && data.warranty && (
        <div style={{ marginTop: 14, fontSize: 11 }}>
          <span style={{ fontWeight: 700, color: accent }}>Garantía: </span>{data.warranty}
        </div>
      )}

      {/* Firma */}
      {c.showSignature && (
        <div style={{ display: 'flex', gap: 24, marginTop: isA4 ? 40 : 30 }}>
          {['Firma del cliente', 'Aclaración'].map(l => (
            <div key={l} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #bbb', marginBottom: 4 }} />
              <span style={{ fontSize: 9.5, color: '#888' }}>{l}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pie */}
      {(c.thankYouText || c.footerText || shop.warranty_text) && (
        <div style={{ marginTop: 20, paddingTop: 12, borderTop: '1px solid #eee', textAlign: 'center' }}>
          {c.thankYouText && <div style={{ fontSize: 12, fontWeight: 700, color: accent }}>{c.thankYouText}</div>}
          {shop.warranty_text && <div style={{ fontSize: 9, color: '#666', fontStyle: 'italic', lineHeight: 1.5, marginTop: 6 }}>{shop.warranty_text}</div>}
          {c.footerText && <div style={{ fontSize: 9.5, color: '#666', marginTop: 6, lineHeight: 1.5 }}>{c.footerText}</div>}
        </div>
      )}

      {c.showFooterBrand && (
        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 8.5, color: '#bbb', letterSpacing: '0.04em' }}>
          Generado con Stackr
        </div>
      )}
    </div>
  );
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
        id: String(i),
        description: String(a.name || 'Accesorio'),
        detail: a.is_gift ? 'regalo' : undefined,
        qty: Number(a.qty) || 1,
        amount: a.is_gift ? 0 : (Number(a.price) || 0) * (Number(a.qty) || 1),
      }))
    : [
        {
          id: 'main',
          description: `${s.brand || ''} ${s.model || ''}`.trim(),
          detail: [s.storage, s.color].filter(Boolean).join(' · ') || undefined,
          qty: 1,
          amount: Number(s.price) || 0,
        },
        ...accessories.map((a, i) => ({
          id: `acc-${i}`,
          description: String(a.name || 'Accesorio'),
          detail: a.is_gift ? 'regalo' : undefined,
          qty: Number(a.qty) || 1,
          amount: a.is_gift ? 0 : (Number(a.price) || 0) * (Number(a.qty) || 1),
        })),
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
        client,
        lines,
        payments: config.showPayments
          ? payments.map(p => ({
              label: String(p.label || p.id || 'Pago'),
              amount: Number(p.amount) || 0,
              note: p.exchange_rate ? `(${p.currency === 'USD' ? 'U$' : 'ARS'} ${Number(p.original_amount || 0).toLocaleString('es-AR')} @ ${p.exchange_rate})` : undefined,
            }))
          : undefined,
        currency,
        total: Number(s.price) || 0,
        paid,
        warranty: config.showWarranty ? (String(s.notes || '') || config.warrantyDefault) : undefined,
        notes: config.showImei && s.imei ? `IMEI/Serie: ${s.imei}` : undefined,
      }}
    />
  );
}
