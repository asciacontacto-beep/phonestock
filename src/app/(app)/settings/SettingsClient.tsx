"use client"
import { useState, useEffect, useMemo } from 'react';
import {
  Save, Building2, MapPin, Camera, Phone, Mail, Globe, FileText, Loader2,
  DollarSign, Download, Hash, Image as ImageIcon, Palette, ReceiptText, Trash2,
} from 'lucide-react';
import { downloadBackup } from '@/utils/backup';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { ReceiptDocument, type ReceiptData } from '@/components/Receipt';
import { ReceiptPreview } from '@/components/ReceiptPreview';
import {
  type ShopSettings, type ReceiptConfig,
  DEFAULT_RECEIPT_CONFIG, normalizeReceiptConfig,
} from '@/types/receipt';

/** Columnas que existen siempre en settings (funcionan sin la migración nueva). */
const BASE_COLUMNS = ['shop_name', 'address', 'phone', 'instagram', 'warranty_text', 'exchange_rate'];
/** Columnas que requieren la migración 20260813_settings_receipt.sql. */
const EXTRA_COLUMNS = ['logo_url', 'email', 'cuit', 'website', 'receipt_config'];

const DEFAULTS: ShopSettings = {
  shop_name: 'Mi Local',
  address: '',
  phone: '',
  instagram: '',
  email: '',
  cuit: '',
  website: '',
  logo_url: '',
  warranty_text: 'Garantía de 90 días por fallas de fábrica. El equipo debe estar en las mismas condiciones de entrega.',
  exchange_rate: 1200,
  receipt_config: DEFAULT_RECEIPT_CONFIG,
};

const TOGGLES: { key: keyof ReceiptConfig; label: string }[] = [
  { key: 'showLogo', label: 'Logo' },
  { key: 'showBusinessDetails', label: 'Datos de contacto' },
  { key: 'showCuit', label: 'CUIT' },
  { key: 'showSeller', label: 'Asesor / vendedor' },
  { key: 'showImei', label: 'IMEI / serie' },
  { key: 'showPayments', label: 'Desglose de pagos' },
  { key: 'showWarranty', label: 'Garantía' },
  { key: 'showSignature', label: 'Línea de firma' },
  { key: 'showFooterBrand', label: '“Generado con Stackr”' },
];

