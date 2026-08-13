"use client"
import { useState, useEffect, useRef } from 'react';
import { X, Printer, Share2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { RepairOrderDocument, type RepairOrderData } from '@/components/RepairOrderDocument';
import { ReceiptPreview } from '@/components/ReceiptPreview';
import type { ShopSettings, ReceiptConfig, ReceiptFormat } from '@/types/receipt';

/**
 * Modal de la Orden de Reparación premium. Se abre con el evento
 * 'open-repair-order' (detail = repair), así se dispara tanto al crear una
 * orden como desde el detalle, sin acoplar con el resto del componente.
 */
export function RepairOrderModal({ shop, config }: { shop: ShopSettings; config: ReceiptConfig }) {
  const [repair, setRepair] = useState<RepairOrderData | null>(null);
  const [format, setFormat] = useState<ReceiptFormat>(config.format);
  const [generating, setGenerating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      setRepair((e as CustomEvent).detail as RepairOrderData);
      setFormat(config.format);
    };
    window.addEventListener('open-repair-order', onOpen);
    return () => window.removeEventListener('open-repair-order', onOpen);
  }, [config.format]);

  if (!repair) return null;

  const cfg: ReceiptConfig = { ...config, format };

  const sharePdf = async () => {
    setGenerating(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);
      const node = ref.current!;
      const canvas = await html2canvas(node, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
      const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
      const blob = pdf.output('blob');
      const fileName = `Orden-${(repair.customer_name || 'cliente').trim().replace(/\s+/g, '_')}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (typeof navigator !== 'undefined' && (navigator as any).canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Orden de reparación' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
        URL.revokeObjectURL(url);
        toast.success('PDF descargado');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast.error('Error al generar el PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mo" onClick={() => setRepair(null)}>
      <div className="mb receipt-editor" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="mh no-print">
          <div className="mh-title">Orden de reparación</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {(['ticket', 'a4'] as ReceiptFormat[]).map(f => (
              <button key={f} className={`btn-pill${format === f ? ' active' : ''}`} onClick={() => setFormat(f)}>
                {f === 'ticket' ? 'Ticket' : 'A4'}
              </button>
            ))}
            <button className="btn-icon" onClick={() => setRepair(null)}><X size={18} /></button>
          </div>
        </div>

        <div className="receipt-editor-preview" style={{ maxHeight: '68vh' }}>
          <div className="receipt-preview-scroll">
            <ReceiptPreview naturalWidth={format === 'a4' ? 720 : 300}>
              <div ref={ref}>
                <RepairOrderDocument shop={shop} config={cfg} repair={repair} />
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
  );
}
