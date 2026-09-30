"use client"
import { useState, useEffect, useMemo } from 'react';
import {
  Save, Building2, MapPin, Camera, Phone, Mail, Globe, FileText, Loader2,
  DollarSign, Download, Hash, Image as ImageIcon, Palette, ReceiptText, Trash2, Copy,
  CreditCard, Lock, Smartphone, Database, ArrowRight,
} from 'lucide-react';
import { downloadBackup } from '@/utils/backup';
import { CardPlansCard } from '@/components/CardPlansCard';
import { CuentasCard } from '@/components/CuentasCard';
import { ValoresTomaCard } from '@/components/ValoresTomaCard';
import type { Cuenta } from '@/utils/cuentas';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { ReceiptDocument, type ReceiptData } from '@/components/Receipt';
import { ReceiptPreview } from '@/components/ReceiptPreview';
import { ApiKeysCard } from '@/components/ApiKeysCard';
import { cotizacionDelDia, fuenteValida, NOMBRE_FUENTE, type FuenteCotizacion } from '@/utils/cotizacion';
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

type Seccion = 'negocio' | 'cotizacion' | 'cobros' | 'caja' | 'toma' | 'datos';

const SECCIONES: { v: Seccion; l: string; desc: string; icon: React.ReactNode }[] = [
  { v: 'negocio',    l: 'Negocio y recibo', desc: 'La identidad de tu negocio y el diseño del recibo.', icon: <Building2 size={16} /> },
  { v: 'cotizacion', l: 'Cotización',       desc: 'El dólar con el que se pasan precios y costos a pesos.', icon: <DollarSign size={16} /> },
  { v: 'cobros',     l: 'Cobros',           desc: 'Dónde entra la plata y los planes de tarjeta o financiera.', icon: <CreditCard size={16} /> },
  { v: 'caja',       l: 'Caja',             desc: 'Cómo cierran el turno los vendedores.', icon: <Lock size={16} /> },
  { v: 'toma',       l: 'Valores de toma',  desc: 'Cuánto pagás por un usado que entra en parte de pago.', icon: <Smartphone size={16} /> },
  { v: 'datos',      l: 'Datos y accesos',  desc: 'Respaldo, claves de acceso y tu link de invitación.', icon: <Database size={16} /> },
];

/** Versión de la app (next.config.ts): la que se pregunta en soporte. */
const VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '';

