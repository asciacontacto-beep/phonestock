"use client"
import { useState, useRef, useEffect } from 'react';
import { buscarEquipoPorCodigo, codigoCanonico, esImei, type EquipoDeCodigo } from '@/utils/codigos';
import { ScanLine, Check, PenLine, Camera, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { ManualEntryModal } from '@/components/ManualEntryModal';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';
import { limpiarImei, buscarImeisEnStock, avisoDuplicado, esErrorImeiRepetido } from '@/utils/imei';

const isOldPro = (m: string) => {
  if (!m || typeof m !== 'string') return false;
  return m.includes('Pro') && (m.includes('14') || m.includes('13') || m.includes('12') || m.includes('11') || m.includes('XS'));
};

export function ScanClient({ initialDeposits, isOwner = false }: { initialDeposits: any[]; isOwner?: boolean }) {
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'idle' | 'confirm'>('idle');
  const [det, setDet] = useState<any>(null);
  const [dep, setDep] = useState<any>(initialDeposits[0]?.id);
  const [sup, setSup] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [price, setPrice] = useState('');
  const [costo, setCosto] = useState('');
  /* El vendedor ve el costo sólo si el local lo habilitó (Configuración →
     Vendedores); lo escribe, nunca lo lee. */
  const [vendedorCargaCosto, setVendedorCargaCosto] = useState(false);
  const verCosto = isOwner || vendedorCargaCosto;
  const [buscando, setBuscando] = useState(false);
  /* Código que no se reconoció: va a la carga manual y queda aprendido. */
  const [codigoNuevo, setCodigoNuevo] = useState('');
  const [cur, setCur] = useState('USD');
  const [imei, setImei] = useState('');
  const [cond, setCond] = useState('new');
  const [battery, setBattery] = useState('100%');
  const [notes, setNotes] = useState('');
  const [showManual, setShowManual] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  /* Después de reconocer la caja, el siguiente código que se pistolea es el
     IMEI: el cursor va ahí. Antes iba al precio y el IMEI terminaba
     escrito en el campo de plata. */
  const imeiRef = useRef<HTMLInputElement>(null);
  const precioRef = useRef<HTMLInputElement>(null);

  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('suppliers').select('*').order('name').then(({ data }) => {
      if (data && data.length > 0) {
        setSuppliers(data);
        setSup(data[0].id);
      }
    });
    ref.current?.focus();
    if (!isOwner) {
      supabase.from('settings').select('vendedor_carga_costo').limit(1).maybeSingle()
        .then(({ data, error }) => setVendedorCargaCosto(!error && Boolean((data as { vendedor_carga_costo?: boolean } | null)?.vendedor_carga_costo)));
    }
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const processCode = async (scannedCode: string) => {
    const leido = scannedCode.trim();
    setCode('');
    if (!leido) return;

    // Se pistoleó el IMEI en el campo del código.
    if (esImei(leido)) {
      if (mode === 'confirm' && det) {
        setImei(limpiarImei(leido));
        toast.success('IMEI cargado');
        precioRef.current?.focus();
      } else {
        toast.error('Ese es el IMEI. Primero escaneá el código de barras del modelo (UPC/EAN) de la caja, y después el IMEI.');
      }
      return;
    }

    setBuscando(true);
    const found: EquipoDeCodigo | null = await buscarEquipoPorCodigo(supabase, leido).catch(() => null);
    setBuscando(false);
    if (found) {
      setDet(found);
      setCond(isOldPro(found.model) ? 'used' : 'new');
      setImei('');
      setMode('confirm');
      setTimeout(() => imeiRef.current?.focus(), 50);
    } else {
      toast.error('Código no registrado: completá el equipo una vez y la próxima lo reconoce solo.');
      setCodigoNuevo(codigoCanonico(leido));
      setShowManual(true);
    }
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
    if (!det || !price || !dep) { toast.error('Completá el precio de venta y el depósito'); return; }
    if (isOwner && !costo) { toast.error('Completá el costo'); return; }
    try {
      // Mismo control que en la carga manual: el equipo no puede entrar dos
      // veces al stock disponible.
      const yaEstan = await buscarImeisEnStock(supabase, [imei]);
      if (yaEstan.length > 0) { toast.error(avisoDuplicado(yaEstan)); return; }

      const { data: inserted, error } = await supabase.from('stock').insert([{
        brand: det.brand,
        model: det.model,
        storage: det.storage,
        color: det.color,
        condition: cond,
        battery: cond === 'used' ? battery : null,
        imei: limpiarImei(imei) || `S/N-${Date.now()}`,
        // Antes el campo decía "Precio Costo" pero se guardaba como precio de
        // venta, y el costo quedaba vacío.
        price: parseFloat(price),
        cost_price: verCosto && costo ? parseFloat(costo) : null,
        currency: cur,
        upc: det.codigo || null,
        deposit: dep,
        supplier_id: sup,
        status: 'available',
        notes: notes.trim() || null
      }]).select('id');
      if (error) throw error;
      if (inserted) {
        toast.success('✅ Equipo ingresado al stock');
        setMode('idle'); setDet(null); setPrice(''); setCosto(''); setImei(''); setCond('new'); setBattery('100%'); setNotes('');
        ref.current?.focus();
      }
    } catch (e: any) {
      if (esErrorImeiRepetido(e)) {
        toast.error('Este IMEI ya está en el inventario disponible.');
      } else {
        toast.error(e.message || 'Error al guardar');
      }
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
          <button className="btn btn-dark" onClick={onScan} disabled={buscando} title="Buscar el código" aria-label="Buscar el código"><ScanLine size={18} /></button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10 }}>
          Escaneá el código de barras del modelo (UPC/EAN) y después el IMEI. Si el código no está registrado se abre la
          carga manual con el código puesto: lo completás una vez y la próxima lo reconoce solo.
        </p>
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
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="field" style={{ margin: 0 }}>
              <label className="lbl">IMEI / Serie</label>
              <input ref={imeiRef} className="inp" value={imei} onChange={e => setImei(e.target.value)} placeholder="Pistoleá el IMEI"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setImei(limpiarImei(imei)); precioRef.current?.focus(); } }} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="lbl">Precio de venta</label>
              <input ref={precioRef} className="inp" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" />
            </div>
            {verCosto && (
              <div className="field" style={{ margin: 0 }}>
                <label className="lbl">Costo{!isOwner && ' (opcional)'}</label>
                <input className="inp" type="number" value={costo} onChange={e => setCosto(e.target.value)} placeholder="0" />
              </div>
            )}
            <div className="field" style={{ margin: 0 }}>
              <label className="lbl">Moneda</label>
              <select className="inp" value={cur} onChange={e => setCur(e.target.value)}>
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="lbl">Condición</label>
              <select className="inp" value={cond} onChange={e => setCond(e.target.value)}>
                <option value="new">Sellado</option>
                <option value="used">Usado</option>
              </select>
            </div>
            {cond === 'used' && (
              <div className="field" style={{ margin: 0 }}>
                <label className="lbl">Batería</label>
                <datalist id="battery-scan-options">
                  {['100%', '95%', '90%', '85%', '80%', '75%', '70%', 'Sin dato'].map(b => <option key={b} value={b} />)}
                </datalist>
                <input className="inp" list="battery-scan-options" placeholder="Ej: 87%" value={battery} onChange={e => setBattery(e.target.value)} />
              </div>
            )}
            <div className="field" style={{ margin: 0 }}>
              <label className="lbl">Depósito</label>
              <select className="inp" value={dep ? String(dep) : ''} onChange={e => setDep(e.target.value)}>
                {initialDeposits.map((d: any) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
              </select>
            </div>
            {suppliers.length > 0 && (
              <div className="field" style={{ margin: 0 }}>
                <label className="lbl">Proveedor</label>
                <select className="inp" value={sup ? String(sup) : ''} onChange={e => setSup(e.target.value)}>
                  {suppliers.map((s: any) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label className="lbl">Observaciones (opcional)</label>
            <input className="inp" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: golpe en marco, sin caja..." />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => { setMode('idle'); setDet(null); }}>Cancelar</button>
            <button className="btn btn-dark btn-lg" style={{ flex: 1 }} onClick={confirm}>
              <Check size={18} style={{ marginRight: 8 }} /> Confirmar Ingreso
            </button>
          </div>
        </div>
      )}

      <ManualEntryModal
        open={showManual}
        isOwner={isOwner}
        upcInicial={codigoNuevo}
        onClose={() => { setShowManual(false); setCodigoNuevo(''); ref.current?.focus(); }}
        onSuccess={() => toast.success('Equipo ingresado.')}
      />
    </div>
  );
}