export function SettingsClient({ profile }: { profile: { org_id?: string } | null }) {
  const supabase = createClient();
  const [form, setForm] = useState<ShopSettings>(DEFAULTS);
  const [rowId, setRowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);

  const cfg = useMemo(() => normalizeReceiptConfig(form.receipt_config), [form.receipt_config]);

  const setField = <K extends keyof ShopSettings>(key: K, value: ShopSettings[K]) =>
    setForm(f => ({ ...f, [key]: value }));
  const setCfg = <K extends keyof ReceiptConfig>(key: K, value: ReceiptConfig[K]) =>
    setForm(f => ({ ...f, receipt_config: { ...normalizeReceiptConfig(f.receipt_config), [key]: value } }));

  useEffect(() => {
    const load = async () => {
      if (!profile?.org_id) { setFetching(false); return; }
      setFetching(true);
      const { data } = await supabase.from('settings').select('*').eq('org_id', profile.org_id).limit(1);
      if (data && data.length > 0) {
        const { id, org_id, receipt_config, ...rest } = data[0];
        setRowId(id ?? null);
        setForm({ ...DEFAULTS, ...rest, receipt_config: normalizeReceiptConfig(receipt_config) });
      }
      setFetching(false);
    };
    load();
  }, [profile?.org_id]);

  const onLogo = (file?: File | null) => {
    if (!file) return;
    if (file.size > 300_000) { toast.error('El logo es muy pesado (máx. 300KB). Usá una imagen más chica.'); return; }
    const reader = new FileReader();
    reader.onload = () => setField('logo_url', String(reader.result));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!profile?.org_id) { toast.error('No se encontró la organización asociada'); return; }
    setLoading(true);
    try {
      const full: Record<string, unknown> = { org_id: profile.org_id };
      [...BASE_COLUMNS, ...EXTRA_COLUMNS].forEach(col => { full[col] = (form as Record<string, unknown>)[col]; });

      type WriteResult = { error: { message?: string; code?: string } | null; data?: { id?: string } | null };
      const write = async (payload: Record<string, unknown>): Promise<WriteResult> => {
        if (rowId) {
          const { org_id, ...rest } = payload;
          return await supabase.from('settings').update(rest).eq('id', rowId) as WriteResult;
        }
        return await supabase.from('settings').insert(payload).select('id').single() as WriteResult;
      };

      let { error, data } = await write(full);

      // Si faltan las columnas nuevas (migración sin aplicar), reintenta solo con
      // las básicas y avisa. Así lo esencial siempre se guarda.
      const missingColumn = !!error && (error.code === '42703' || error.code === 'PGRST204' ||
        /column .* does not exist|could not find/i.test(error.message || ''));
      if (missingColumn) {
        const baseOnly: Record<string, unknown> = { org_id: profile.org_id };
        BASE_COLUMNS.forEach(col => { baseOnly[col] = (form as Record<string, unknown>)[col]; });
        ({ error, data } = await write(baseOnly));
        if (!error) {
          toast.warning('Guardado. Para activar el logo y la personalización avanzada del recibo, aplicá la migración settings (docs/mejoras).', { duration: 9000 });
        }
      }

      if (error) throw error;
      if (data?.id && !rowId) setRowId(data.id);
      if (!missingColumn) toast.success('Configuración guardada');
    } catch (e) {
      toast.error('No se pudo guardar: ' + (e instanceof Error ? e.message : ''));
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const { fileName, tables } = await downloadBackup(supabase);
      const total = tables.reduce((a, t) => a + t.rows, 0);
      toast.success(`Respaldo descargado (${total.toLocaleString('es-AR')} registros): ${fileName}`);
    } catch (e) {
      toast.error('No se pudo generar el respaldo: ' + (e instanceof Error ? e.message : ''));
    } finally {
      setBackupLoading(false);
    }
  };

  const previewData: ReceiptData = {
    receiptNumber: 'REC-000123',
    date: '13/08/2026 15:30',
    seller: 'Juan',
    client: { name: 'María González', dni: '30.111.222', phone: '11 5555-4444' },
    lines: [
      { id: '1', description: 'iPhone 15 Pro', detail: '256GB · Titanio Natural', qty: 1, amount: 1_200_000 },
      { id: '2', description: 'Funda MagSafe', qty: 1, amount: 25_000 },
    ],
    payments: [
      { label: 'Efectivo', amount: 800_000 },
      { label: 'Transferencia', amount: 425_000 },
    ],
    currency: 'ARS',
    total: 1_225_000,
    paid: 1_225_000,
    warranty: cfg.warrantyDefault,
    notes: 'IMEI/Serie: 358901234567891',
  };

  const iconField = (icon: React.ReactNode, node: React.ReactNode) => (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-3)' }}>{icon}</span>
      {node}
    </div>
  );

  if (fetching) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <Loader2 className="spin" size={28} style={{ color: 'var(--text-3)' }} />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="sh" style={{ marginBottom: 24 }}>
        <div>
          <div className="st">Configuración</div>
          <div className="helper-text">Personalizá la identidad de tu negocio y el diseño del recibo.</div>
        </div>
        <button className="btn btn-dark" onClick={save} disabled={loading}>
          {loading ? <Loader2 className="spin" size={18} /> : <><Save size={17} style={{ marginRight: 8 }} /> Guardar</>}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,380px)', gap: 20, alignItems: 'start' }} className="settings-grid">
        {/* ── Columna de edición ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Identidad */}
          <div className="card">
            <div className="lbl" style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={15} /> Identidad del negocio
            </div>

            {/* Logo */}
            <div className="field">
              <label className="lbl">Logo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 64, height: 64, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {form.logo_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={form.logo_url} alt="logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    : <ImageIcon size={22} color="var(--text-3)" />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                    <Camera size={14} /> Subir imagen
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onLogo(e.target.files?.[0])} />
                  </label>
                  {form.logo_url && (
                    <button className="btn-ghost" style={{ fontSize: 12, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => setField('logo_url', '')}>
                      <Trash2 size={12} /> Quitar
                    </button>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>PNG o JPG, hasta 300KB. Se muestra arriba del recibo.</p>
            </div>

            <div className="field">
              <label className="lbl">Nombre del negocio</label>
              {iconField(<Building2 size={16} />, <input className="inp" style={{ paddingLeft: 40 }} value={form.shop_name || ''} onChange={e => setField('shop_name', e.target.value)} />)}
            </div>
            <div className="field">
              <label className="lbl">Dirección</label>
              {iconField(<MapPin size={16} />, <input className="inp" style={{ paddingLeft: 40 }} value={form.address || ''} onChange={e => setField('address', e.target.value)} />)}
            </div>
            <div className="row">
              <div className="col field">
                <label className="lbl">WhatsApp</label>
                {iconField(<Phone size={16} />, <input className="inp" style={{ paddingLeft: 40 }} value={form.phone || ''} onChange={e => setField('phone', e.target.value)} />)}
              </div>
              <div className="col field">
                <label className="lbl">Instagram</label>
                {iconField(<Camera size={16} />, <input className="inp" style={{ paddingLeft: 40 }} value={form.instagram || ''} onChange={e => setField('instagram', e.target.value)} />)}
              </div>
            </div>
            <div className="row">
              <div className="col field">
                <label className="lbl">Email</label>
                {iconField(<Mail size={16} />, <input className="inp" style={{ paddingLeft: 40 }} value={form.email || ''} onChange={e => setField('email', e.target.value)} />)}
              </div>
              <div className="col field">
                <label className="lbl">Sitio web</label>
                {iconField(<Globe size={16} />, <input className="inp" style={{ paddingLeft: 40 }} value={form.website || ''} onChange={e => setField('website', e.target.value)} />)}
              </div>
            </div>
            <div className="row">
              <div className="col field">
                <label className="lbl">CUIT</label>
                {iconField(<Hash size={16} />, <input className="inp" style={{ paddingLeft: 40 }} value={form.cuit || ''} onChange={e => setField('cuit', e.target.value)} />)}
              </div>
              <div className="col field">
                <label className="lbl">Cotización USD → ARS</label>
                {iconField(<DollarSign size={16} />, <input className="inp" style={{ paddingLeft: 40 }} type="number" value={form.exchange_rate ?? ''} onChange={e => setField('exchange_rate', parseFloat(e.target.value) || 0)} />)}
              </div>
            </div>
          </div>

          {/* Personalización del recibo */}
          <div className="card">
            <div className="lbl" style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ReceiptText size={15} /> Diseño del recibo
            </div>

            <div className="row">
              <div className="col field">
                <label className="lbl">Formato</label>
                <select className="inp" value={cfg.format} onChange={e => setCfg('format', e.target.value as ReceiptConfig['format'])}>
                  <option value="ticket">Ticket (angosto)</option>
                  <option value="a4">A4 / Hoja completa</option>
                </select>
              </div>
              <div className="col field" style={{ maxWidth: 140 }}>
                <label className="lbl">Color de acento</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="color" value={cfg.accent} onChange={e => setCfg('accent', e.target.value)} style={{ width: 42, height: 40, borderRadius: 8, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', padding: 2 }} />
                  {iconField(<Palette size={16} />, <input className="inp" style={{ paddingLeft: 40 }} value={cfg.accent} onChange={e => setCfg('accent', e.target.value)} />)}
                </div>
              </div>
            </div>

            <div className="field">
              <label className="lbl">Encabezado</label>
              <input className="inp" value={cfg.headerNote} onChange={e => setCfg('headerNote', e.target.value)} placeholder="COMPROBANTE DE VENTA" />
            </div>
            <div className="field">
              <label className="lbl">Mensaje de agradecimiento</label>
              <input className="inp" value={cfg.thankYouText} onChange={e => setCfg('thankYouText', e.target.value)} placeholder="¡Gracias por tu compra!" />
            </div>
            <div className="field">
              <label className="lbl">Garantía por defecto</label>
              <input className="inp" value={cfg.warrantyDefault} onChange={e => setCfg('warrantyDefault', e.target.value)} placeholder="90 días por fallas de fábrica" />
            </div>
            <div className="field">
              <label className="lbl">Texto legal / términos (pie)</label>
              {iconField(<FileText size={16} />, <textarea className="inp" style={{ paddingLeft: 40, minHeight: 80, resize: 'vertical' }} value={form.warranty_text || ''} onChange={e => setField('warranty_text', e.target.value)} />)}
            </div>
            <div className="field">
              <label className="lbl">Nota extra en el pie (opcional)</label>
              <input className="inp" value={cfg.footerText} onChange={e => setCfg('footerText', e.target.value)} placeholder="Ej: Cambios dentro de las 48hs con ticket" />
            </div>

            <div className="divider" />
            <label className="lbl" style={{ marginBottom: 10, display: 'block' }}>Qué mostrar</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 8 }}>
              {TOGGLES.map(t => {
                const on = Boolean(cfg[t.key]);
                return (
                  <button
                    key={t.key}
                    onClick={() => setCfg(t.key, !on as ReceiptConfig[typeof t.key])}
                    className="toggle-chip"
                    data-on={on}
                  >
                    <span className="toggle-dot" />{t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Respaldo */}
          <div className="card">
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Respaldo de tus datos</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5 }}>
                  Descargá todo el negocio en un archivo (inventario, ventas, reparaciones, clientes y más). Se abre con Excel.
                </div>
              </div>
              <button className="btn btn-outline" onClick={handleBackup} disabled={backupLoading}>
                {backupLoading ? <Loader2 className="spin" size={16} /> : <Download size={16} />} Descargar respaldo
              </button>
            </div>
          </div>
        </div>

        {/* ── Vista previa en vivo ── */}
        <div className="settings-preview">
          <div className="lbl" style={{ marginBottom: 10 }}>Vista previa en vivo</div>
          <div style={{ background: '#e9e9e7', borderRadius: 16, padding: 18, border: '1px solid var(--border)', maxHeight: '75vh', overflow: 'auto' }}>
            <ReceiptPreview naturalWidth={cfg.format === 'a4' ? 720 : 300}>
              <ReceiptDocument shop={form} config={cfg} data={previewData} />
            </ReceiptPreview>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10, textAlign: 'center' }}>
            Los cambios se reflejan al instante. Acordate de <strong>Guardar</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
