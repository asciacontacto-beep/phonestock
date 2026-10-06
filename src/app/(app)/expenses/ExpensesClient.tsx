"use client"
import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X, Search, Pencil, Repeat, TrendingDown, TrendingUp, Receipt } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/hooks/useConfirm';
import { EmptyState } from '@/components/EmptyState';
import { diaLocal } from '@/utils/fechas';
import { aceptaCuenta, cuentasDelMetodo, type Cuenta } from '@/utils/cuentas';
import { cargarCuentas } from '@/utils/cuentasDb';
import { useEsCelular } from '@/hooks/useEsCelular';
import { GastosMobile } from './GastosMobile';
import {
  CATEGORIAS_GASTO, METODOS_GASTO, MARCA_GASTO, PERIODOS,
  validarGasto, momentoDelGasto, movimientoDelGasto, origenDelGasto, nombreDelMetodo,
  rangoDelPeriodo, enRango, resumenDeGastos, variacion,
  type DatosGasto, type Gasto, type PagoGasto, type MonedaGasto, type Periodo,
} from '@/utils/gastos';

interface Deposito { id: string; name: string; color?: string | null }

interface Formulario {
  descripcion: string
  monto: string
  moneda: MonedaGasto
  categoria: string
  fecha: string
  metodo: string
  cuentaId: string
  depositoId: string
}

const usd = (n: number) => `U$ ${Math.round(n).toLocaleString('es-AR')}`;
const ars = (n: number) => `$ ${Math.round(n).toLocaleString('es-AR')}`;
const montoDe = (g: Pick<Gasto, 'amount' | 'currency'>) =>
  g.currency === 'USD' ? `U$ ${Number(g.amount).toLocaleString('es-AR')}` : ars(Number(g.amount));

