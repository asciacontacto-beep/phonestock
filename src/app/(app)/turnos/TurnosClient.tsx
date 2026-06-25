"use client"
import { useState, useEffect } from 'react';
import { Plus, CalendarDays, LayoutList, Search, X, Check, Ban, Edit2, Clock, Phone, ArrowLeftRight, ChevronLeft, ChevronRight, AtSign } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { BRANDS, MODELS, STORAGES, COLORS, PAY } from '@/constants/data';

type Appointment = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_instagram: string | null;
  scheduled_at: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes: string | null;
  phone_id: number | null;
  phone_brand: string | null;
  phone_model: string | null;
  phone_storage: string | null;
  phone_color: string | null;
  phone_price: number | null;
  phone_currency: string;
  trade_in_brand: string | null;
  trade_in_model: string | null;
  trade_in_storage: string | null;
  trade_in_color: string | null;
  trade_in_price: number | null;
  trade_in_currency: string;
  deposit_id: number | null;
  seller_id: string | null;
  sale_id: string | null;
  created_at: string;
};

const STATUS = {
  pending:   { label: 'Pendiente',  color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)' },
  confirmed: { label: 'Confirmado', color: 'var(--green)',  bg: 'rgba(34,197,94,0.1)' },
  cancelled: { label: 'Cancelado',  color: 'var(--text-3)', bg: 'rgba(0,0,0,0.06)' },
} as const;

const TABS = [
  { id: 'cards',   label: 'Lista',    icon: <LayoutList size={14} /> },
  { id: 'monthly', label: 'Mensual',  icon: <CalendarDays size={14} /> },
  { id: 'weekly',  label: 'Semanal',  icon: <CalendarDays size={14} /> },
] as const;

type Tab = 'cards' | 'monthly' | 'weekly';

export function TurnosClient({ isOwner, user }: { isOwner: boolean; user: any }) {
  const supabase = createClient();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stockPhones, setStockPhones] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('cards');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [q, setQ] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editItem, setEditItem] = useState<Appointment | null>(null);
  const [confirmItem, setConfirmItem] = useState<Appointment | null>(null);
  const [calDate, setCalDate] = useState(new Date());

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [apptRes, stockRes, depRes] = await Promise.all([
      supabase.from('appointments').select('*').order('scheduled_at'),
      supabase.from('stock').select('id,brand,model,storage,color,imei,price,currency,cost_price,deposit').eq('status', 'available').order('brand'),
      supabase.from('deposits').select('id,name,color').order('name'),
    ]);
    if (apptRes.data) setAppointments(apptRes.data);
    if (stockRes.data) setStockPhones(stockRes.data);
    if (depRes.data) setDeposits(depRes.data);
    setLoading(false);
  };

  const filtered = appointments.filter(a => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (q) {
      const qs = q.toLowerCase();
      const name = (a.customer_name || a.customer_instagram || '').toLowerCase();
      if (!name.includes(qs) && !a.phone_model?.toLowerCase().includes(qs) && !a.phone_brand?.toLowerCase().includes(qs)) return false;
    }
    return true;
  });

  const handleCancel = async (id: string) => {
    const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Turno cancelado');
    setAppointments(p => p.map(a => a.id === id ? { ...a, status: 'cancelled' as const } : a));
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Turno eliminado');
    setAppointments(p => p.filter(a => a.id !== id));
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="sh">
        <h1 className="st">Turnos</h1>
        <button className="btn btn-dark" onClick={() => { setEditItem(null); setShowNew(true); }}>
          <Plus size={16} /> Nuevo Turno
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'var(--surface)', border: '1px solid var(--border-md)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              background: tab === t.id ? 'var(--text)' : 'transparent',
              color: tab === t.id ? '#fff' : 'var(--text-3)',
              transition: 'all 0.15s',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'cards' && (
        <CardsView
          appointments={filtered}
          loading={loading}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          q={q}
          setQ={setQ}
          onEdit={(a: Appointment) => { setEditItem(a); setShowNew(true); }}
          onConfirm={(a: Appointment) => setConfirmItem(a)}
          onCancel={handleCancel}
          onDelete={handleDelete}
        />
      )}

      {(tab === 'monthly' || tab === 'weekly') && (
        <CalendarView
          appointments={appointments}
          tab={tab}
          calDate={calDate}
          setCalDate={setCalDate}
          onConfirm={(a: Appointment) => setConfirmItem(a)}
          onEdit={(a: Appointment) => { setEditItem(a); setShowNew(true); }}
        />
      )}

      {showNew && (
        <AppointmentModal
          appt={editItem}
          stockPhones={stockPhones}
          onClose={() => { setShowNew(false); setEditItem(null); }}
          onSave={() => { setShowNew(false); setEditItem(null); fetchAll(); }}
          supabase={supabase}
        />
      )}

      {confirmItem && (
        <ConfirmSaleModal
          appt={confirmItem}
          deposits={deposits}
          user={user}
          onClose={() => setConfirmItem(null)}
          onSave={() => { setConfirmItem(null); fetchAll(); }}
          supabase={supabase}
        />
      )}
    </div>
  );
}

