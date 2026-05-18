"use client"
import { useState, useRef, useEffect } from 'react';
import { EAN_DB } from '@/constants/data';
import { ScanLine, Check, PenLine, Camera, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { ManualEntryModal } from '@/components/ManualEntryModal';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';

export function ScanClient({ initialDeposits }: { initialDeposits: any[] }) {
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'idle' | 'confirm'>('idle');
  const [det, setDet] = useState<any>(null);
  const [dep, setDep] = useState<any>(initialDeposits[0]?.id);
  const [price, setPrice] = useState('');
  const [cur, setCur] = useState('USD');
  const [imei, setImei] = useState('');
  const [showManual, setShowManual] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const supabase = createClient();

  useEffect(() => {
    ref.current?.focus();
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const processCode = (scannedCode: string) => {
    if (!scannedCode.trim()) return;
    const found = EAN_DB[scannedCode.trim()];
    if (found) {
      setDet(found);
      setMode('confirm');
    } else {
      toast.error('EAN no reconocido — completá los datos manualmente');
      setShowManual(true);
    }
    setCode('');
  };

  const onScan = () => processCode(code);

  const startCamera = async () => {
    setScanning(true);
    setTimeout(() => {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          if (scannerRef.current) {
            scannerRef.current.stop().then(() => {
              setScanning(false);
              setCode(decodedText);
              processCode(decodedText);
            }).catch(() => {});
          }
        },
        () => {}
      ).catch(() => {
        setScanning(false);
        toast.error('Error al acceder a la cámara. Revisa los permisos.');
      });
    }, 200);
  };

  const stopCamera = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        setScanning(false);
      }).catch(() => {
        setScanning(false);
      });
    } else {
      setScanning(false);
    }
  };

  const confirm = async () => {
    if (!det || !price || !dep) { toast.error('Datos incompletos'); return; }
    try {
      const { data: inserted, error } = await supabase.from('stock').insert([{
        brand: det.brand,
        model: det.model,
        storage: det.storage,
        color: det.color,
        condition: 'new',
        imei: imei || `S/N-${Date.now()}`,
        price: parseFloat(price),
        currency: cur,
        deposit: dep,
        status: 'available'
      }]).select();
      if (error) throw error;
      if (inserted) {
        toast.success('✅ Equipo ingresado al stock');
        setMode('idle'); setDet(null); setPrice(''); setImei('');
        ref.current?.focus();
      }
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    }
  };

  return (
    <div className="page">
      <div className="sh" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="st">Ingreso de Stock</h1>
          <p className="helper-text">Escaneá el código EAN de la caja o usá la carga manual.</p>
        </div>
        <button className="btn btn-outline" onClick={() => setShowManual(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <PenLine size={16} /> Carga Manual
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="lbl">Escanear Caja (EAN / UPC)</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-dark" style={{ padding: '0 20px' }} onClick={startCamera} title="Escanear con Cámara">
            <Camera size={18} />
          </button>
          <input
            ref={ref} className="inp" value={code} onChange={e => setCode(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onScan(); } }}
            placeholder="Pistoleá el código o escanea con la cámara..." style={{ fontSize: 16, padding: 16, flex: 1 }} autoComplete="off"
          />
          <button className="btn btn-dark" onClick={onScan}><ScanLine size={18} /></button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10 }}>Si el código no está registrado, se abrirá el formulario de carga manual automáticamente.</p>
        {scanning && (
          <div style={{ marginTop: 20, position: 'relative', borderRadius: 12, overflow: 'hidden', border: '2px solid var(--border)' }}>
            <div id="reader" style={{ width: '100%' }}></div>
            <button className="btn btn-dark" style={{ position: 'absolute', top: 10, right: 10, padding: 8, borderRadius: '50%', zIndex: 10, minHeight: 'auto' }} onClick={stopCamera}>
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {mode === 'confirm' && det && (
        <div className="card">
          <div className="lbl">✅ Equipo Detectado — Confirmar Ingreso</div>
          <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 8, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{det.brand} {det.model}</div>
            <div style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>{det.storage} · {det.color}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="field" style={{ margin: 0 }}>
              <label className="lbl">Precio Costo</label>
              <input className="inp" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" autoFocus />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="lbl">Moneda</label>
              <select className="inp" value={cur} onChange={e => setCur(e.target.value)}>
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="lbl">IMEI / Serie</label>
              <input className="inp" value={imei} onChange={e => setImei(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="lbl">Depósito</label>
              <select className="inp" value={dep ? String(dep) : ''} onChange={e => setDep(e.target.value)}>
                {initialDeposits.map((d: any) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => { setMode('idle'); setDet(null); }}>Cancelar</button>
            <button className="btn btn-dark btn-lg" style={{ flex: 1 }} onClick={confirm}>
              <Check size={18} style={{ marginRight: 8 }} /> Confirmar Ingreso
            </button>
          </div>
        </div>
      )}

      <ManualEntryModal open={showManual} onClose={() => setShowManual(false)} onSuccess={() => toast.success('Equipo ingresado.')} />
    </div>
  );
}
