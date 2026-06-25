"use client"
import { useState, useEffect } from 'react';
import { Save, Building2, MapPin, Camera, Phone, FileText, Loader2, DollarSign } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

const DEFAULTS = {
  shop_name: 'Stackr',
  address: 'Av. Corrientes 1234, CABA',
  phone: '+54 11 1234-5678',
  instagram: '@phonestock.arg',
  warranty_text: 'Garantía de 90 días por fallas de fábrica. El equipo debe estar en las mismas condiciones de entrega.',
  exchange_rate: 1200,
};

export function SettingsClient({ profile }: { profile: any }) {
  const [form, setForm] = useState<any>(DEFAULTS);
  const [rowId, setRowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      setFetching(true);
      const { data, error } = await supabase.from('settings').select('*').limit(1);
      if (data && data.length > 0) {
        const { id, org_id, ...rest } = data[0];
        setRowId(id ?? null);
        setForm({ ...DEFAULTS, ...rest });
      } else if (error) {
        console.error('settings fetch error:', error);
      }
      setFetching(false);
    };
    load();
  }, []);

  const save = async () => {
    try {
      setLoading(true);
      if (!profile?.org_id) throw new Error('No se encontró la organización asociada');

      const payload: any = { org_id: profile.org_id, ...form };

      if (rowId) {
        const { org_id: _ignored, ...updatePayload } = payload;
        const { error } = await supabase.from('settings').update(updatePayload).eq('id', rowId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('settings').insert(payload).select('id').single();
        if (error) throw error;
        if (data?.id) setRowId(data.id);
      }

      toast.success('Configuración guardada correctamente');
    } catch (e: any) {
      console.error('settings save error:', e);
      toast.error('No se pudo guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

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
        <div className="st">Configuración del Sistema</div>
        <div className="ss2">Personaliza la identidad de tu negocio y tus comprobantes</div>
      </div>

      <div className="row">
        <div className="col card">
          <div className="lbl" style={{ marginBottom: 20 }}>Información del Local</div>

          <div className="field">
            <label className="lbl">Nombre del Negocio</label>
            <div style={{ position: 'relative' }}>
              <Building2 size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-3)' }} />
              <input className="inp" style={{ paddingLeft: 40 }} value={form.shop_name || ''} onChange={e => setForm({...form, shop_name: e.target.value})} />
            </div>
          </div>

          <div className="field">
            <label className="lbl">Dirección Física</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-3)' }} />
              <input className="inp" style={{ paddingLeft: 40 }} value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} />
            </div>
          </div>

          <div className="row">
            <div className="col field">
              <label className="lbl">WhatsApp de Contacto</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-3)' }} />
                <input className="inp" style={{ paddingLeft: 40 }} value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
            </div>
            <div className="col field">
              <label className="lbl">Instagram</label>
              <div style={{ position: 'relative' }}>
                <Camera size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-3)' }} />
                <input className="inp" style={{ paddingLeft: 40 }} value={form.instagram || ''} onChange={e => setForm({...form, instagram: e.target.value})} />
              </div>
            </div>
          </div>
        </div>

        <div className="col card">
          <div className="lbl" style={{ marginBottom: 20 }}>Configuración de Ticket</div>

          <div className="field">
            <label className="lbl">Texto de Garantía / Términos</label>
            <div style={{ position: 'relative' }}>
              <FileText size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-3)' }} />
              <textarea
                className="inp"
                style={{ paddingLeft: 40, minHeight: 120, resize: 'none' }}
                value={form.warranty_text || ''}
                onChange={e => setForm({...form, warranty_text: e.target.value})}
              />
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>Este texto aparecerá al final de todos los comprobantes impresos.</p>
          </div>

          <div className="field">
            <label className="lbl">Tipo de Cambio USD → ARS</label>
            <div style={{ position: 'relative' }}>
              <DollarSign size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-3)' }} />
              <input
                className="inp"
                style={{ paddingLeft: 40 }}
                type="number"
                value={form.exchange_rate || ''}
                onChange={e => setForm({...form, exchange_rate: parseFloat(e.target.value) || 0})}
                placeholder="Ej: 1200"
              />
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>Se usa para calcular el total en ARS cuando hay ventas mixtas en el dashboard.</p>
          </div>

          <div className="divider" />

          <button className="btn btn-dark btn-lg" style={{ width: '100%' }} onClick={save} disabled={loading || fetching}>
            {loading ? <Loader2 className="spin" size={20} /> : <><Save size={18} style={{ marginRight: 8 }} /> Guardar Configuración</>}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24, background: 'var(--surface-3)', border: '1px dashed var(--border)' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Vista Previa de Identidad</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Así es como tus clientes verán tu marca en el sistema y los recibos.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