export function SettingsClient({ profile }: { profile: { org_id?: string; role?: string } | null }) {
  const supabase = createClient();
  const [form, setForm] = useState<ShopSettings>(DEFAULTS);
  const [rowId, setRowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  /* Configuración tenía todo en una sola columna larga: los planes de
     tarjeta quedaban al fondo, debajo del recibo, y no los encontraba
     nadie. Cada tema es una sección propia, con un menú al costado. */
  const [seccion, setSeccion] = useState<Seccion>('negocio');
  /* Cuentas: las usan los planes (dónde acredita cada uno). Sin la
     migración de cuentas, los planes funcionan como antes. */
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [hayCuentas, setHayCuentas] = useState(false);
  /* Cierre a ciegas: sólo si la base ya tiene la columna. */
  const [hayCiegas, setHayCiegas] = useState(false);
  /* Link de referidos del negocio. Si la migración no está aplicada, la
     tarjeta simplemente no aparece. */
  const [referral, setReferral] = useState<{ code: string; invitados: number; pagos: number } | null>(null);
  const referralLink = referral?.code
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${referral.code}`
    : '';

  /* Cotización automática: sólo si la base ya tiene la columna (migración
     20260928_cotizacion_automatica). Sin ella, todo sigue como siempre. */
  const [hayFuente, setHayFuente] = useState(false);
  const [valorHoy, setValorHoy] = useState<number | null>(null);
  const fuente = fuenteValida(form.cotizacion_fuente);

  useEffect(() => {
    if (fuente === 'manual') { setValorHoy(null); return; }
    let vivo = true;
    cotizacionDelDia(fuente).then(v => { if (vivo) setValorHoy(v); });
    return () => { vivo = false; };
  }, [fuente]);

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
      const { error: sinColumna } = await supabase.from('settings').select('cotizacion_fuente').limit(0);
      setHayFuente(!sinColumna);
      const { error: sinCiegas } = await supabase.from('settings').select('cierre_a_ciegas').limit(0);
      setHayCiegas(!sinCiegas);
      const { error: sinCuentas } = await supabase.from('accounts').select('id').limit(0);
      setHayCuentas(!sinCuentas);
      if (data && data.length > 0) {
        const { id, org_id, receipt_config, ...rest } = data[0];
        setRowId(id ?? null);
        setForm({ ...DEFAULTS, ...rest, receipt_config: normalizeReceiptConfig(receipt_config) });
      }
      try {
        const { data: ref } = await supabase.rpc('my_referrals');
        if (ref && ref[0]?.code) {
          setReferral({ code: ref[0].code, invitados: Number(ref[0].invitados) || 0, pagos: Number(ref[0].pagos) || 0 });
        }
      } catch { /* migración de referidos sin aplicar */ }
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
      if (hayFuente) full.cotizacion_fuente = fuente;
      if (hayCiegas) full.cierre_a_ciegas = Boolean(form.cierre_a_ciegas);

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
        if (hayFuente) baseOnly.cotizacion_fuente = fuente;
        if (hayCiegas) baseOnly.cierre_a_ciegas = Boolean(form.cierre_a_ciegas);
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

  const actual = SECCIONES.find(x => x.v === seccion)!;
  const guardaAjustes = seccion === 'negocio' || seccion === 'cotizacion' || seccion === 'caja';
  const cotizEjemplo = fuente !== 'manual' && valorHoy ? valorHoy : Number(form.exchange_rate) || 0;

  return (
    <div className="page">
      <div className="sh" style={{ marginBottom: 16 }}>
        <div>
          <div className="st">Configuración</div>
          <div className="helper-text">{actual.desc}</div>
        </div>
        {guardaAjustes && (
          <button className="btn btn-dark" onClick={save} disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : <><Save size={17} style={{ marginRight: 8 }} /> Guardar</>}
          </button>
        )}
      </div>

      <div className="cfg-layout">
        {/* ── Menú de secciones. Al pie, la versión: es lo que se pregunta en soporte. ── */}
        <nav className="cfg-nav no-print" aria-label="Secciones de configuración">
          <div className="cfg-nav-title">Configuración</div>
          {SECCIONES.map(opt => (
            <button key={opt.v} className="cfg-nav-item" aria-current={seccion === opt.v ? 'page' : undefined}
              onClick={() => setSeccion(opt.v)}>
              {opt.icon}{opt.l}
            </button>
          ))}
          {VERSION && <div className="cfg-nav-foot">Stackr v{VERSION}</div>}
        </nav>

        <div
          style={seccion === 'negocio'
            ? { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,380px)', gap: 20, alignItems: 'start', minWidth: 0 }
            : { minWidth: 0 }}
          className={seccion === 'negocio' ? 'settings-grid' : ''}
        >
        <div className="cfg-main">

          {seccion === 'negocio' && <>
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
            <div className="field">
              <label className="lbl">CUIT</label>
              {iconField(<Hash size={16} />, <input className="inp" style={{ paddingLeft: 40 }} value={form.cuit || ''} onChange={e => setField('cuit', e.target.value)} />)}
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

          </>}

          {seccion === 'cotizacion' && (
          <div className="card">
            <div className="lbl" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={15} /> Cotización del dólar
            </div>
            {hayFuente && (
              <div className="field">
                <label className="lbl">De dónde sale la cotización de las ventas nuevas</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(['manual', 'blue', 'cripto'] as FuenteCotizacion[]).map(f => (
                    <button key={f} type="button" className={`btn btn-sm ${fuente === f ? 'btn-dark' : 'btn-outline'}`}
                      onClick={() => setField('cotizacion_fuente', f)}>
                      {f === 'manual' ? 'La que escribo abajo' : `${NOMBRE_FUENTE[f]} del día (automática)`}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {fuente !== 'manual' && (
              <div style={{ marginBottom: 14 }}>
                <div className="helper-text">{NOMBRE_FUENTE[fuente]} de hoy · automático (dolarapi.com)</div>
                <div className="cfg-cotiz-grande">{valorHoy ? `$ ${valorHoy.toLocaleString('es-AR')}` : '…'} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-3)' }}>ARS por USD</span></div>
              </div>
            )}
            <div className="field" style={{ maxWidth: 320 }}>
              <label className="lbl">{fuente === 'manual' ? 'Cotización USD → ARS' : 'Cotización de respaldo'}</label>
              {iconField(<DollarSign size={16} />, <input className="inp" style={{ paddingLeft: 40 }} type="number" value={form.exchange_rate ?? ''} onChange={e => setField('exchange_rate', parseFloat(e.target.value) || 0)} />)}
            </div>
            {/* El número solo no se entiende; el ejemplo sí. */}
            {cotizEjemplo > 0 && (
              <div className="cfg-ejemplo">
                <ArrowRight size={14} /> Un producto de <strong>USD 100</strong> se cobra <strong>$ {(100 * cotizEjemplo).toLocaleString('es-AR')}</strong>
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 12, lineHeight: 1.5 }}>
              {fuente === 'manual'
                ? 'Las ventas usan la cotización que escribiste. Acordate de actualizarla cuando cambia el dólar.'
                : 'Cada venta nueva toma el valor del momento (valor de venta). La cotización de respaldo se usa si no hay internet, y es con la que se calculan las ventas viejas que no guardaron la suya: por eso no se cambia sola.'}
            </div>
          </div>
          )}

          {seccion === 'cobros' && <>
            <CuentasCard onChange={setCuentas} />
            <CardPlansCard cuentas={cuentas} hayCuentas={hayCuentas} />
          </>}

          {seccion === 'caja' && (
          <div className="card">
            <div className="lbl" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock size={15} /> Cierre de turno
            </div>
            {!hayCiegas ? (
              <div className="cfg-aviso">Para usar el cierre a ciegas hay que aplicar la migración 20260930_cuentas_financieras_y_caja.sql (ver docs/mejoras/README.md).</div>
            ) : (
              <>
                <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ marginTop: 3 }} checked={Boolean(form.cierre_a_ciegas)}
                    onChange={e => setField('cierre_a_ciegas', e.target.checked)} />
                  <span>
                    <span style={{ fontWeight: 600, display: 'block' }}>Cierre a ciegas</span>
                    <span style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5 }}>
                      El vendedor cuenta el efectivo y lo declara sin ver cuánto espera el sistema, y en su caja
                      no ve los totales en efectivo. Si viera el número, contaría hasta llegar a él y el arqueo no
                      controlaría nada. La diferencia la ves vos en Cajas → Cierres de turno.
                    </span>
                  </span>
                </label>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 12 }}>Acordate de tocar <strong>Guardar</strong>.</div>
              </>
            )}
          </div>
          )}

          {seccion === 'toma' && <ValoresTomaCard />}

          {seccion === 'datos' && <>
          {/* Invitá a otro local */}
          {referral?.code && (
            <div className="card" style={{ border: '1px solid var(--green)', background: 'var(--green-dim)' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Invitá a otro local y ganá U$50</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 12 }}>
                Pasale este link a un colega del rubro. Si se suma, te pasamos U$50.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  className="inp"
                  readOnly
                  value={referralLink}
                  onFocus={e => e.currentTarget.select()}
                  style={{ flex: 1, minWidth: 220, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                />
                <button className="btn btn-dark" onClick={() => {
                  navigator.clipboard?.writeText(referralLink);
                  toast.success('Link copiado');
                }}>
                  <Copy size={15} /> Copiar
                </button>
                <a
                  className="btn btn-outline"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://wa.me/?text=${encodeURIComponent(`Che, mirá este sistema que uso en el local para stock, ventas y reparaciones. Te dejo el link por si te sirve: ${referralLink}`)}`}
                >
                  Compartir
                </a>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 10 }}>
                Invitaste a <strong>{referral.invitados}</strong> · se quedaron <strong>{referral.pagos}</strong>
              </div>
            </div>
          )}

          {/* Respaldo */}
          <div className="card">
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Respaldo de tus datos</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5 }}>
                  Descargá todo el negocio en un archivo: inventario, ventas, cuenta corriente, mayoristas,
                  reparaciones, turnos, caja, gastos, clientes y la configuración del local. Se abre con Excel.
                </div>
              </div>
              <button className="btn btn-outline" onClick={handleBackup} disabled={backupLoading}>
                {backupLoading ? <Loader2 className="spin" size={16} /> : <Download size={16} />} Descargar respaldo
              </button>
            </div>
          </div>

          {/* Las claves dan acceso a costos y datos de clientes: sólo el dueño. */}
          {profile?.role === 'owner' && <ApiKeysCard />}
          </>}
          {VERSION && <div className="cfg-version-movil">Stackr v{VERSION}</div>}
        </div>

        {/* ── Vista previa en vivo ──
            Sólo en Negocio: en las otras secciones no hay nada que previsualizar
            y sólo robaría el ancho que necesitan las tablas. */}
        {seccion === 'negocio' && (
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
        )}
        </div>
      </div>
    </div>
  );
}