// ─── Cards View ───────────────────────────────────────────────────────────────

function CardsView({ appointments, loading, filterStatus, setFilterStatus, q, setQ, onEdit, onConfirm, onCancel, onDelete }: any) {
  const filters = [
    { v: 'all',       l: 'Todos' },
    { v: 'pending',   l: 'Pendientes' },
    { v: 'confirmed', l: 'Confirmados' },
    { v: 'cancelled', l: 'Cancelados' },
  ];

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar cliente o modelo…"
            className="inp"
            style={{ paddingLeft: 36 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button key={f.v} onClick={() => setFilterStatus(f.v)} className={`btn-pill ${filterStatus === f.v ? 'active' : ''}`}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)', fontSize: 14 }}>Cargando turnos…</div>
      ) : appointments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: 'var(--text-2)' }}>No hay turnos cargados</div>
          <div style={{ fontSize: 14 }}>Creá uno con el botón <strong>+ Nuevo Turno</strong> de arriba</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {appointments.map((a: Appointment, i: number) => (
            <AppointmentCard
              key={a.id}
              appt={a}
              index={i}
              onEdit={onEdit}
              onConfirm={onConfirm}
              onCancel={onCancel}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AppointmentCard({ appt, index, onEdit, onConfirm, onCancel, onDelete }: any) {
  const st = STATUS[appt.status as keyof typeof STATUS];
  const dt = new Date(appt.scheduled_at);
  const isToday = dt.toDateString() === new Date().toDateString();
  const isPast = dt < new Date() && appt.status === 'pending';
  const hasTradein = !!appt.trade_in_brand;
  const displayName = appt.customer_name || (appt.customer_instagram ? `@${appt.customer_instagram}` : 'Sin nombre');
  const timeStr = dt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid var(--border-md)`,
      borderLeft: `3px solid ${st.color}`,
      borderRadius: 10,
      padding: '14px 16px',
      display: 'flex',
      gap: 14,
      boxShadow: 'var(--shadow-xs)',
      animation: `cardIn 0.18s ease-out ${index * 0.04}s both`,
    }}>
      {/* Date block */}
      <div style={{
        width: 58, flexShrink: 0, textAlign: 'center',
        background: isToday ? 'var(--text)' : 'var(--surface-3)',
        border: `1px solid ${isToday ? 'var(--text)' : 'var(--border-md)'}`,
        borderRadius: 10, padding: '10px 6px', alignSelf: 'flex-start',
      }}>
        <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: isToday ? '#fff' : appt.status === 'cancelled' ? 'var(--text-3)' : 'var(--text)' }}>
          {dt.getDate()}
        </div>
        <div style={{ fontSize: 11, color: isToday ? 'rgba(255,255,255,0.7)' : 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3, fontWeight: 600 }}>
          {dt.toLocaleDateString('es-AR', { month: 'short' })}
        </div>
        <div style={{ fontSize: 12, color: isToday ? 'rgba(255,255,255,0.8)' : 'var(--text-2)', marginTop: 6, fontWeight: 600 }}>
          {timeStr}
        </div>
      </div>

      {/* Main content: full width, stacked */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Row 1: name + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{displayName}</span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
            background: st.bg, color: isPast ? 'var(--amber)' : st.color, flexShrink: 0,
          }}>
            {isPast ? '⚠ Vencido' : st.label}
          </span>
        </div>

        {/* Row 2: contact info */}
        {(appt.customer_phone || (appt.customer_instagram && appt.customer_name)) && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            {appt.customer_phone && (
              <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Phone size={10} /> {appt.customer_phone}
              </span>
            )}
            {appt.customer_instagram && appt.customer_name && (
              <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <AtSign size={10} /> {appt.customer_instagram}
              </span>
            )}
          </div>
        )}

        {/* Row 3: phone + trade-in as chip rows */}
        {(appt.phone_brand || hasTradein) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: appt.notes ? 8 : 0 }}>
            {appt.phone_brand && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, background: 'var(--blue)15', border: '1px solid var(--blue)33', padding: '2px 7px', borderRadius: 4, color: 'var(--blue)', fontWeight: 700, letterSpacing: 0.3, flexShrink: 0 }}>COMPRA</span>
                <span style={{ fontSize: 13, color: 'var(--text-2)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {appt.phone_brand} {appt.phone_model} {appt.phone_storage}{appt.phone_color ? ` · ${appt.phone_color}` : ''}
                </span>
                {appt.phone_price != null && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>
                    {appt.phone_currency} {appt.phone_price.toLocaleString('es-AR')}
                  </span>
                )}
              </div>
            )}
            {hasTradein && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, background: 'var(--purple)15', border: '1px solid var(--purple)33', padding: '2px 7px', borderRadius: 4, color: 'var(--purple)', fontWeight: 700, letterSpacing: 0.3, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <ArrowLeftRight size={8} /> CANJE
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-2)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {appt.trade_in_brand} {appt.trade_in_model} {appt.trade_in_storage}
                </span>
                {appt.trade_in_price != null && (
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--purple)', flexShrink: 0 }}>
                    − {appt.trade_in_currency} {appt.trade_in_price.toLocaleString('es-AR')}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {appt.notes && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', marginBottom: 8 }}>"{appt.notes}"</div>
        )}

        {/* Actions — bottom of card, inline */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          {appt.status === 'pending' && (
            <>
              <button className="btn btn-dark btn-sm" onClick={() => onConfirm(appt)} style={{ background: 'var(--green)', border: 'none' }}>
                <Check size={12} /> Confirmar venta
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => onEdit(appt)}>
                <Edit2 size={12} /> Editar
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => onCancel(appt.id)} style={{ color: 'var(--red)', marginLeft: 'auto' }}>
                <Ban size={12} /> Cancelar
              </button>
            </>
          )}
          {appt.status !== 'pending' && (
            <button className="btn btn-outline btn-sm" onClick={() => onDelete(appt.id)} style={{ color: 'var(--text-3)', marginLeft: 'auto' }}>
              <X size={12} /> Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({ appointments, tab, calDate, setCalDate, onConfirm, onEdit }: any) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const apptsByDay = (date: Date) => {
    const ds = date.toDateString();
    return appointments.filter((a: Appointment) => new Date(a.scheduled_at).toDateString() === ds);
  };

  const move = (dir: number) => {
    const d = new Date(calDate);
    if (tab === 'monthly') d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCalDate(d);
    setSelectedDay(null);
  };

  // Monthly grid
  const firstDay = new Date(calDate.getFullYear(), calDate.getMonth(), 1);
  const lastDay = new Date(calDate.getFullYear(), calDate.getMonth() + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridDays: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) gridDays.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    gridDays.push(new Date(calDate.getFullYear(), calDate.getMonth(), d));
  }

  // Weekly grid
  const weekStart = new Date(calDate);
  const dow = (calDate.getDay() + 6) % 7;
  weekStart.setDate(calDate.getDate() - dow);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const headerLabel = tab === 'monthly'
    ? calDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    : `${weekDays[0].toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button className="btn btn-outline btn-sm" style={{ padding: '6px 10px' }} onClick={() => move(-1)}>
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, textTransform: 'capitalize', minWidth: 200 }}>{headerLabel}</span>
        <button className="btn btn-outline btn-sm" style={{ padding: '6px 10px' }} onClick={() => move(1)}>
          <ChevronRight size={14} />
        </button>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => { setCalDate(new Date()); setSelectedDay(null); }}
          style={{ marginLeft: 'auto', fontSize: 12 }}
        >
          Hoy
        </button>
      </div>

      {tab === 'monthly' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {['Lu','Ma','Mi','Ju','Vi','Sá','Do'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', fontWeight: 600, padding: '4px 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {gridDays.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />;
              const dayAppts = apptsByDay(day);
              const isToday = day.toDateString() === new Date().toDateString();
              const isSelected = selectedDay?.toDateString() === day.toDateString();
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  style={{
                    padding: '6px 4px', borderRadius: 8, cursor: 'pointer', minHeight: 56,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    border: isSelected ? '2px solid var(--text)' : '2px solid transparent',
                    background: isSelected ? 'var(--surface-3)' : 'transparent',
                    transition: 'all 0.1s',
                  }}
                >
                  <span style={{
                    fontSize: 13, fontWeight: isToday ? 700 : 400,
                    width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '50%',
                    background: isToday ? 'var(--text)' : 'transparent',
                    color: isToday ? '#fff' : 'var(--text-2)',
                  }}>
                    {day.getDate()}
                  </span>
                  {dayAppts.length > 0 && (
                    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {dayAppts.slice(0, 3).map((a: Appointment) => (
                        <div key={a.id} style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS[a.status as keyof typeof STATUS].color }} />
                      ))}
                      {dayAppts.length > 3 && <span style={{ fontSize: 9, color: 'var(--text-3)' }}>+{dayAppts.length - 3}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {selectedDay && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text-2)', textTransform: 'capitalize' }}>
                {selectedDay.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              {apptsByDay(selectedDay).length === 0 ? (
                <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Sin turnos este día.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {apptsByDay(selectedDay).map((a: Appointment, i: number) => (
                    <AppointmentCard key={a.id} appt={a} index={i} onEdit={onEdit} onConfirm={onConfirm} onCancel={() => {}} onDelete={() => {}} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'weekly' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {weekDays.map((day) => {
            const dayAppts = apptsByDay(day);
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div key={day.toISOString()} style={{ minWidth: 80 }}>
                <div style={{
                  textAlign: 'center', padding: '8px 4px', borderRadius: 8, marginBottom: 6,
                  background: isToday ? 'var(--text)' : 'var(--surface)',
                  border: `1px solid ${isToday ? 'var(--text)' : 'var(--border-md)'}`,
                  boxShadow: 'var(--shadow-xs)',
                }}>
                  <div style={{ fontSize: 10, color: isToday ? 'rgba(255,255,255,0.7)' : 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {day.toLocaleDateString('es-AR', { weekday: 'short' })}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: isToday ? '#fff' : 'var(--text)', lineHeight: 1.2 }}>
                    {day.getDate()}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {dayAppts.length === 0 ? (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', padding: '10px 0' }}>—</div>
                  ) : dayAppts.map((a: Appointment) => {
                    const s = STATUS[a.status as keyof typeof STATUS];
                    const displayName = a.customer_name || (a.customer_instagram ? `@${a.customer_instagram}` : '?');
                    return (
                      <button
                        key={a.id}
                        onClick={() => a.status === 'pending' ? onConfirm(a) : onEdit(a)}
                        style={{
                          background: s.bg, border: `1px solid ${s.color}33`,
                          borderLeft: `3px solid ${s.color}`,
                          borderRadius: 6, padding: '6px 8px',
                          textAlign: 'left', cursor: 'pointer', width: '100%',
                        }}
                      >
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2 }}>
                          {new Date(a.scheduled_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{displayName}</div>
                        {a.phone_model && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{a.phone_brand} {a.phone_model}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Trade-in Section ─────────────────────────────────────────────────────────

function TradeInSection({ f, setF }: any) {
  const [appleCategory, setAppleCategory] = useState('iPhone');

  const models = (f.trade_in_brand || 'Apple') === 'Apple'
    ? (MODELS['Apple'] || []).filter((m: string) => m.startsWith(appleCategory))
    : (MODELS[f.trade_in_brand] || []);

  return (
    <div style={{ marginTop: 10, padding: 14, background: 'var(--surface-3)', border: '1px solid var(--border-md)', borderRadius: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Equipo a recibir</div>

      <div className="row" style={{ marginBottom: 8 }}>
        <div className="col field" style={{ marginBottom: 0 }}>
          <label className="lbl">Marca</label>
          <select className="inp" value={f.trade_in_brand || 'Apple'} onChange={e => {
            const b = e.target.value;
            const m = MODELS[b]?.[0] || '';
            setF((p: any) => ({ ...p, trade_in_brand: b, trade_in_model: m }));
          }}>
            {BRANDS.map((b: string) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        {(f.trade_in_brand || 'Apple') === 'Apple' && (
          <div className="col field" style={{ marginBottom: 0 }}>
            <label className="lbl">Línea</label>
            <select className="inp" value={appleCategory} onChange={e => {
              const cat = e.target.value;
              setAppleCategory(cat);
              const m = MODELS['Apple']?.find((x: string) => x.startsWith(cat)) || '';
              setF((p: any) => ({ ...p, trade_in_model: m }));
            }}>
              <option value="iPhone">iPhone</option>
              <option value="MacBook">MacBook</option>
              <option value="AirPods">AirPods</option>
            </select>
          </div>
        )}
        <div className="col field" style={{ marginBottom: 0 }}>
          <label className="lbl">Modelo</label>
          <select className="inp" value={f.trade_in_model || ''} onChange={e => setF((p: any) => ({ ...p, trade_in_model: e.target.value }))}>
            {models.map((m: string) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 8 }}>
        <div className="col field" style={{ marginBottom: 0 }}>
          <label className="lbl">GB</label>
          <select className="inp" value={f.trade_in_storage || '128GB'} onChange={e => setF((p: any) => ({ ...p, trade_in_storage: e.target.value }))}>
            {STORAGES.map((s: string) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="col field" style={{ marginBottom: 0 }}>
          <label className="lbl">Color</label>
          <input className="inp" list="ti-colors" placeholder="Ej: Negro" value={f.trade_in_color || ''} onChange={e => setF((p: any) => ({ ...p, trade_in_color: e.target.value }))} />
          <datalist id="ti-colors">
            {(COLORS[f.trade_in_brand || 'Apple'] || ['Negro']).map((c: string) => <option key={c} value={c} />)}
          </datalist>
        </div>
      </div>

      <div className="row">
        <div className="col field" style={{ marginBottom: 0 }}>
          <label className="lbl">Valor toma</label>
          <input className="inp" type="number" placeholder="0" value={f.trade_in_price || ''} onChange={e => setF((p: any) => ({ ...p, trade_in_price: e.target.value }))} />
        </div>
        <div className="col field" style={{ marginBottom: 0 }}>
          <label className="lbl">Precio venta sugerido</label>
          <input className="inp" type="number" placeholder="0" value={f.trade_in_sale_price || ''} onChange={e => setF((p: any) => ({ ...p, trade_in_sale_price: e.target.value }))} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label className="lbl">Moneda</label>
          <select className="inp" value={f.trade_in_currency || 'ARS'} onChange={e => setF((p: any) => ({ ...p, trade_in_currency: e.target.value }))} style={{ width: 80 }}>
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Appointment Modal ────────────────────────────────────────────────────────

function AppointmentModal({ appt, stockPhones, onClose, onSave, supabase }: any) {
  const isEdit = !!appt;
  const [f, setF] = useState({
    customer_name: appt?.customer_name || '',
    customer_phone: appt?.customer_phone || '',
    customer_instagram: appt?.customer_instagram || '',
    scheduled_at: appt?.scheduled_at ? new Date(appt.scheduled_at).toISOString().slice(0, 16) : '',
    notes: appt?.notes || '',
    phone_id: appt?.phone_id ? String(appt.phone_id) : '',
    trade_in_active: !!(appt?.trade_in_brand),
    trade_in_brand: appt?.trade_in_brand || 'Apple',
    trade_in_model: appt?.trade_in_model || (MODELS['Apple']?.[0] || ''),
    trade_in_storage: appt?.trade_in_storage || '128GB',
    trade_in_color: appt?.trade_in_color || '',
    trade_in_price: appt?.trade_in_price ?? '',
    trade_in_sale_price: '',
    trade_in_currency: appt?.trade_in_currency || 'ARS',
  });
  const [saving, setSaving] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState('');

  const selectedPhone = stockPhones.find((p: any) => String(p.id) === f.phone_id);

  const filteredPhones = phoneSearch
    ? stockPhones.filter((p: any) =>
        `${p.brand} ${p.model} ${p.storage} ${p.color}`.toLowerCase().includes(phoneSearch.toLowerCase())
      )
    : [];

  const handleSave = async () => {
    if (!f.customer_name.trim() && !f.customer_instagram.trim()) {
      return toast.error('Ingresá el nombre o Instagram del cliente');
    }
    if (!f.scheduled_at) return toast.error('Fecha y hora requerida');
    setSaving(true);
    try {
      const phone = stockPhones.find((p: any) => String(p.id) === f.phone_id);
      const payload: any = {
        customer_name: f.customer_name.trim() || null,
        customer_phone: f.customer_phone.trim() || null,
        customer_instagram: f.customer_instagram.trim().replace('@', '') || null,
        scheduled_at: new Date(f.scheduled_at).toISOString(),
        notes: f.notes.trim() || null,
        phone_id: f.phone_id ? Number(f.phone_id) : null,
        phone_brand: phone?.brand || null,
        phone_model: phone?.model || null,
        phone_storage: phone?.storage || null,
        phone_color: phone?.color || null,
        phone_imei: phone?.imei || null,
        phone_price: phone?.price || null,
        phone_currency: phone?.currency || 'ARS',
        trade_in_brand: f.trade_in_active ? f.trade_in_brand || null : null,
        trade_in_model: f.trade_in_active ? f.trade_in_model || null : null,
        trade_in_storage: f.trade_in_active ? f.trade_in_storage || null : null,
        trade_in_color: f.trade_in_active ? f.trade_in_color || null : null,
        trade_in_price: f.trade_in_active ? parseFloat(String(f.trade_in_price)) || null : null,
        trade_in_currency: f.trade_in_active ? f.trade_in_currency : null,
      };

      if (isEdit) {
        const { error } = await supabase.from('appointments').update(payload).eq('id', appt.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('appointments').insert([payload]);
        if (error) throw error;
      }

      // Register customer — same pattern as SellClient
      const custName = payload.customer_name || payload.customer_instagram;
      if (custName) {
        const custData: any = {
          name: custName,
          phone: payload.customer_phone || null,
          instagram: payload.customer_instagram || null,
          updated_at: new Date().toISOString(),
        };
        const { data: existing } = await supabase.from('customers').select('id').eq('name', custName).maybeSingle();
        if (existing) {
          await supabase.from('customers').update({
            phone: custData.phone,
            instagram: custData.instagram,
            updated_at: custData.updated_at,
          }).eq('id', existing.id);
        } else {
          await supabase.from('customers').insert([custData]);
        }
      }

      toast.success(isEdit ? 'Turno actualizado' : 'Turno creado');
      onSave();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="mo">
      <div className="mb">
        <div className="mh">
          <div className="mh-title">{isEdit ? 'Editar Turno' : 'Nuevo Turno'}</div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="mbd">
          {/* Customer */}
          <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border-md)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Cliente</div>
            <div className="row" style={{ marginBottom: 8 }}>
              <div className="col field" style={{ marginBottom: 0 }}>
                <label className="lbl">Nombre</label>
                <input className="inp" value={f.customer_name} onChange={e => setF({ ...f, customer_name: e.target.value })} placeholder="Nombre del cliente" />
              </div>
              <div className="col field" style={{ marginBottom: 0 }}>
                <label className="lbl">Teléfono</label>
                <input className="inp" value={f.customer_phone} onChange={e => setF({ ...f, customer_phone: e.target.value })} placeholder="+54 9 11 ..." />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="lbl" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <AtSign size={11} /> Instagram <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(si no sabés el nombre)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: 14, pointerEvents: 'none' }}>@</span>
                <input
                  className="inp"
                  value={f.customer_instagram}
                  onChange={e => setF({ ...f, customer_instagram: e.target.value.replace('@', '') })}
                  placeholder="usuario"
                  style={{ paddingLeft: 28 }}
                />
              </div>
            </div>
          </div>

          {/* Date/time */}
          <div className="field">
            <label className="lbl">Fecha y hora *</label>
            <input className="inp" type="datetime-local" value={f.scheduled_at} onChange={e => setF({ ...f, scheduled_at: e.target.value })} />
          </div>

          {/* Phone to buy */}
          <div className="field">
            <label className="lbl">Teléfono a comprar</label>
            {selectedPhone ? (
              <div style={{ padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border-md)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-xs)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedPhone.brand} {selectedPhone.model} {selectedPhone.storage}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{selectedPhone.color} · {selectedPhone.currency} {selectedPhone.price?.toLocaleString('es-AR')}</div>
                </div>
                <button className="btn-icon" onClick={() => setF({ ...f, phone_id: '' })}><X size={14} /></button>
              </div>
            ) : (
              <div>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
                  <input
                    className="inp"
                    placeholder="Buscar por modelo, ej: iPhone 15…"
                    value={phoneSearch}
                    onChange={e => setPhoneSearch(e.target.value)}
                    style={{ paddingLeft: 36 }}
                  />
                </div>
                {phoneSearch && (
                  <div style={{ marginTop: 4, border: '1px solid var(--border-md)', borderRadius: 8, overflow: 'hidden' }}>
                    {filteredPhones.length === 0 ? (
                      <div style={{ padding: '12px 14px', color: 'var(--text-3)', fontSize: 13 }}>Sin resultados</div>
                    ) : filteredPhones.slice(0, 15).map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => { setF({ ...f, phone_id: String(p.id) }); setPhoneSearch(''); }}
                        style={{ display: 'flex', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, alignItems: 'center' }}
                      >
                        <span>
                          <span style={{ fontWeight: 500 }}>{p.brand} {p.model} {p.storage}</span>
                          <span style={{ color: 'var(--text-3)', marginLeft: 6, fontSize: 12 }}>{p.color}</span>
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>{p.currency} {p.price?.toLocaleString('es-AR')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Trade-in toggle */}
          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' as const }}>
              <input type="checkbox" checked={f.trade_in_active} onChange={e => setF({ ...f, trade_in_active: e.target.checked })} style={{ display: 'none' }} />
              <span style={{
                display: 'inline-flex', width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                background: f.trade_in_active ? 'var(--purple)' : 'rgba(0,0,0,0.25)',
                alignItems: 'center', padding: '0 3px',
                justifyContent: f.trade_in_active ? 'flex-end' : 'flex-start',
                transition: 'background 0.2s',
              }}>
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'white', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: f.trade_in_active ? 'var(--text)' : 'var(--text-2)' }}>
                <ArrowLeftRight size={13} style={{ color: f.trade_in_active ? 'var(--purple)' : 'var(--text-3)' }} />
                Plan Canje
              </span>
            </label>
            {f.trade_in_active && <TradeInSection f={f} setF={setF} />}
          </div>

          {/* Notes */}
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="lbl">Notas</label>
            <textarea className="inp" rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Observaciones…" style={{ resize: 'vertical' }} />
          </div>
        </div>

        <div className="mh" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-dark" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear turno'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Sale Modal ────────────────────────────────────────────────────────

function ConfirmSaleModal({ appt, deposits, user, onClose, onSave, supabase }: any) {
  const [payments, setPayments] = useState<any[]>([]);
  const [sm, setSm] = useState<string | null>(null);
  const [ma, setMa] = useState('');
  const [exchangeRate, setExchangeRate] = useState('1000');
  const [depositId, setDepositId] = useState<string>(deposits[0]?.id ? String(deposits[0].id) : '');
  const [saving, setSaving] = useState(false);

  const salePrice = appt.phone_price || 0;
  const tradeInValue = appt.trade_in_brand ? (appt.trade_in_price || 0) : 0;
  const neto = salePrice - tradeInValue;
  const currency = appt.phone_currency || 'ARS';

  const paid = payments.reduce((a: number, p: any) => a + p.amount, 0);
  const rem = neto - paid;

  const PAY_METHODS = PAY.filter((p: any) => p.id !== 'tradein');

  const addP = () => {
    if (!sm || !ma) return;
    const amt = parseFloat(ma);
    if (amt <= 0) return;
    const m = PAY_METHODS.find((p: any) => p.id === sm);
    let amountInCur = amt;
    const rate = parseFloat(exchangeRate) || 1;
    if (m?.cur === 'ARS' && currency === 'USD') amountInCur = amt / rate;
    else if (m?.cur === 'USD' && currency === 'ARS') amountInCur = amt * rate;
    setPayments(p => [...p, {
      id: sm, label: m?.label,
      amount: amountInCur,
      original_amount: amt,
      currency: m?.cur,
      exchange_rate: (m?.cur !== currency && m?.cur !== 'ANY') ? rate : null,
    }]);
    setMa('');
    setSm(null);
  };

  const handleConfirm = async () => {
    if (!depositId) return toast.error('Seleccioná un depósito');
    if (payments.length === 0) return toast.error('Agregá al menos un pago');
    if (rem > 0.01) return toast.error(`Faltan ${currency} ${rem.toLocaleString('es-AR', { maximumFractionDigits: 0 })} por cubrir`);
    setSaving(true);
    try {
      const finalPayments = [...payments];
      if (tradeInValue > 0) {
        finalPayments.push({
          id: 'tradein',
          label: `Canje: ${appt.trade_in_brand} ${appt.trade_in_model}`,
          amount: -tradeInValue,
          original_amount: -tradeInValue,
          device: {
            brand: appt.trade_in_brand,
            model: appt.trade_in_model,
            storage: appt.trade_in_storage,
            color: appt.trade_in_color,
          },
        });
      }

      const saleData = {
        seller_id: user.id,
        seller_name: user.name,
        deposit_id: depositId,
        brand: appt.phone_brand,
        model: appt.phone_model,
        storage: appt.phone_storage,
        color: appt.phone_color,
        imei: appt.phone_imei || `APT-${appt.id.split('-')[0]}`,
        cost_price: 0,
        price: salePrice,
        currency,
        payments: finalPayments,
        customer: { name: appt.customer_name || appt.customer_instagram, phone: appt.customer_phone },
        notes: `Turno ${new Date(appt.scheduled_at).toLocaleDateString('es-AR')}`,
      };
      const { data: saleRow, error: sErr } = await supabase.from('sales').insert([saleData]).select();
      if (sErr) throw sErr;

      if (appt.phone_id) {
        const { error: uErr } = await supabase.from('stock').update({ status: 'sold' }).eq('id', appt.phone_id);
        if (uErr) throw uErr;
      }

      if (appt.trade_in_brand) {
        const tiData = {
          brand: appt.trade_in_brand,
          model: appt.trade_in_model || '',
          storage: appt.trade_in_storage || '',
          color: appt.trade_in_color || '',
          imei: `TI-APT-${appt.id.split('-')[0]}-${Date.now()}`,
          condition: 'used',
          status: 'available',
          deposit: depositId,
          price: appt.trade_in_price || 0,
          cost_price: appt.trade_in_price || 0,
          currency: appt.trade_in_currency || 'ARS',
        };
        const { error: tiErr } = await supabase.from('stock').insert([tiData]);
        if (tiErr) throw tiErr;
      }

      const { error: aErr } = await supabase.from('appointments').update({
        status: 'confirmed',
        sale_id: saleRow[0].id,
        seller_id: user.id,
      }).eq('id', appt.id);
      if (aErr) throw aErr;

      toast.success('¡Venta confirmada!');
      onSave();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="mo">
      <div className="mb" style={{ maxWidth: 480 }}>
        <div className="mh">
          <div className="mh-title">Confirmar Venta</div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="mbd">
          {/* Summary */}
          <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border-md)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Resumen</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 14 }}>
              <span style={{ color: 'var(--text-2)' }}>{appt.phone_brand} {appt.phone_model} {appt.phone_storage}</span>
              <span style={{ fontWeight: 600 }}>{currency} {salePrice.toLocaleString('es-AR')}</span>
            </div>
            {tradeInValue > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 14 }}>
                <span style={{ color: 'var(--purple)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ArrowLeftRight size={12} /> {appt.trade_in_brand} {appt.trade_in_model}
                </span>
                <span style={{ color: 'var(--purple)', fontWeight: 600 }}>− {appt.trade_in_currency} {tradeInValue.toLocaleString('es-AR')}</span>
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 700 }}>
              <span>A cobrar</span>
              <span>{currency} {neto.toLocaleString('es-AR')}</span>
            </div>
          </div>

          {/* Payment methods */}
          <div style={{ marginBottom: 12 }}>
            <label className="lbl">Método de cobro</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {PAY_METHODS.map((m: any) => (
                <button
                  key={m.id}
                  onClick={() => setSm(sm === m.id ? null : m.id)}
                  className={`btn btn-sm ${sm === m.id ? 'btn-dark' : 'btn-outline'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount input for selected method */}
          {sm && (() => {
            const selPay = PAY_METHODS.find((p: any) => p.id === sm);
            const needsExchange = selPay && selPay.cur !== 'ANY' && selPay.cur !== currency;
            return (
              <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border-md)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                {needsExchange && (
                  <div className="field">
                    <label className="lbl">Cotización dólar</label>
                    <input className="inp" type="number" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} />
                  </div>
                )}
                <div className="row">
                  <div className="col field" style={{ marginBottom: 0 }}>
                    <label className="lbl">Monto en {selPay?.cur}</label>
                    <input
                      className="inp" type="number" value={ma}
                      onChange={e => setMa(e.target.value)}
                      placeholder="0.00" autoFocus
                      onKeyDown={e => e.key === 'Enter' && addP()}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button className="btn btn-dark" style={{ height: 42 }} onClick={addP}>
                      <Plus size={15} /> Agregar
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Payments list */}
          {payments.length > 0 && (
            <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border-md)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              {payments.map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: i < payments.length - 1 ? 8 : 0 }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{p.label}</span>
                    {p.exchange_rate && (
                      <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 6 }}>
                        ({p.currency === 'USD' ? 'U$' : '$'} {p.original_amount.toLocaleString()} · cot. {p.exchange_rate})
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>
                      {currency === 'USD' ? 'U$' : '$'} {p.amount.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                    </span>
                    <button onClick={() => setPayments(ps => ps.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 0, fontSize: 16 }}>×</button>
                  </div>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Saldo</span>
                <span style={{ color: rem <= 0.01 ? 'var(--green)' : 'var(--amber)' }}>
                  {rem <= 0.01 ? '✓ Cubierto' : `${currency === 'USD' ? 'U$' : '$'} ${rem.toLocaleString('es-AR', { maximumFractionDigits: 0 })} pendiente`}
                </span>
              </div>
            </div>
          )}

          {/* Deposit */}
          <div>
            <label className="lbl">Depósito</label>
            <select className="inp" value={depositId} onChange={e => setDepositId(e.target.value)}>
              {deposits.map((d: any) => (
                <option key={d.id} value={String(d.id)}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mh" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-dark"
            onClick={handleConfirm}
            disabled={saving || rem > 0.01 || payments.length === 0}
            style={{ background: rem <= 0.01 && payments.length > 0 ? 'var(--green)' : undefined, border: 'none' }}
          >
            {saving ? 'Procesando…' : <><Check size={14} /> Confirmar venta</>}
          </button>
        </div>
      </div>
    </div>
  );
}
