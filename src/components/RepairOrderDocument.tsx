import type { ReceiptConfig, ShopSettings } from '@/types/receipt';

const money = (n: number) => `$ ${(Number(n) || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
const MONO = "'JetBrains Mono', monospace";

export interface RepairOrderData {
  id?: string;
  created_at?: string;
  customer_name?: string;
  customer_phone?: string;
  device_brand?: string;
  device_model?: string;
  device_color?: string;
  device_password?: string;
  issue_description?: string;
  visual_condition?: string;
  budget?: number | null;
  deposit_paid?: number | null;
  status?: string;
}

function contactLine(shop: ShopSettings): string[] {
  return [shop.address, shop.phone && `WA ${shop.phone}`, shop.instagram && `IG ${shop.instagram}`, shop.email, shop.website].filter(Boolean) as string[];
}

const TERMS_DEFAULT = 'Declaro haber revisado el estado visual y la descripción del equipo detallada arriba, y presto conformidad con lo indicado en esta orden. Pasados los 90 días de notificada la finalización, no nos responsabilizamos por el equipo.';

/**
 * Orden de reparación / comprobante de ingreso al taller, con la misma marca
 * que el recibo (logo, color de acento, formato ticket/A4). Documento que el
 * cliente se lleva al dejar el equipo.
 */
export function RepairOrderDocument({ shop, config, repair }: { shop: ShopSettings; config: ReceiptConfig; repair: RepairOrderData }) {
  const c = config;
  const accent = c.accent || '#111';
  const isA4 = c.format === 'a4';
  const orderNo = `ORD-${String(repair.id ?? '').split('-')[0].slice(0, 8).toUpperCase() || 'NUEVA'}`;
  const date = repair.created_at ? new Date(repair.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleDateString('es-AR');
  const budget = Number(repair.budget) || 0;
  const deposit = Number(repair.deposit_paid) || 0;
  const balance = budget > deposit ? budget - deposit : 0;

  const width = isA4 ? 720 : 300;
  const pad = isA4 ? '40px 44px' : 20;
  const contacts = contactLine(shop);

  const title = (t: string) => <div style={{ fontSize: isA4 ? 11 : 10, fontWeight: 700, letterSpacing: '0.08em', color: '#999', marginBottom: 6, textTransform: 'uppercase' }}>{t}</div>;
  const kv = (k: string, v?: string | null) => v ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: isA4 ? 13 : 11.5, padding: '2px 0' }}>
      <span style={{ color: '#777' }}>{k}</span><span style={{ fontWeight: 500, textAlign: 'right' }}>{v}</span>
    </div>
  ) : null;

  return (
    <div className="receipt-view" style={{ width, maxWidth: '100%', margin: '0 auto', padding: pad, background: '#fff', color: '#111', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box' }}>
      {/* Membrete */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexDirection: isA4 ? 'row' : 'column', textAlign: isA4 ? 'left' : 'center' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', margin: isA4 ? 0 : '0 auto', flexDirection: isA4 ? 'row' : 'column' }}>
          {c.showLogo && shop.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop.logo_url} alt="logo" style={{ maxHeight: isA4 ? 70 : 48, maxWidth: 130, objectFit: 'contain' }} />
          )}
          <div>
            <div style={{ fontWeight: 900, fontSize: isA4 ? 24 : 19, letterSpacing: '-0.03em' }}>{shop.shop_name || 'Stackr'}</div>
            {c.showBusinessDetails && (
              <div style={{ fontSize: isA4 ? 11 : 9.5, color: '#555', marginTop: 5, lineHeight: 1.5 }}>
                {contacts.map((l, i) => <div key={i}>{l}</div>)}
                {c.showCuit && shop.cuit && <div>CUIT {shop.cuit}</div>}
              </div>
            )}
          </div>
        </div>
        <div style={{ textAlign: isA4 ? 'right' : 'center', flexShrink: 0, marginTop: isA4 ? 0 : 8 }}>
          <div style={{ fontSize: isA4 ? 11 : 9, letterSpacing: '0.14em', color: '#999' }}>ORDEN DE REPARACIÓN</div>
          <div style={{ fontWeight: 800, fontSize: isA4 ? 18 : 15, color: accent, fontFamily: MONO, marginTop: 2 }}>{orderNo}</div>
          <div style={{ fontSize: isA4 ? 11.5 : 10, color: '#555', marginTop: 6 }}>{date}</div>
        </div>
      </div>

      <div style={{ height: isA4 ? 3 : 2, background: accent, borderRadius: 2, marginTop: 16 }} />

      {/* Cliente */}
      <div style={{ marginTop: 16 }}>
        {title('Cliente')}
        {kv('Nombre', repair.customer_name)}
        {kv('Teléfono', repair.customer_phone)}
      </div>

      <div style={{ margin: '14px 0', borderBottom: '1px dashed #d4d4d4' }} />

      {/* Equipo */}
      {title('Equipo recibido')}
      <div style={{ fontSize: isA4 ? 15 : 13, fontWeight: 700 }}>{[repair.device_brand, repair.device_model].filter(Boolean).join(' ') || 'Equipo'}</div>
      {repair.device_color && <div style={{ fontSize: isA4 ? 12 : 11, color: '#666', marginTop: 1 }}>Color: {repair.device_color}</div>}
      <div style={{ marginTop: 8 }}>
        {kv('Contraseña / PIN', repair.device_password)}
        {kv('Estado visual al ingreso', repair.visual_condition)}
      </div>

      {/* Falla reportada */}
      <div style={{ marginTop: 12, padding: isA4 ? '12px 14px' : '10px 12px', background: '#fafafa', border: '1px solid #eee', borderRadius: 8 }}>
        <div style={{ fontSize: isA4 ? 11 : 10, fontWeight: 700, letterSpacing: '0.06em', color: accent, marginBottom: 4, textTransform: 'uppercase' }}>Falla reportada</div>
        <div style={{ fontSize: isA4 ? 13 : 12, lineHeight: 1.5 }}>{repair.issue_description || '—'}</div>
      </div>

      {/* Presupuesto / seña / saldo */}
      {(budget > 0 || deposit > 0) && (
        <div style={{ marginTop: 14, padding: isA4 ? '14px 16px' : '12px 14px', background: '#f7f7f6', border: '1px solid #efefee', borderRadius: 10 }}>
          {budget > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700, fontSize: isA4 ? 13 : 12 }}>Presupuesto estimado</span>
              <span style={{ fontWeight: 800, fontSize: isA4 ? 18 : 15, color: accent, fontFamily: MONO }}>{money(budget)}</span>
            </div>
          )}
          {deposit > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isA4 ? 12 : 11, marginTop: 6, color: '#555' }}>
              <span>Seña entregada</span><span style={{ fontFamily: MONO }}>{money(deposit)}</span>
            </div>
          )}
          {balance > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isA4 ? 12 : 11, marginTop: 3, color: '#b45309', fontWeight: 700 }}>
              <span>Saldo al retirar</span><span style={{ fontFamily: MONO }}>{money(balance)}</span>
            </div>
          )}
        </div>
      )}

      {/* Términos + firma */}
      <div style={{ marginTop: 16, fontSize: isA4 ? 9.5 : 8.5, color: '#666', lineHeight: 1.5, fontStyle: 'italic' }}>
        {TERMS_DEFAULT}{shop.warranty_text ? ` ${shop.warranty_text}` : ''}
      </div>

      <div style={{ borderTop: '1px solid #bbb', marginTop: isA4 ? 44 : 34, paddingTop: 4, textAlign: 'center', fontSize: isA4 ? 10 : 9, color: '#888', maxWidth: isA4 ? 280 : '100%', marginLeft: 'auto', marginRight: 'auto' }}>
        Firma del cliente
      </div>

      {c.thankYouText && <div style={{ marginTop: 16, textAlign: 'center', fontSize: isA4 ? 12 : 11, fontWeight: 700, color: accent }}>{c.thankYouText}</div>}
      {c.showFooterBrand && <div style={{ marginTop: 10, textAlign: 'center', fontSize: 8.5, color: '#bbb' }}>Generado con Stackr</div>}
    </div>
  );
}
