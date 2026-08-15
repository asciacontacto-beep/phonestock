"use client";
import { useState, useMemo, useRef } from 'react';
import { Search, Printer, X, Receipt as ReceiptIcon, Share2, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ReceiptDocument, type ReceiptData } from '@/components/Receipt';
import { ReceiptPreview } from '@/components/ReceiptPreview';
import {
  type ShopSettings, type ReceiptConfig, type ReceiptLine, type ReceiptExtraField,
  type ReceiptFormat, normalizeReceiptConfig,
} from '@/types/receipt';

const money = (n: number, cur: string) => `${cur === 'USD' ? 'U$' : '$'} ${(Number(n) || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
const genId = () => `${Date.now()}-${Math.round(Math.random() * 1e6)}`;

type Sale = Record<string, any>;

function saleToLines(sale: Sale): ReceiptLine[] {
  const accessories: any[] = sale.accessories || [];
  if (String(sale.brand || '').toUpperCase() === 'ACCESORIOS') {
    return accessories.map(a => ({
      id: genId(), description: String(a.name || 'Accesorio'),
      detail: a.is_gift ? 'regalo' : undefined,
      qty: Number(a.qty) || 1, amount: a.is_gift ? 0 : (Number(a.price) || 0) * (Number(a.qty) || 1),
    }));
  }
  return [
    { id: genId(), description: `${sale.brand || ''} ${sale.model || ''}`.trim() || 'Producto',
      detail: [sale.storage, sale.color].filter(Boolean).join(' · ') || undefined,
      qty: 1, amount: Number(sale.price) || 0 },
    ...accessories.map(a => ({
      id: genId(), description: String(a.name || 'Accesorio'),
      detail: a.is_gift ? 'regalo' : undefined,
      qty: Number(a.qty) || 1, amount: a.is_gift ? 0 : (Number(a.price) || 0) * (Number(a.qty) || 1),
    })),
  ];
}

const OVERRIDE_TOGGLES: { key: keyof ReceiptConfig; label: string }[] = [
  { key: 'showSeller', label: 'Asesor' },
  { key: 'showImei', label: 'IMEI' },
  { key: 'showPayments', label: 'Pagos' },
  { key: 'showWarranty', label: 'Garantía' },
  { key: 'showSignature', label: 'Firma' },
  { key: 'showCuit', label: 'CUIT' },
];

export function RecibosClient({ sales, shop }: { sales: Sale[]; shop: ShopSettings }) {
  const baseConfig = useMemo(() => normalizeReceiptConfig(shop.receipt_config), [shop.receipt_config]);

  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Sale | null>(null);
  const [generating, setGenerating] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Estado editable del recibo
  const [format, setFormat] = useState<ReceiptFormat>(baseConfig.format);
  const [overrides, setOverrides] = useState<Partial<ReceiptConfig>>({});
  const [currency, setCurrency] = useState('ARS');
  const [client, setClient] = useState({ name: '', dni: '', phone: '' });
  const [seller, setSeller] = useState('');
  const [lines, setLines] = useState<ReceiptLine[]>([]);
  const [payments, setPayments] = useState<{ label: string; amount: number }[]>([]);
  const [manualTotal, setManualTotal] = useState<string>('');
  const [warranty, setWarranty] = useState('');
  const [notes, setNotes] = useState('');
  const [extraFields, setExtraFields] = useState<ReceiptExtraField[]>([]);

  const cfg: ReceiptConfig = { ...baseConfig, ...overrides, format };

  const linesTotal = useMemo(() => lines.reduce((a, l) => a + (Number(l.amount) || 0), 0), [lines]);
  const total = manualTotal !== '' ? Number(manualTotal) || 0 : linesTotal;
  const paid = useMemo(() => payments.reduce((a, p) => a + (Number(p.amount) || 0), 0), [payments]);

  const openSale = (sale: Sale) => {
    setSelected(sale);
    setFormat(baseConfig.format);
    setOverrides({});
    setCurrency(sale.currency || 'ARS');
    setClient({ name: sale.customer?.name || '', dni: sale.customer?.dni || '', phone: sale.customer?.phone || '' });
    setSeller(sale.seller_name || '');
    setLines(saleToLines(sale));
    setPayments((sale.payments || []).map((p: any) => ({ label: String(p.label || p.id || 'Pago'), amount: Number(p.amount) || 0 })));
    setManualTotal('');
    setWarranty(String(sale.notes || '') || baseConfig.warrantyDefault);
    setNotes(sale.imei ? `IMEI/Serie: ${sale.imei}` : '');
    setExtraFields([]);
  };

  const receiptData: ReceiptData = {
    receiptNumber: selected ? `REC-${String(selected.id ?? '').slice(-6) || 'N/A'}` : '',
    date: selected?.created_at ? new Date(selected.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleDateString('es-AR'),
    seller,
    client,
    lines,
    payments: payments.length ? payments : undefined,
    currency,
    total,
    paid: paid || undefined,
    warranty,
    notes,
    extraFields,
  };

  const generatePdfBlob = async (): Promise<Blob> => {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);
    const node = receiptRef.current!;
    const canvas = await html2canvas(node, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    return pdf.output('blob');
  };

  const sharePdf = async () => {
    setGenerating(true);
    try {
      const blob = await generatePdfBlob();
      const fileName = `Recibo-${(client.name || 'cliente').trim().replace(/\s+/g, '_')}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (typeof navigator !== 'undefined' && (navigator as any).canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Recibo' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fileName; a.click();
        URL.revokeObjectURL(url);
        toast.success('PDF descargado');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast.error('Error al generar el PDF');
    } finally {
      setGenerating(false);
    }
  };

  const filtered = useMemo(() => {
    if (!q) return sales.slice(0, 50);
    const term = q.toLowerCase();
    return sales.filter(s => `${s.brand} ${s.model} ${s.customer?.name || ''}`.toLowerCase().includes(term)).slice(0, 50);
  }, [sales, q]);

  // ── helpers de edición de líneas / pagos / extras ──
  const updateLine = (id: string, patch: Partial<ReceiptLine>) => setLines(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l));
  const addLine = () => setLines(ls => [...ls, { id: genId(), description: '', qty: 1, amount: 0 }]);
  const removeLine = (id: string) => setLines(ls => ls.filter(l => l.id !== id));

  const updatePayment = (i: number, patch: Partial<{ label: string; amount: number }>) => setPayments(ps => ps.map((p, idx) => idx === i ? { ...p, ...patch } : p));
  const addPayment = () => setPayments(ps => [...ps, { label: 'Pago', amount: 0 }]);
  const removePayment = (i: number) => setPayments(ps => ps.filter((_, idx) => idx !== i));

  const updateExtra = (id: string, patch: Partial<ReceiptExtraField>) => setExtraFields(fs => fs.map(f => f.id === id ? { ...f, ...patch } : f));
  const addExtra = () => setExtraFields(fs => [...fs, { id: genId(), label: '', value: '' }]);
  const removeExtra = (id: string) => setExtraFields(fs => fs.filter(f => f.id !== id));

  return (
    <div className="page">
      <div className="sh">
        <div>
          <h1 className="st">Recibo</h1>
          <p className="helper-text">Elegí una venta y personalizá cada dato del comprobante antes de enviarlo.</p>
        </div>
      </div>

      <div className="search-bar" style={{ marginBottom: 16 }}>
        <Search size={16} color="var(--text-3)" />
        <input className="inp" placeholder="Buscar por cliente, marca o modelo..." value={q} onChange={e => setQ(e.target.value)} />
      </div>

      <div className="tw">
        <table className="table">
          <thead>
            <tr><th>Fecha</th><th>Cliente</th><th>Producto</th><th style={{ width: 40 }}></th></tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} onClick={() => openSale(s)} style={{ cursor: 'pointer' }}>
                <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.created_at ? new Date(s.created_at).toLocaleDateString('es-AR') : ''}</td>
                <td>{s.customer?.name || '-'}</td>
                <td style={{ fontWeight: 600 }}>
                  {s.brand === 'ACCESORIOS' ? (s.accessories || []).map((a: any) => `${a.qty}x ${a.name}`).join(', ') : `${s.brand} ${s.model}`}
                </td>
                <td><ReceiptIcon size={14} color="var(--text-3)" /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>No hay ventas.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="mo" onClick={() => setSelected(null)}>
          <div className="mb receipt-editor" onClick={e => e.stopPropagation()}>
            <div className="mh no-print">
              <div className="mh-title">Personalizar recibo</div>
              <button className="btn-icon" onClick={() => setSelected(null)}><X size={18} /></button>
            </div>

            <div className="receipt-editor-body">
              {/* ── Columna: edición ── */}
              <div className="receipt-editor-form no-print">
                {/* Formato + overrides */}
                <div className="field">
                  <label className="lbl">Formato</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['ticket', 'a4'] as ReceiptFormat[]).map(f => (
                      <button key={f} className={`btn-pill${format === f ? ' active' : ''}`} onClick={() => setFormat(f)}>
                        {f === 'ticket' ? 'Ticket' : 'A4'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <label className="lbl">Mostrar</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {OVERRIDE_TOGGLES.map(t => {
                      const on = Boolean(cfg[t.key]);
                      return (
                        <button key={t.key} className="toggle-chip" data-on={on}
                          onClick={() => setOverrides(o => ({ ...o, [t.key]: !on }))}>
                          <span className="toggle-dot" />{t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="divider" />

                {/* Cliente */}
                <label className="lbl" style={{ display: 'block', marginBottom: 8 }}>Cliente</label>
                <div className="field"><input className="inp" placeholder="Nombre" value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} /></div>
                <div className="row">
                  <div className="col field"><input className="inp" placeholder="DNI / CUIT" value={client.dni} onChange={e => setClient({ ...client, dni: e.target.value })} /></div>
                  <div className="col field"><input className="inp" placeholder="Teléfono" value={client.phone} onChange={e => setClient({ ...client, phone: e.target.value })} /></div>
                </div>
                {cfg.showSeller && (
                  <div className="field"><input className="inp" placeholder="Asesor / vendedor" value={seller} onChange={e => setSeller(e.target.value)} /></div>
                )}

                <div className="divider" />

                {/* Productos */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="lbl">Detalle</label>
                  <button className="btn-ghost" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-2)' }} onClick={addLine}><Plus size={13} /> Agregar</button>
                </div>
                {lines.map(l => (
                  <div key={l.id} className="receipt-line-edit">
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <input className="inp" placeholder="Descripción" value={l.description} onChange={e => updateLine(l.id, { description: e.target.value })} />
                      <input className="inp" placeholder="Detalle (opcional)" style={{ fontSize: 12 }} value={l.detail || ''} onChange={e => updateLine(l.id, { detail: e.target.value })} />
                    </div>
                    <input className="inp" type="number" title="Cantidad" style={{ width: 56 }} value={l.qty} onChange={e => updateLine(l.id, { qty: Number(e.target.value) || 1 })} />
                    <input className="inp" type="number" title="Importe" style={{ width: 100 }} value={l.amount} onChange={e => updateLine(l.id, { amount: Number(e.target.value) || 0 })} />
                    <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => removeLine(l.id)}><Trash2 size={14} /></button>
                  </div>
                ))}

                <div className="row" style={{ marginTop: 10 }}>
                  <div className="col field" style={{ maxWidth: 110 }}>
                    <label className="lbl">Moneda</label>
                    <select className="inp" value={currency} onChange={e => setCurrency(e.target.value)}>
                      <option value="ARS">ARS</option><option value="USD">USD</option>
                    </select>
                  </div>
                  <div className="col field">
                    <label className="lbl">Total {manualTotal === '' && <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(auto: {money(linesTotal, currency)})</span>}</label>
                    <input className="inp" type="number" placeholder={String(linesTotal)} value={manualTotal} onChange={e => setManualTotal(e.target.value)} />
                  </div>
                </div>

                {cfg.showPayments && (
                  <>
                    <div className="divider" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <label className="lbl">Pagos</label>
                      <button className="btn-ghost" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-2)' }} onClick={addPayment}><Plus size={13} /> Agregar</button>
                    </div>
                    {payments.map((p, i) => (
                      <div key={i} className="receipt-line-edit">
                        <input className="inp" style={{ flex: 1 }} placeholder="Medio de pago" value={p.label} onChange={e => updatePayment(i, { label: e.target.value })} />
                        <input className="inp" type="number" style={{ width: 110 }} value={p.amount} onChange={e => updatePayment(i, { amount: Number(e.target.value) || 0 })} />
                        <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => removePayment(i)}><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </>
                )}

                <div className="divider" />

                {cfg.showWarranty && (
                  <div className="field"><label className="lbl">Garantía</label><input className="inp" value={warranty} onChange={e => setWarranty(e.target.value)} /></div>
                )}
                <div className="field"><label className="lbl">Nota / IMEI</label><input className="inp" value={notes} onChange={e => setNotes(e.target.value)} /></div>

                {/* Campos extra */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="lbl">Campos extra</label>
                  <button className="btn-ghost" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-2)' }} onClick={addExtra}><Plus size={13} /> Agregar</button>
                </div>
                {extraFields.map(f => (
                  <div key={f.id} className="receipt-line-edit">
                    <input className="inp" style={{ flex: 1 }} placeholder="Etiqueta" value={f.label} onChange={e => updateExtra(f.id, { label: e.target.value })} />
                    <input className="inp" style={{ flex: 1 }} placeholder="Valor" value={f.value} onChange={e => updateExtra(f.id, { value: e.target.value })} />
                    <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => removeExtra(f.id)}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>

              {/* ── Columna: vista previa ── */}
              <div className="receipt-editor-preview">
                <div className="receipt-preview-scroll">
                  <ReceiptPreview naturalWidth={cfg.format === 'a4' ? 720 : 300}>
                    <div ref={receiptRef}>
                      <ReceiptDocument shop={shop} config={cfg} data={receiptData} />
                    </div>
                  </ReceiptPreview>
                </div>
                <div className="receipt-editor-actions no-print">
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => window.print()}>
                    <Printer size={14} /> Imprimir
                  </button>
                  <button className="btn btn-dark" style={{ flex: 1 }} onClick={sharePdf} disabled={generating}>
                    {generating ? <Loader2 size={14} className="spin" /> : <Share2 size={14} />} Compartir PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