export function ExpensesClient({ initialExpenses, deposits, pagosPorGasto, cotizacion, currentUser }: {
  initialExpenses: Gasto[];
  deposits: Deposito[];
  pagosPorGasto: Record<string, PagoGasto[]>;
  cotizacion: number;
  currentUser: { id: string; email: string; name: string };
}) {
  const supabase = createClient();
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const celular = useEsCelular();

  const [gastos, setGastos] = useState<Gasto[]>(initialExpenses);
  const [pagos, setPagos] = useState<Record<string, PagoGasto[]>>(pagosPorGasto);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  useEffect(() => { cargarCuentas(supabase, { soloActivas: true }).then(r => setCuentas(r.cuentas)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [categoria, setCategoria] = useState<string | null>(null);
  const [deposito, setDeposito] = useState('all');
  const [q, setQ] = useState('');
  const [visibles, setVisibles] = useState(50);

  const [form, setForm] = useState<Formulario | null>(null);
  const [editando, setEditando] = useState<Gasto | null>(null);
  const [guardando, setGuardando] = useState(false);

  const hoy = diaLocal(new Date());
  const { actual, anterior } = useMemo(() => rangoDelPeriodo(periodo, hoy), [periodo, hoy]);
  const etiquetaPeriodo = PERIODOS.find(p => p.id === periodo)?.label.toLowerCase() || '';

  const delDeposito = useMemo(
    () => gastos.filter(g => deposito === 'all' || String(g.deposit_id) === deposito),
    [gastos, deposito],
  );
  const enPeriodo = useMemo(() => delDeposito.filter(g => enRango(g.created_at, actual)), [delDeposito, actual]);
  const resumen = useMemo(() => resumenDeGastos(enPeriodo, cotizacion), [enPeriodo, cotizacion]);
  const resumenAnterior = useMemo(
    () => anterior ? resumenDeGastos(delDeposito.filter(g => enRango(g.created_at, anterior)), cotizacion) : null,
    [delDeposito, anterior, cotizacion],
  );
  const cambio = resumenAnterior ? variacion(resumen.totalUSD, resumenAnterior.totalUSD) : null;

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return enPeriodo
      .filter(g => !categoria || g.category === categoria)
      .filter(g => !t || [g.description, g.category, g.seller_name].some(x => String(x || '').toLowerCase().includes(t)));
  }, [enPeriodo, categoria, q]);

  const nombreDeposito = (id?: string | null) => deposits.find(d => String(d.id) === String(id))?.name || '—';
  const variosDepositos = deposits.length > 1;

  // ── Formulario ──────────────────────────────────────────────────────────

  const formVacio = (): Formulario => ({
    descripcion: '', monto: '', moneda: 'ARS', categoria: 'Alquiler', fecha: hoy,
    metodo: 'ars_cash', cuentaId: '', depositoId: deposito !== 'all' ? deposito : String(deposits[0]?.id || ''),
  });

  const desdeGasto = (g: Gasto, fecha: string): Formulario => {
    const origen = origenDelGasto({ payments: pagos[String(g.id)] });
    const moneda: MonedaGasto = g.currency === 'USD' ? 'USD' : 'ARS';
    const metodo = origen.metodo && METODOS_GASTO[moneda].some(m => m.id === origen.metodo) ? origen.metodo : METODOS_GASTO[moneda][0].id;
    return {
      descripcion: g.description, monto: String(g.amount), moneda, categoria: g.category, fecha, metodo,
      cuentaId: pagos[String(g.id)]?.[0]?.account_id || '',
      depositoId: g.deposit_id ? String(g.deposit_id) : String(deposits[0]?.id || ''),
    };
  };

  const abrirNuevo = () => { setEditando(null); setForm(formVacio()); };
  const abrirRepetir = (g: Gasto) => { setEditando(null); setForm(desdeGasto(g, hoy)); };
  const abrirEditar = (g: Gasto) => { setEditando(g); setForm(desdeGasto(g, diaLocal(g.created_at))); };
  const cerrar = () => { if (!guardando) { setForm(null); setEditando(null); } };

  // Un gasto se paga desde el banco o la billetera del local; la cuenta de
  // una financiera o de la procesadora de tarjetas es donde entran cobros.
  const cuentaPorDefecto = (metodo: string) =>
    cuentasDelMetodo(cuentas, metodo).find(c => c.kind === 'banco' || c.kind === 'billetera')?.id || '';

  const cuentasPosibles: Pick<Cuenta, 'id' | 'name'>[] = (() => {
    if (!form || !aceptaCuenta(form.metodo)) return [];
    const activas: Pick<Cuenta, 'id' | 'name'>[] = cuentasDelMetodo(cuentas, form.metodo);
    // Al editar, la cuenta original sigue en la lista aunque se haya dado de baja.
    const original = editando ? pagos[String(editando.id)]?.[0] : null;
    if (original?.account_id && original.account_id === form.cuentaId && !activas.some(c => c.id === original.account_id)) {
      return [...activas, { id: original.account_id, name: original.account_name || 'Cuenta dada de baja' }];
    }
    return activas;
  })();

  const datosDelForm = (f: Formulario): DatosGasto => {
    const cuenta = aceptaCuenta(f.metodo) ? cuentasPosibles.find(c => c.id === f.cuentaId) || null : null;
    return {
      descripcion: f.descripcion, monto: parseFloat(f.monto), moneda: f.moneda, categoria: f.categoria,
      fecha: f.fecha, metodo: f.metodo, depositoId: f.depositoId || null,
      cuenta: cuenta ? { id: cuenta.id, name: cuenta.name } : null,
    };
  };

  const guardar = async () => {
    if (!form) return;
    const d = datosDelForm(form);
    const problema = validarGasto(d, hoy);
    if (problema) { toast.error(problema); return; }
    setGuardando(true);
    try {
      if (editando) await actualizar(editando, d);
      else await crear(d);
      setForm(null); setEditando(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar el gasto.');
    } finally {
      setGuardando(false);
    }
  };

  const crear = async (d: DatosGasto) => {
    const creadoEl = momentoDelGasto(d.fecha);
    const { data, error } = await supabase.from('expenses').insert({
      description: d.descripcion.trim(), amount: d.monto, currency: d.moneda, category: d.categoria,
      deposit_id: d.depositoId, seller_id: currentUser.id, seller_name: currentUser.name, created_at: creadoEl,
    }).select().single();
    if (error || !data) throw new Error(error?.message || 'No se pudo guardar el gasto.');

    const mov = movimientoDelGasto(data.id, d, creadoEl, currentUser);
    const { error: mErr } = await supabase.from('sales').insert(mov);
    if (mErr) {
      // Sin la fila espejo la plata no sale de ninguna caja: antes que dejar
      // un gasto que no descuenta, se deshace.
      await supabase.from('expenses').delete().eq('id', data.id);
      throw new Error(`No se pudo descontar de la caja: ${mErr.message}`);
    }
    setGastos(prev => [data, ...prev].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)));
    setPagos(prev => ({ ...prev, [String(data.id)]: mov.payments }));
    toast.success(d.fecha === hoy ? 'Gasto registrado' : `Gasto registrado el ${d.fecha.split('-').reverse().join('/')}`);
  };

  const actualizar = async (g: Gasto, d: DatosGasto) => {
    // Si no se tocó la fecha se conserva la hora original: el gasto no se
    // cambia de turno por corregir el monto.
    const creadoEl = d.fecha === diaLocal(g.created_at) ? g.created_at : momentoDelGasto(d.fecha);
    const { data, error } = await supabase.from('expenses').update({
      description: d.descripcion.trim(), amount: d.monto, currency: d.moneda, category: d.categoria,
      deposit_id: d.depositoId, created_at: creadoEl,
    }).eq('id', g.id).select().single();
    if (error || !data) throw new Error(error?.message || 'No se pudo guardar el cambio.');

    const mov = movimientoDelGasto(g.id, d, creadoEl, { id: g.seller_id || currentUser.id, name: g.seller_name || currentUser.name });
    const { data: cambiados, error: mErr } = await supabase.from('sales')
      .update({ model: mov.model, currency: mov.currency, deposit_id: mov.deposit_id, created_at: mov.created_at, payments: mov.payments })
      .eq('imei', `${MARCA_GASTO}${g.id}`).select('id');
    // Gastos viejos cuya fila espejo nunca se guardó: se crea ahora.
    const sinFila = !mErr && (cambiados || []).length === 0;
    const { error: iErr } = sinFila ? await supabase.from('sales').insert(mov) : { error: null };
    if (mErr || iErr) {
      toast.error(`El gasto se guardó, pero la caja no se actualizó: ${(mErr || iErr)!.message}`);
    } else {
      toast.success('Gasto actualizado');
    }
    setGastos(prev => prev.map(x => x.id === g.id ? data : x).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)));
    if (!mErr && !iErr) setPagos(prev => ({ ...prev, [String(g.id)]: mov.payments }));
  };

  const borrar = async (g: Gasto) => {
    if (!await confirm(`¿Borrar "${g.description}"? La plata vuelve a la caja de la que salió.`)) return;
    const { error } = await supabase.from('expenses').delete().eq('id', g.id);
    if (error) { toast.error('No se pudo borrar: ' + error.message); return; }
    const { error: mErr } = await supabase.from('sales').delete().eq('imei', `${MARCA_GASTO}${g.id}`);
    if (mErr) toast.error(`El gasto se borró, pero la caja no se actualizó: ${mErr.message}`);
    else toast.success('Gasto borrado');
    setGastos(prev => prev.filter(x => x.id !== g.id));
    router.refresh();
  };

  // ── Pantalla ────────────────────────────────────────────────────────────

  const principal = resumen.porCategoria[0];

  return (
    <div className="page">
      {celular ? (
        <GastosMobile
          hayGastos={gastos.length > 0}
          lista={lista}
          resumen={resumen}
          resumenAnterior={resumenAnterior}
          cambio={cambio}
          periodo={periodo}
          setPeriodo={p => { setPeriodo(p); setVisibles(50); }}
          etiquetaPeriodo={etiquetaPeriodo}
          categoria={categoria}
          setCategoria={setCategoria}
          q={q}
          setQ={v => { setQ(v); setVisibles(50); }}
          deposits={deposits}
          deposito={deposito}
          setDeposito={d => { setDeposito(d); setVisibles(50); }}
          cotizacion={cotizacion}
          origenDe={g => origenDelGasto({ payments: pagos[String(g.id)] })}
          nombreDeposito={nombreDeposito}
          onNuevo={abrirNuevo}
          onRepetir={abrirRepetir}
          onEditar={abrirEditar}
          onBorrar={borrar}
        />
      ) : (<>
      <div className="sh">
        <div>
          <h1 className="st">Gastos</h1>
          <p className="helper-text">Alquiler, sueldos, servicios. Cada gasto sale de la caja que elijas y se resta en Rentabilidad.</p>
        </div>
        <button className="btn btn-dark" onClick={abrirNuevo}><Plus size={15} /> Cargar gasto</button>
      </div>

      <div className="gx-barra no-print">
        <div className="gx-periodos" role="tablist" aria-label="Período">
          {PERIODOS.map(p => (
            <button key={p.id} role="tab" aria-selected={periodo === p.id}
              className={`btn-pill ${periodo === p.id ? 'active' : ''}`}
              onClick={() => { setPeriodo(p.id); setVisibles(50); }}>
              {p.label}
            </button>
          ))}
        </div>
        {variosDepositos && (
          <select className="sel-pill" value={deposito} onChange={e => { setDeposito(e.target.value); setVisibles(50); }}>
            <option value="all">Todos los locales</option>
            {deposits.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
          </select>
        )}
      </div>

      <div className="inv-kpis">
        <div className="inv-kpi">
          <span>Gastado {periodo === 'todo' ? 'en total' : etiquetaPeriodo}</span>
          <strong>{usd(resumen.totalUSD)}</strong>
          <em>{[resumen.ars > 0 && ars(resumen.ars), resumen.usd > 0 && `U$ ${resumen.usd.toLocaleString('es-AR')}`].filter(Boolean).join(' + ') || 'sin gastos'}</em>
        </div>
        <div className="inv-kpi">
          <span>Contra el período anterior</span>
          {cambio === null
            ? <strong style={{ color: 'var(--text-3)' }}>—</strong>
            : <strong className="gx-cambio" style={{ color: cambio > 0 ? 'var(--red)' : 'var(--green)' }}>
                {cambio > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}{cambio > 0 ? '+' : ''}{cambio}%
              </strong>}
          <em>{resumenAnterior ? `antes: ${usd(resumenAnterior.totalUSD)}` : 'elegí un período'}</em>
        </div>
        <div className="inv-kpi">
          <span>Donde más se gasta</span>
          <strong style={{ fontFamily: 'inherit', fontSize: 17 }}>{principal?.categoria || '—'}</strong>
          <em>{principal ? `${Math.round(principal.parte * 100)}% del total` : 'sin gastos'}</em>
        </div>
        <div className="inv-kpi">
          <span>Gastos cargados</span>
          <strong>{resumen.cantidad}</strong>
          <em>{resumen.cantidad > 0 ? `promedio ${usd(resumen.totalUSD / resumen.cantidad)}` : '—'}</em>
        </div>
      </div>

      {gastos.length === 0 ? (
        <EmptyState
          icon={<Receipt size={22} />}
          title="Todavía no cargaste gastos"
          description="Alquiler, sueldos, luz, publicidad: lo que sale del negocio y no es mercadería."
          hint="Cada gasto se descuenta de la caja que elijas y se resta de la ganancia en Rentabilidad."
          action={{ label: 'Cargar el primero', onClick: abrirNuevo, icon: <Plus size={15} /> }}
        />
      ) : (
        <div className="gx-cuerpo">
          <div className="gx-lista">
            <div className="search-bar no-print" style={{ marginBottom: 12 }}>
              <Search size={16} color="var(--text-3)" style={{ flexShrink: 0 }} />
              <input className="inp" placeholder="Buscar gasto, categoría o quién lo cargó…" value={q} onChange={e => { setQ(e.target.value); setVisibles(50); }} />
              {categoria && (
                <button className="plata-chip gx-filtro" onClick={() => setCategoria(null)} title="Quitar filtro">
                  {categoria} <X size={11} />
                </button>
              )}
            </div>

            {lista.length === 0 ? (
              <div className="gx-vacio">
                Sin gastos {categoria ? `de ${categoria} ` : ''}{periodo === 'todo' ? '' : etiquetaPeriodo}{q ? ` que coincidan con "${q}"` : ''}.
              </div>
            ) : (
              <div className="tw">
                <table className="table gx-tabla tm tm3">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Gasto</th>
                      <th>Sale de</th>
                      <th style={{ textAlign: 'right' }}>Monto</th>
                      <th style={{ width: 110 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.slice(0, visibles).map(g => {
                      const origen = origenDelGasto({ payments: pagos[String(g.id)] });
                      return (
                        <tr key={g.id}>
                          <td className="gx-fecha" data-label="Fecha">
                            {new Date(g.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                          </td>
                          <td className="tm-full tm-primero">
                            <div style={{ fontWeight: 600 }}>{g.description}</div>
                            <div className="gx-sub">
                              <span className="badge b-neu">{g.category}</span>
                              {variosDepositos && <span>{nombreDeposito(g.deposit_id)}</span>}
                              {g.seller_name && <span>por {g.seller_name}</span>}
                            </div>
                          </td>
                          <td className="gx-origen" data-label="Sale de">
                            {origen.metodo ? nombreDelMetodo(origen.metodo) : <span title="Gasto sin movimiento de caja">—</span>}
                            {origen.cuenta && <div className="gx-sub">{origen.cuenta}</div>}
                          </td>
                          <td className="gx-monto" data-label="Monto">{montoDe(g)}</td>
                          <td className="tm-full">
                            <div className="gx-acciones">
                              <button className="btn-icon" onClick={() => abrirRepetir(g)} title="Repetir con fecha de hoy" aria-label="Repetir"><Repeat size={14} /></button>
                              <button className="btn-icon" onClick={() => abrirEditar(g)} title="Editar" aria-label="Editar"><Pencil size={14} /></button>
                              <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => borrar(g)} title="Borrar" aria-label="Borrar"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {visibles < lista.length && (
                  <div style={{ textAlign: 'center', margin: '20px 0' }}>
                    <button className="btn btn-outline" onClick={() => setVisibles(v => v + 50)}>
                      Ver más ({lista.length - visibles} restantes)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="card gx-cats">
            <div className="sl" style={{ marginBottom: 12 }}>Por categoría</div>
            {resumen.porCategoria.length === 0 && <div className="gx-sub">Sin gastos en el período.</div>}
            {resumen.porCategoria.map(c => (
              <button key={c.categoria}
                className={`gx-cat ${categoria === c.categoria ? 'on' : ''}`}
                onClick={() => setCategoria(categoria === c.categoria ? null : c.categoria)}>
                <div className="gx-cat-fila">
                  <span>{c.categoria}</span>
                  <strong>{usd(c.totalUSD)}</strong>
                </div>
                <div className="gx-cat-barra"><i style={{ width: `${Math.max(2, Math.round(c.parte * 100))}%` }} /></div>
                <div className="gx-sub">
                  {Math.round(c.parte * 100)}%
                  {c.ars > 0 && ` · ${ars(c.ars)}`}
                  {c.usd > 0 && ` · U$ ${c.usd.toLocaleString('es-AR')}`}
                </div>
              </button>
            ))}
            {resumen.ars > 0 && <div className="gx-nota">Los pesos se pasan a dólares a {ars(cotizacion)} para sumar y comparar.</div>}
          </aside>
        </div>
      )}
      </>)}

      {ConfirmDialog}

      {form && (
        <div className="mo" style={{ zIndex: 1100 }} onClick={cerrar}>
          <div className="mb" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="mh">
              <div>
                <div className="mh-title">{editando ? 'Editar gasto' : 'Cargar gasto'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                  {editando ? 'Los cambios también corrigen la caja.' : 'Sale de la caja que elijas.'}
                </div>
              </div>
              <button className="btn-icon" onClick={cerrar} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <form className="mbd gx-form" onSubmit={e => { e.preventDefault(); guardar(); }}>
              <div className="field">
                <label className="lbl" htmlFor="gx-desc">¿Qué fue?</label>
                <input id="gx-desc" className="inp" autoFocus value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Ej: Alquiler octubre, sueldo Juan, luz" />
              </div>

              <div className="gx-dos">
                <div className="field">
                  <label className="lbl" htmlFor="gx-monto">Monto</label>
                  <div className="gx-monto-inp">
                    <input id="gx-monto" className="inp" type="number" inputMode="decimal" min="0" step="any"
                      value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} placeholder="0" />
                    <div className="gx-moneda" role="group" aria-label="Moneda">
                      {(['ARS', 'USD'] as MonedaGasto[]).map(m => (
                        <button type="button" key={m} className={form.moneda === m ? 'on' : ''}
                          onClick={() => setForm({ ...form, moneda: m, metodo: METODOS_GASTO[m][0].id, cuentaId: '' })}>
                          {m === 'ARS' ? '$' : 'U$'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="field">
                  <label className="lbl" htmlFor="gx-fecha">Fecha</label>
                  <input id="gx-fecha" className="inp" type="date" max={hoy} value={form.fecha}
                    onChange={e => setForm({ ...form, fecha: e.target.value })} />
                </div>
              </div>

              <div className="field">
                <span className="lbl">Categoría</span>
                <div className="gx-chips">
                  {[...CATEGORIAS_GASTO, ...((CATEGORIAS_GASTO as readonly string[]).includes(form.categoria) ? [] : [form.categoria])].map(c => (
                    <button type="button" key={c} className={`btn-pill ${form.categoria === c ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, categoria: c })}>{c}</button>
                  ))}
                </div>
              </div>

              <div className="field">
                <span className="lbl">Sale de</span>
                <div className="gx-chips">
                  {METODOS_GASTO[form.moneda].map(m => (
                    <button type="button" key={m.id} className={`btn-pill ${form.metodo === m.id ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, metodo: m.id, cuentaId: cuentaPorDefecto(m.id) })}>
                      {m.label}
                    </button>
                  ))}
                </div>
                {cuentasPosibles.length > 0 && (
                  <select className="inp" style={{ marginTop: 10 }} value={form.cuentaId} onChange={e => setForm({ ...form, cuentaId: e.target.value })}
                    aria-label="Cuenta de la que sale">
                    <option value="">Sin indicar la cuenta</option>
                    {cuentasPosibles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>

              {variosDepositos && (
                <div className="field">
                  <label className="lbl" htmlFor="gx-dep">Caja del local</label>
                  <select id="gx-dep" className="inp" value={form.depositoId} onChange={e => setForm({ ...form, depositoId: e.target.value })}>
                    {deposits.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={cerrar}>Cancelar</button>
                <button type="submit" className="btn btn-dark" style={{ flex: 1 }} disabled={guardando}>
                  {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Registrar gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
