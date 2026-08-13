"use client"
import { useRef, useState, useLayoutEffect } from 'react';

/**
 * Muestra un recibo a su tamaño de diseño real pero escalado para entrar en el
 * contenedor, conservando proporciones y tamaños de fuente (como un preview de
 * impresión). Así el A4 se ve como una hoja completa aunque el panel sea
 * angosto, y el ticket como una tira. No se deforma ni se desborda.
 */
export function ReceiptPreview({ naturalWidth, children }: { naturalWidth: number; children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const measure = () => {
      const avail = outerRef.current?.clientWidth ?? naturalWidth;
      const s = Math.min(1, avail / naturalWidth);
      setScale(s);
      const ih = innerRef.current?.offsetHeight ?? 0;
      setHeight(ih * s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (outerRef.current) ro.observe(outerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    return () => ro.disconnect();
  });

  return (
    <div ref={outerRef} className="receipt-scaler-outer" style={{ width: '100%', height, display: 'flex', justifyContent: 'center' }}>
      <div className="receipt-scaler" style={{ width: naturalWidth, transform: `scale(${scale})`, transformOrigin: 'top center', flexShrink: 0 }}>
        <div ref={innerRef} style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.14)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
