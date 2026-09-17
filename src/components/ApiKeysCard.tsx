"use client";

/**
 * Claves de API del negocio: crear, ver y revocar.
 *
 * Sólo para dueños (lo exige también la política RLS de `api_keys`). La
 * clave se genera en este navegador y nunca viaja al servidor: a la base va
 * únicamente su hash. Por eso se muestra una sola vez.
 */

import { useEffect, useState } from 'react';
import { KeyRound, Copy, Check, Plus, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { useConfirm } from '@/hooks/useConfirm';
import { SCOPES, type Scope } from '@/utils/api/compartido';
import { generarClave } from '@/utils/api/claveNavegador';

type Clave = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: Scope[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

/** Combinaciones típicas, para no tener que pensar permiso por permiso. */
const PRESETS: { nombre: string; detalle: string; scopes: Scope[] }[] = [
  {
    nombre: 'Catálogo para la web',
    detalle: 'Muestra equipos y accesorios. Sin costos ni datos de clientes.',
    scopes: ['stock:read', 'accessories:read', 'deposits:read'],
  },
  {
    nombre: 'Integración completa',
    detalle: 'Lee y escribe todo lo que permite la API, costos incluidos.',
    scopes: Object.keys(SCOPES) as Scope[],
  },
];

const fecha = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Nunca';

export function ApiKeysCard() {
  const supabase = createClient();
  const { confirm, ConfirmDialog } = useConfirm();

  const [claves, setClaves] = useState<Clave[]>([]);
  const [cargando, setCargando] = useState(true);
  const [habilitada, setHabilitada] = useState(true);

  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [scopes, setScopes] = useState<Scope[]>(PRESETS[0].scopes);
  const [guardando, setGuardando] = useState(false);

  const [nueva, setNueva] = useState<string | null>(null);
  const [copiada, setCopiada] = useState(false);

  const cargar = async () => {
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, scopes, created_at, last_used_at, revoked_at')
      .order('created_at', { ascending: false });
    // Si la tabla todavía no existe, la tarjeta lo dice en vez de romperse.
    if (error) setHabilitada(false);
    else setClaves((data || []) as Clave[]);
    setCargando(false);
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const alternar = (s: Scope) =>
    setScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const crear = async () => {
    if (!nombre.trim()) return toast.error('Poné un nombre para reconocer la clave');
    if (scopes.length === 0) return toast.error('Elegí al menos un permiso');
    setGuardando(true);
    try {
      const { clave, hash, prefijo } = await generarClave();
      const { error } = await supabase.from('api_keys').insert([{
        name: nombre.trim(), key_prefix: prefijo, key_hash: hash, scopes,
      }]);
      if (error) throw error;
      setNueva(clave);
      setCopiada(false);
      setCreando(false);
      setNombre('');
      setScopes(PRESETS[0].scopes);
      cargar();
    } catch (e: any) {
      toast.error(e.message || 'No se pudo crear la clave');
    } finally {
      setGuardando(false);
    }
  };

  const copiar = async () => {
    if (!nueva) return;
    await navigator.clipboard.writeText(nueva);
    setCopiada(true);
    toast.success('Clave copiada');
  };

  const revocar = async (c: Clave) => {
    const ok = await confirm(`¿Revocar la clave "${c.name}"? Lo que la esté usando deja de funcionar al instante. No se puede deshacer.`);
    if (!ok) return;
    const { error } = await supabase.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', c.id);
    if (error) return toast.error(error.message);
    toast.success('Clave revocada');
    cargar();
  };

  return (
    <div className="card">
      {ConfirmDialog}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyRound size={16} /> API
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5 }}>
            Conectá tu web u otro sistema con Stackr. Cada clave tiene sus propios permisos y se puede revocar cuando quieras.{' '}
            <a href="/docs/api" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text)', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              Documentación <ExternalLink size={11} />
            </a>
          </div>
        </div>
        {habilitada && !creando && (
          <button className="btn btn-outline" onClick={() => { setCreando(true); setNueva(null); }}>
            <Plus size={16} /> Nueva clave
          </button>
        )}
      </div>

      {cargando && <Loader2 className="spin" size={18} style={{ color: 'var(--text-3)' }} />}

      {!cargando && !habilitada && (
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
          La API todavía no está habilitada en tu cuenta.
        </div>
      )}

      {/* La clave recién creada: única vez que se ve completa */}
      {nueva && (
        <div style={{ border: '1px solid var(--green)', background: 'var(--green-dim)', borderRadius: 'var(--r)', padding: 14, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Copiá la clave ahora</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10, lineHeight: 1.5 }}>
            Es la única vez que se muestra. Guardala en un lugar seguro y usala sólo desde un servidor — nunca en el código de una página web, donde cualquiera puede leerla.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <code style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '8px 10px', fontSize: 12 }}>
              {nueva}
            </code>
            <button className="btn btn-dark" onClick={copiar}>
              {copiada ? <Check size={15} /> : <Copy size={15} />} {copiada ? 'Copiada' : 'Copiar'}
            </button>
          </div>
        </div>
      )}

      {creando && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 14, marginBottom: 16 }}>
          <label className="lbl">Nombre</label>
          <input className="inp" placeholder="Ej: Web del local, Contador, Tienda Nube" value={nombre} onChange={e => setNombre(e.target.value)} style={{ marginBottom: 14 }} />

          <label className="lbl">Permisos</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {PRESETS.map(p => (
              <button key={p.nombre} type="button" className="btn btn-outline" title={p.detalle} onClick={() => setScopes(p.scopes)} style={{ fontSize: 12 }}>
                {p.nombre}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6, marginBottom: 14 }}>
            {(Object.entries(SCOPES) as [Scope, string][]).map(([s, label]) => (
              <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={scopes.includes(s)} onChange={() => alternar(s)} />
                {label}
              </label>
            ))}
          </div>
          {scopes.includes('costs:read') && (
            <div style={{ fontSize: 12, color: 'var(--amber)', marginBottom: 12 }}>
              Con este permiso la clave ve costos y márgenes. Dáselo sólo a quien corresponda.
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setCreando(false)}>Cancelar</button>
            <button className="btn btn-dark" onClick={crear} disabled={guardando}>
              {guardando ? <Loader2 className="spin" size={15} /> : 'Crear clave'}
            </button>
          </div>
        </div>
      )}

      {!cargando && habilitada && claves.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {claves.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--border)', opacity: c.revoked_at ? 0.5 : 1 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {c.name} {c.revoked_at && <span style={{ color: 'var(--red)', fontWeight: 500 }}>· revocada</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  <code>{c.key_prefix}…</code> · {c.scopes.length} permisos · último uso: {fecha(c.last_used_at)}
                </div>
              </div>
              {!c.revoked_at && (
                <button className="btn btn-outline" onClick={() => revocar(c)} style={{ fontSize: 12, color: 'var(--red)' }}>
                  Revocar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!cargando && habilitada && claves.length === 0 && !creando && !nueva && (
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Todavía no creaste ninguna clave.</div>
      )}
    </div>
  );
}
