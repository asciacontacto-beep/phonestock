"use client"
import { cotizacionDelDia, fuenteValida, NOMBRE_FUENTE, type FuenteCotizacion } from '@/utils/cotizacion';
import { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowRight, Plus, Printer, Search, AlertTriangle, FileText, X, MapPin, PackageOpen, CreditCard, ChevronRight, Receipt as ReceiptIcon, User as UserIcon, Loader2 } from 'lucide-react';
import { PAY, BRANDS, MODELS, STORAGES, COLORS } from '@/constants/data';
import { createClient } from '@/utils/supabase/client';
import { ModelPicker } from '@/components/ModelPicker';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Receipt } from '@/components/Receipt';
import { upsertCustomer, CLIENTE_ANONIMO } from '@/utils/customers';
import { generarPlanCuotas, guardarPlanCuotas, vencimientoMensual, interesPctDesdeCuota } from '@/utils/cuotas';
import { STOCK_SIN_COSTO, ACCESORIOS_SIN_COSTO, VENTA_SIN_COSTO } from '@/utils/sinCostos';
import { calcularPagoTarjeta, resumenPlan, etiquetaPlan, opcionesDePlanes, costoDeFinanciacion, type PlanTarjeta, type QuienPaga } from '@/utils/tarjetas';
import { aceptaCuenta, cuentasDelMetodo, cuentaSugerida, datosDeCuenta, acreditaEl, type Cuenta } from '@/utils/cuentas';
import { cargarCuentas } from '@/utils/cuentasDb';
import { destinoDelCobro, montosRapidos, anticiposRapidos } from '@/utils/cobro';
import { valorSugerido, describirTramo, type ValorToma } from '@/utils/valoresToma';
import { resolveSale } from '@/utils/saleTotals';
import { imprimirDocumento } from '@/utils/imprimir';
import { configuracionDelLocal } from '@/utils/configuracion';
import { traerTodo } from '@/utils/supabase/todo';
import { reportarError } from '@/utils/reportarError';

const hoyISO = () => new Date().toLocaleDateString('en-CA');

/* La última cuenta usada con cada medio queda en este navegador: es una
   comodidad, si no se puede leer se propone la primera. */
function ultimaCuenta(metodo: string): string | null {
  try { return localStorage.getItem(`stackr:cuenta:${metodo}`); } catch { return null; }
}
function recordarCuenta(metodo: string, id: string) {
  try { localStorage.setItem(`stackr:cuenta:${metodo}`, id); } catch { /* sin almacenamiento */ }
}

export function SellClient({ isOwner, assignedDeposits = [], sellerName, orgId }: { isOwner?: boolean, assignedDeposits?: any[], sellerName?: string | null, orgId?: string | null }) {
  const [stock, setStock] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [unit, setUnit] = useState<any>(null);
  const [accessoryOnly, setAccessoryOnly] = useState(false);
  const [accessoriesList, setAccessoriesList] = useState<any[]>([]);
  const [selectedAccessories, setSelectedAccessories] = useState<any[]>([]);
  const [cust, setCust] = useState({ name: '', dni: '', phone: '', email: '', instagram: '' });
  const [notes, setNotes] = useState('');
  const [payments, setPayments] = useState<any[]>([]);
  const [sc, setSc] = useState('USD');
  const [sp, setSp] = useState('');
  const [q, setQ] = useState('');
  const [selectedDeposit, setSelectedDeposit] = useState<string | null>(null);
  const [sm, setSm] = useState<string | null>(null);
  const [ma, setMa] = useState('');
  const [exchangeRate, setExchangeRate] = useState('1000');
  /* Cotización automática (Ajustes): se trae la del día salvo que el
     usuario ya haya escrito una a mano en esta venta. */
  const [fuenteCotiz, setFuenteCotiz] = useState<FuenteCotizacion>('manual');
  const cotTocada = useRef(false);
  const [showTI, setShowTI] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  // Cuando se cobra menos que el precio marcado hay que saber si fue un
  // descuento (la venta vale menos) o si el cliente quedo debiendo.
  const [underpay, setUnderpay] = useState<'descuento' | 'debe'>('descuento');
  /* Qué hacer cuando lo entregado supera el precio. Pasa sobre todo con un
     canje tomado por más que la venta: el local le devuelve la diferencia. */
  const [overpay, setOverpay] = useState<'vuelto' | 'cobre_mas'>('vuelto');
  /* Vender en cuotas es dejar un saldo CON fechas. Sin el plan, el sistema
     sabe cuánto se debe pero no cuándo hay que cobrarlo, y no hay forma de
     saber a quién llamar hoy. */
  const [enCuotas, setEnCuotas] = useState(false);
  const [cantCuotas, setCantCuotas] = useState(3);
  const [interesPct, setInteresPct] = useState('0');
  const [valorCuota, setValorCuota] = useState('');
  const [modoInteres, setModoInteres] = useState<'pct' | 'cuota'>('pct');
  const [cardPlans, setCardPlans] = useState<PlanTarjeta[]>([]);
  const [planTarjeta, setPlanTarjeta] = useState<string>('');
  const [quienPaga, setQuienPaga] = useState<QuienPaga | null>(null);
  /* Cuentas (banco, billetera, financiera): a cuál entró cada transferencia.
     Sin la migración de cuentas la lista viene vacía y no se pregunta nada. */
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cuentaSel, setCuentaSel] = useState<string>('');
  const [valoresToma, setValoresToma] = useState<ValorToma[]>([]);
  const [primerVenc, setPrimerVenc] = useState(() => vencimientoMensual(new Date().toLocaleDateString('en-CA'), 1));
  
  const [custSearch, setCustSearch] = useState('');
  const [custSuggestions, setCustSuggestions] = useState<any[]>([]);
  const [searchingCust, setSearchingCust] = useState(false);
  const custTimer = useRef<any>(null);
  const [accSearch, setAccSearch] = useState('');
  const [accSearchOpen, setAccSearchOpen] = useState(false);
  const [selectedAccId, setSelectedAccId] = useState('');
  const [accQty, setAccQty] = useState(1);
  const [accType, setAccType] = useState<'venta' | 'regalo'>('venta');
  const accSearchRef = useRef<HTMLDivElement>(null);
  /** Nodo del comprobante: se imprime sólo esto, no la pantalla de atrás. */
  const comprobanteRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    // Fetch user session + all data in parallel — all client-side, no server wait
    Promise.all([
      supabase.auth.getSession(),
      /* Al vendedor el costo no le llega: ni en pantalla ni en los datos (lo
         que se manda al navegador se puede leer con sus herramientas). El
         costo de la venta lo completa la base (completar_costo_venta). */
      traerTodo(() => supabase.from('stock').select(isOwner ? '*' : STOCK_SIN_COSTO).eq('status', 'available').order('created_at', { ascending: false }).order('id')),
      supabase.from('deposits').select('*').order('name'),
      configuracionDelLocal(supabase, orgId),
      traerTodo(() => supabase.from('accessories').select(isOwner ? '*' : ACCESORIOS_SIN_COSTO).gt('stock', 0).order('id')),
      supabase.from('card_plans').select('*').eq('active', true).order('card_name'),
      cargarCuentas(supabase, { soloActivas: true }),
      supabase.from('tradein_values').select('*'),
    ]).then(([{ data: { session } }, { data: stockData, error: stockErr }, { data: depositsData }, { data: settingsData }, { data: accData }, { data: planesData }, cuentasRes, { data: tomaData }]: any) => {
      const u = session?.user
      if (u) {
        const isSuperAdmin = u.email === 'asciacontacto@gmail.com'
        setUser({ id: u.id, email: u.email, name: isSuperAdmin ? 'Administrador' : (sellerName || u.email) })
      }
      
      let finalDeposits = depositsData || [];
      if (!isOwner) {
        finalDeposits = finalDeposits.filter((d: any) => assignedDeposits.map(String).includes(String(d.id)));
      }
      
      if (stockErr) {
        toast.error(`No se pudo cargar el stock: ${stockErr.message}`, { duration: 10000 });
        reportarError('consulta', `Vender: ${stockErr.message}`);
      }
      setStock(stockData || []);
      setDeposits(finalDeposits);
      if (finalDeposits.length > 0) setSelectedDeposit(String(finalDeposits[0].id));
      setSettings(settingsData);
      /* La cotización arranca en la del local. Antes quedaba fija en 1000:
         un equipo en dólares vendido en pesos pasaba su costo a pesos con un
         dólar inventado y la ganancia salía cualquier cosa. */
      const cotLocal = parseFloat(String(settingsData?.exchange_rate));
      if (cotLocal > 0) setExchangeRate(String(cotLocal));
      const fuenteLocal = fuenteValida(settingsData?.cotizacion_fuente);
      setFuenteCotiz(fuenteLocal);
      if (fuenteLocal !== 'manual') {
        cotizacionDelDia(fuenteLocal).then(v => {
          if (v && !cotTocada.current) setExchangeRate(String(v));
        });
      }
      setAccessoriesList(accData || []);
      setCardPlans(planesData || []);
      setCuentas(cuentasRes?.cuentas || []);
      setValoresToma(tomaData || []);

      const preselectId = searchParams.get('item');
      if (preselectId && stockData) {
        const item = stockData.find((s: any) => String(s.id) === preselectId);
        if (item) {
          setUnit(item);
          setSp(item.price);
          setSc(item.currency);
          setStep(2);
        }
      }
    });


  }, [searchParams]);

  const shop = settings || { shop_name: 'Stackr', address: '', phone: '', instagram: '', warranty_text: '' };

  const av = stock.filter((s: any) => s.status === 'available')
    .filter((s: any) => {
      if (!isOwner && selectedDeposit === null) return false;
      return selectedDeposit === null || String(s.deposit) === selectedDeposit;
    })
    .filter((s: any) => !q || `${s.brand} ${s.model} ${s.color} ${s.storage}`.toLowerCase().includes(q.toLowerCase()));
  const price = parseFloat(sp) || 0;
  const paid = payments.reduce((a, p) => a + p.amount, 0);
  const rem = price - paid;
  /* Las reglas de plata viven en utils/saleTotals para poder testearlas:
     qué precio se registra, qué queda debiendo y qué se devolvió. */
  /* Sin ningún pago cargado la venta sólo puede ser "queda debiendo" todo:
     es la venta 100% en cuotas. "Le hice precio" registraría una venta de $0. */
  const sinPagos = payments.length === 0;
  const modoFaltante = sinPagos ? 'debe' : underpay;
  const { finalPrice, balanceDue, changeGiven, isUnderpaid, isOverpaid } =
    resolveSale(price, paid, modoFaltante, overpay);
  const overAmount = changeGiven || (isOverpaid ? -rem : 0);

  /* Si se devolvió la diferencia, queda asentada como un movimiento más: así
     la suma de los pagos coincide con el precio de la venta y el recibo
     muestra qué se le devolvió al cliente. */
  /* Una venta en pesos guarda la cotización del día en cada pago
     (sale_rate). Sin ella, los reportes la pasaban a dólares con la
     cotización de Ajustes de hoy, y el costo —convertido con otra— no
     cerraba: una venta de U$ 520 figuraba como vendida a U$ 704. */
  const paymentsToSave = () => {
    const todos = isOverpaid && overpay === 'vuelto'
      ? [...payments, { id: 'vuelto', label: 'Vuelto entregado', amount: -overAmount, original_amount: -overAmount, currency: sc }]
      : payments;
    const cot = parseFloat(exchangeRate);
    const enPesos = accessoryOnly || sc === 'ARS';
    return enPesos && cot > 0 ? todos.map(p => ({ ...p, sale_rate: cot })) : todos;
  };

  /* Equipo cargado en una moneda y vendido en otra: el costo se convierte
     con esta cotización, así que tiene que estar a la vista. */
  const unidadEnOtraMoneda = !accessoryOnly && !!unit?.currency && unit.currency !== sc;

  /* Costo del equipo expresado en la moneda de la venta, para poder avisar
     antes de confirmar si se esta vendiendo por debajo de lo que costo. */
  const unitCostInSaleCurrency = (() => {
    if (!unit?.cost_price) return null;
    const r = parseFloat(exchangeRate) || 1;
    if (unit.currency === 'USD' && sc === 'ARS') return unit.cost_price * r;
    if (unit.currency === 'ARS' && sc === 'USD') return unit.cost_price / r;
    return unit.cost_price;
  })();
  /* Vista previa del plan. Se recalcula solo: el vendedor tiene que ver las
     cuotas ANTES de confirmar, no descubrirlas después. */
  const planPreview = useMemo(() => {
    if (!enCuotas || !(balanceDue > 0)) return null;
    try {
      return generarPlanCuotas({
        precio: balanceDue, anticipo: 0, cantidad: cantCuotas,
        primerVencimiento: primerVenc, moneda: sc === 'USD' ? 'USD' : 'ARS',
        interesPct: modoInteres === 'pct' ? parseFloat(interesPct) || 0 : 0,
        valorCuota: modoInteres === 'cuota' ? parseFloat(valorCuota) || undefined : undefined,
      });
    } catch { return null; }
  }, [enCuotas, balanceDue, cantCuotas, primerVenc, sc, interesPct, valorCuota, modoInteres]);

  /* Los dos campos se completan entre sí: el que escribió el vendedor manda
     y el otro muestra su equivalente. */
  const pctMostrado = modoInteres === 'pct'
    ? interesPct
    : String(interesPctDesdeCuota({ aFinanciar: balanceDue, cantidad: cantCuotas, valorCuota: parseFloat(valorCuota) || 0 }) ?? '');
  const cuotaMostrada = modoInteres === 'cuota'
    ? valorCuota
    : planPreview ? String(planPreview.cuotas[0].amount) : '';
  const cuotaNoAlcanza = enCuotas && modoInteres === 'cuota' && (parseFloat(valorCuota) || 0) > 0
    && (parseFloat(valorCuota) || 0) * cantCuotas < balanceDue;

  /* El interés de la financiación es ingreso del local: sube el precio de la
     venta y el saldo que el cliente debe. Si sólo viviera en las cuotas, el
     reporte de ganancia no lo vería nunca. */
  const interesPlan = planPreview?.interes || 0;
  const precioAGuardar = finalPrice + interesPlan;
  const saldoAGuardar = balanceDue + interesPlan;

  const sellingBelowCost = unitCostInSaleCurrency != null && finalPrice > 0 && finalPrice < unitCostInSaleCurrency;

  const addP = () => {
    if (!sm || !ma) return;
    const amt = parseFloat(ma);
    if (amt <= 0) return;
    const m = PAY.find(p => p.id === sm);
    
    let amountInSaleCur = amt;
    const rate = parseFloat(exchangeRate) || 1;
    if (m?.cur === 'ARS' && sc === 'USD') {
      amountInSaleCur = amt / rate;
    } else if (m?.cur === 'USD' && sc === 'ARS') {
      amountInSaleCur = amt * rate;
    }
    
    /* La tarjeta es el único medio donde lo que cubre de la venta y lo que
       acredita en la caja no coinciden: el recargo se va o entra según quién
       lo pague. Guardamos los dos números y con qué plan se hizo, para poder
       auditar la venta después. */
    if (sm === 'tarjeta') {
      const plan = cardPlans.find(pl => pl.id === planTarjeta);
      if (!plan) { toast.error('Elegí el plan de tarjeta'); return; }
      const quien = quienPaga || plan.paid_by;
      const calc = calcularPagoTarjeta({ precio: amt, plan, pagaEl: quien });
      /* Dónde y cuándo acredita: sale del plan. Hasta esa fecha la plata
         figura "por acreditar", no disponible. */
      const cuentaPlan = cuentas.find(c => c.id === plan.account_id) || null;
      const acredita = acreditaEl(hoyISO(), plan.settlement_days);
      setPayments(p => [...p, {
        ...datosDeCuenta(cuentaPlan),
        ...(acredita ? { acredita_el: acredita } : {}),
        card_kind: plan.kind || 'tarjeta',
        id: sm,
        label: etiquetaPlan(plan),
        amount: sc === 'USD' ? calc.cubreDeLaVenta / rate : calc.cubreDeLaVenta,
        original_amount: calc.entraACaja,
        currency: 'ARS',
        exchange_rate: sc === 'USD' ? rate : null,
        card_plan_id: plan.id,
        card_surcharge_pct: plan.surcharge_pct,
        card_paid_by: quien,
        card_charged: calc.cobradoAlCliente,
      }]);
      setMa('');
      setSm(null);
      setQuienPaga(null);
      return;
    }

    /* Transferencia o USDT: a qué cuenta entró. Se recuerda la última
       usada con cada medio para no tener que elegirla en cada venta. */
    const cuenta = aceptaCuenta(sm)
      ? (cuentasDelMetodo(cuentas, sm).find(c => c.id === cuentaSel) || cuentaSugerida(cuentas, sm, ultimaCuenta(sm)))
      : null;
    if (cuenta) recordarCuenta(sm, cuenta.id);
    setPayments(p => [...p, { 
      id: sm, 
      label: m?.label, 
      amount: amountInSaleCur, 
      original_amount: amt,
      currency: m?.cur,
      exchange_rate: (m?.cur !== sc && m?.cur !== 'ANY') ? rate : null,
      ...datosDeCuenta(cuenta),
    }]);
    setMa('');
    setSm(null);
  };

  /* Resto a cobrar expresado en la moneda del medio elegido, para los
     botones de monto. */
  const restoEnMoneda = (cur?: string) => {
    const r = Math.max(0, rem);
    const cot = parseFloat(exchangeRate) || 0;
    if (!cur || cur === 'ANY' || cur === sc) return Math.round(r * 100) / 100;
    if (!(cot > 0)) return 0;
    return cur === 'ARS' ? Math.round(r * cot) : Math.round((r / cot) * 100) / 100;
  };

  const elegirMetodo = (id: string) => {
    setSm(id);
    setCuentaSel(cuentaSugerida(cuentas, id, ultimaCuenta(id))?.id || '');
  };

  const handleTI = (data: any) => {
    const amt = parseFloat(data.value);
    setPayments(p => [...p, { 
      id: 'tradein', 
      label: `TI: ${data.brand} ${data.model}`, 
      amount: amt, 
      original_amount: amt,
      currency: data.valueCurrency || sc,
      exchange_rate: null,
      device: data 
    }]);
    setShowTI(false);
  };

  const searchCustomer = (val: string) => {
    setCustSearch(val);
    clearTimeout(custTimer.current);
    custTimer.current = setTimeout(async () => {
      setSearchingCust(true);
      
      let query = supabase.from('customers').select('*').order('updated_at', { ascending: false }).limit(5);
      
      if (val.trim().length > 0) {
        query = query.or(`name.ilike.%${val}%,dni.ilike.%${val}%,instagram.ilike.%${val}%`);
      }
      
      const { data } = await query;
      
      if (data) {
        setCustSuggestions(data);
      }
      setSearchingCust(false);
    }, 350);
  };

  const applyCustSuggestion = (c: any) => {
    setCust({ name: c.name || '', dni: c.dni || '', phone: c.phone || '', email: c.email || '', instagram: c.instagram || '' });
    setCustSearch('');
    setCustSuggestions([]);
  };

  const confirmAccessoryOnly = async () => {
    if (selectedAccessories.length === 0) { toast.error('Agregá al menos un accesorio'); return; }
    if (!price) { toast.error('Datos incompletos'); return; }
    // Sin pagos queda todo debiendo: la deuda tiene que tener a quién.
    if (sinPagos && !cust.name.trim()) { toast.error('Para dejar el saldo pendiente cargá el cliente'); return; }
    if (cuotaNoAlcanza || (enCuotas && modoFaltante === 'debe' && !planPreview)) { toast.error('Revisá el plan de cuotas'); return; }
    try {
      setLoading(true);
      const stockWarnings: string[] = [];
      // Sin costos (vendedor) va vacío y lo completa la base.
      const totalCost = isOwner ? selectedAccessories.reduce((acc, a) => acc + (a.cost_price || 0) * a.qty, 0) : null;
      const resumen = selectedAccessories.map(a => `${a.qty}x ${a.name}`).join(' · ');
      const saleData = {
        seller_id: user.id,
        seller_name: user.name,
        deposit_id: selectedDeposit ? String(selectedDeposit) : null,
        brand: 'ACCESORIOS',
        model: resumen.slice(0, 120),
        storage: '-', color: '-',
        imei: `ACC-${Date.now()}`,
        cost_price: totalCost,
        price: precioAGuardar,
        balance_due: saldoAGuardar || null,
        currency: 'ARS',
        payments: paymentsToSave(),
        customer: cust.name.trim() ? cust : { name: CLIENTE_ANONIMO },
        notes: notes.trim() || null,
        accessories: selectedAccessories,
      };
      const { data: saleRow, error: sErr } = await supabase.from('sales').insert([saleData]).select((isOwner ? '*' : VENTA_SIN_COSTO) as string) as unknown as { data: any[]; error: any };
      if (sErr) throw sErr;

      for (const acc of selectedAccessories) {
        const { data: ok, error: accErr } = await supabase.rpc('decrement_accessory_stock', { acc_id: acc.id, qty: acc.qty });
        if (accErr) throw accErr;
        if (ok === false) stockWarnings.push(acc.name);
      }

      // Al vendedor no vuelven los accesorios (la base les completa el costo):
      // el ticket se arma con lo que ya tiene la pantalla.
      setLastSale(isOwner ? saleRow[0] : { ...saleData, ...saleRow[0] });
      toast.success('Venta de accesorios confirmada');
      if (stockWarnings.length > 0) {
        toast.warning(
          `No se pudo descontar el stock de: ${stockWarnings.join(', ')}. ` +
          `Figuraban con menos unidades de las que se vendieron — revisá el stock en Accesorios.`,
          { duration: 10000 }
        );
      }
      setStep(1); setUnit(null); setAccessoryOnly(false); setPayments([]); setSp(''); setQ(''); setNotes(''); setSelectedAccessories([]); setUnderpay('descuento'); setOverpay('vuelto'); setValorCuota(''); setModoInteres('pct');
      setCust({ name: '', dni: '', phone: '', email: '', instagram: '' });
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || 'Error al procesar venta');
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (accessoryOnly) { await confirmAccessoryOnly(); return; }
    if (!unit || !price || !cust.name) { toast.error('Datos incompletos'); return; }
    if (cuotaNoAlcanza || (enCuotas && modoFaltante === 'debe' && !planPreview)) { toast.error('Revisá el plan de cuotas'); return; }
    
    try {
      setLoading(true);
      const stockWarnings: string[] = [];
      const saleData = {
        seller_id: user.id,
        seller_name: user.name,
        deposit_id: unit.deposit,
        brand: unit.brand,
        model: unit.model,
        storage: unit.storage,
        color: unit.color,
        imei: unit.imei,
        cost_price: (() => {
          // El vendedor no tiene el costo: lo copia la base (fijar_costo_venta).
          if (!isOwner || !unit.cost_price) return null;
          const rate = parseFloat(exchangeRate) || 1;
          if (unit.currency === 'USD' && sc === 'ARS') return unit.cost_price * rate;
          if (unit.currency === 'ARS' && sc === 'USD') return unit.cost_price / rate;
          return unit.cost_price;
        })(),
        price: precioAGuardar,
        balance_due: saldoAGuardar || null,
        currency: sc,
        payments: paymentsToSave(),
        // Misma forma que la venta de accesorios: sin cliente va el relleno,
        // no un objeto con campos vacíos. Dos representaciones para lo mismo
        // hacían imposible saber después si una venta tenía cliente o no.
        customer: cust.name.trim() ? cust : { name: CLIENTE_ANONIMO },
        notes: notes.trim() || null,
        accessories: selectedAccessories
      };

      /* Primero se toma el equipo, y sólo si sigue disponible. Antes se
         registraba la venta y después se marcaba vendido sin mirar el
         estado: dos vendedores podían vender el mismo equipo, y reintentar
         tras un error a mitad de camino duplicaba la venta. */
      const { data: tomado, error: uErr } = await supabase.from('stock')
        .update({ status: 'sold' }).eq('id', unit.id).eq('status', 'available').select('id');
      if (uErr) throw uErr;
      if (!tomado || tomado.length === 0) {
        throw new Error('Este equipo ya no está disponible: se vendió o se movió. Actualizá la pantalla.');
      }

      const { data: saleRow, error: sErr } = await supabase.from('sales').insert([saleData]).select((isOwner ? '*' : VENTA_SIN_COSTO) as string) as unknown as { data: any[]; error: any };
      if (sErr) {
        // La venta no se registró: el equipo vuelve a estar disponible.
        await supabase.from('stock').update({ status: 'available' }).eq('id', unit.id).eq('status', 'sold');
        throw sErr;
      }

      /* Venta de un vendedor: el costo lo copia la base desde el equipo, sin
         pasar por este navegador. Si falla, la venta queda igual y el dueño
         la ve "sin costo". */
      if (!isOwner && saleRow?.[0]?.id) {
        await supabase.rpc('fijar_costo_venta', { p_sale_id: String(saleRow[0].id), p_stock_id: String(unit.id) });
      }

      if (selectedAccessories.length > 0) {
        for (const acc of selectedAccessories) {
          const { data: ok, error: accErr } = await supabase.rpc('decrement_accessory_stock', { acc_id: acc.id, qty: acc.qty });
          if (accErr) throw accErr;
          if (ok === false) stockWarnings.push(acc.name);
        }
      }

      const tiItems = payments.filter(pay => pay.id === 'tradein').map(pay => ({
        brand: pay.device.brand,
        model: pay.device.notes ? `${pay.device.model} (${pay.device.notes})` : pay.device.model,
        storage: pay.device.storage,
        color: pay.device.color,
        imei: pay.device.imei || `TI-${Date.now()}`,
        condition: 'used',
        battery: pay.device.battery || null,
        deposit: unit.deposit,
        status: 'available',
        price: parseFloat(pay.device.salePrice) || pay.amount,
        cost_price: pay.amount,
        currency: pay.device.valueCurrency || sc
      }));

      if (tiItems.length > 0) {
        const { data: insertedTI, error: tErr } = await supabase.from('stock').insert(tiItems).select();
        if (tErr) throw tErr;
        if (insertedTI) setStock((p: any[]) => [...insertedTI, ...p]);
      }

      setStock((p: any[]) => p.map((s: any) => s.id === unit.id ? { ...s, status: 'sold' } : s));

      let customerId: string | null = null;
      if (cust.name) {
        customerId = await upsertCustomer(supabase, cust);
      }

      /* La venta ya existe: si el plan falla, queda como una deuda sin
         fechas —como funcionaba antes— y hay que avisarlo, no tragarlo. */
      if (planPreview && saleRow?.[0]?.id) {
        const guardado = await guardarPlanCuotas(supabase, saleRow[0].id, planPreview);
        if (!guardado.ok) {
          toast.warning(`La venta se registró, pero no se pudo guardar el plan de cuotas: ${guardado.error}`, { duration: 9000 });
        }
      }

      /* La ficha del cliente se resuelve recién acá (upsertCustomer puede
         crearla). Sin este vínculo, la cuenta corriente tiene que adivinar
         de quién es la deuda por nombre. */
      if (customerId && saleRow?.[0]?.id) {
        await supabase.from('sales').update({ customer_id: customerId }).eq('id', saleRow[0].id);
      }

      // Al vendedor no vuelven los accesorios (la base les completa el costo):
      // el ticket se arma con lo que ya tiene la pantalla.
      setLastSale(isOwner ? saleRow[0] : { ...saleData, ...saleRow[0] });
      toast.success(planPreview ? `Venta confirmada · plan de ${planPreview.cuotas.length} cuotas` : 'Venta confirmada');
      if (stockWarnings.length > 0) {
        toast.warning(
          `No se pudo descontar el stock de: ${stockWarnings.join(', ')}. ` +
          `Figuraban con menos unidades de las que se vendieron — revisá el stock en Accesorios.`,
          { duration: 10000 }
        );
      }
      setStep(1); setUnit(null); setAccessoryOnly(false); setPayments([]); setSp(''); setQ(''); setNotes(''); setSelectedAccessories([]); setUnderpay('descuento'); setOverpay('vuelto'); setValorCuota(''); setModoInteres('pct');
      setCust({ name: '', dni: '', phone: '', email: '', instagram: '' });
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || JSON.stringify(e) || 'Error al procesar venta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="sh" style={{ marginBottom: 20 }}>
        <h1 className="st">Nueva Venta</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[1,2,3,4].map(n => (
            <div key={n} style={{
              width: n === step ? 20 : 8, height: 6,
              borderRadius: 4,
              background: n === step ? 'var(--text)' : 'var(--border-md)',
              transition: 'all 0.2s'
            }} />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="card">
          <div className="lbl">1. Seleccionar Equipo en Stock</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4, whiteSpace: 'nowrap' }}>
            {deposits.map(d => (
              <button 
                key={d.id}
                className={`btn ${selectedDeposit === d.id ? 'btn-dark' : 'btn-outline'} btn-sm`}
                onClick={() => setSelectedDeposit(d.id)}
              >
                {d.name}
              </button>
            ))}
          </div>
          <input className="inp" placeholder="Filtrar por modelo, IMEI / N° Serie, color..." value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 16 }} />
          <button
            className="btn btn-outline"
            style={{ width: '100%', marginBottom: 16, justifyContent: 'center' }}
            onClick={() => {
              if (!selectedDeposit) { toast.error('Elegí un depósito primero'); return; }
              setAccessoryOnly(true);
              setUnit(null);
              setSc('ARS');
              setSp('');
              setStep(2);
            }}
          >
            <PackageOpen size={16} /> Vender accesorios sueltos
          </button>
          {av.length > 0 && av.length <= 5 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 14px', background: 'rgba(245,158,11,0.1)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)' }}>
              <AlertTriangle size={16} color="var(--amber)" />
              <span style={{ fontSize: 13, color: 'var(--amber)' }}>Stock bajo: solo quedan <strong>{av.length}</strong> equipos disponibles con este filtro.</span>
            </div>
          )}
          {av.length === 0 && (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13.5, lineHeight: 1.5 }}>
              {q
                ? <>Ningún equipo coincide con “{q}”{deposits.length > 1 ? ' en este local' : ''}.</>
                : <>No hay equipos disponibles en <strong style={{ color: 'var(--text-2)' }}>{deposits.find(d => String(d.id) === String(selectedDeposit))?.name || 'este local'}</strong>.</>}
              {deposits.length > 1 && <><br />Probá en otro local con los botones de arriba.</>}
            </div>
          )}
          {av.length > 0 && <div className="tw">
            <table className="table el-tabla">
              <thead><tr><th>Equipo</th><th>Precio</th><th>Ubicación</th><th style={{ width: 30 }}></th></tr></thead>
              <tbody>
                {av.slice(0, 15).map((s: any) => (
                  <tr 
                    key={s.id} 
                    onClick={() => { setUnit(s); setSp(s.price); setSc(s.currency); setStep(2); }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="el-eq">
                      <div style={{ fontWeight: 600 }}>{s.brand} {s.model}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{s.storage} · {s.color}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{s.imei || 'Sin IMEI/Serie'}</div>
                    </td>
                    <td className="el-precio" style={{ fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{s.currency === 'USD' ? 'U$' : '$'} {s.price?.toLocaleString('es-AR')}</td>
                    <td className="el-dep"><span className="badge b-neu">{deposits.find(d => d.id === s.deposit)?.name ?? '—'}</span></td>
                    <td className="el-flecha" style={{ textAlign: 'right', color: 'var(--text-3)' }}><ArrowRight size={16} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </div>
      )}

      {step === 3 && (
        <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="lbl">3. Datos del Cliente</div>
          <div className="field" style={{ position: 'relative' }}>
            <label className="lbl">Buscar cliente anterior (DNI o nombre)</label>
            <div className="search-inp-wrapper" style={{ position: 'relative' }}>
              <Search size={16} className="search-icon" style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-3)' }} />
              <input 
                className="inp" 
                style={{ paddingLeft: 32 }}
                placeholder="Buscar cliente guardado (Nombre, DNI o Instagram)..." 
                value={custSearch}
                onChange={e => searchCustomer(e.target.value)}
                onFocus={e => searchCustomer(e.target.value)}
                autoComplete="off"
              />
              {searchingCust && <div style={{ position: 'absolute', right: 12, top: 10 }}><Loader2 className="spin" size={16} /></div>}
            </div>
            
            {custSuggestions.length > 0 && (
              <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, overflow: 'hidden', position: 'absolute', zIndex: 50, width: '100%' }}>
                {custSuggestions.map((c, i) => (
                  <div 
                    key={i} 
                    style={{ padding: '10px 14px', borderBottom: i === custSuggestions.length - 1 ? 'none' : '1px solid var(--border)', cursor: 'pointer' }}
                    className="hover-bg pick-row"
                    onMouseDown={(e) => { e.preventDefault(); applyCustSuggestion(c); }}
                  >
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.dni ? `DNI: ${c.dni} ` : ''}{c.phone ? `· Tel: ${c.phone} ` : ''}{c.instagram ? `· @${c.instagram.replace('@','')}` : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="divider" style={{ margin: '12px 0' }} />
          <div className="field"><label className="lbl">Nombre y Apellido *</label><input className="inp" value={cust.name} onChange={e => setCust(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Juan Perez" /></div>
          <div className="row">
            <div className="col field"><label className="lbl">DNI / CUIT</label><input className="inp" value={cust.dni} onChange={e => setCust(p => ({ ...p, dni: e.target.value }))} /></div>
            <div className="col field"><label className="lbl">Teléfono</label><input className="inp" value={cust.phone} onChange={e => setCust(p => ({ ...p, phone: e.target.value }))} /></div>
          </div>
          <div className="row">
            <div className="col field"><label className="lbl">Email</label><input className="inp" value={cust.email} onChange={e => setCust(p => ({ ...p, email: e.target.value }))} /></div>
            <div className="col field"><label className="lbl">Instagram</label><input className="inp" value={cust.instagram} onChange={e => setCust(p => ({ ...p, instagram: e.target.value }))} placeholder="@usuario" /></div>
          </div>
          <div className="divider" />
          <div className="paso-acciones" style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>Volver</button>
            <button className="btn btn-dark btn-lg" style={{ flex: 1 }} disabled={!accessoryOnly && !cust.name} onClick={() => setStep(4)}>Continuar al Pago</button>
          </div>
        </div>
      )}

      
      {step === 2 && (
        <div className="card">
          <div className="lbl">2. Accesorios Adicionales (Opcional)</div>
          <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>Agregá fundas, vidrios, cargadores a esta venta. Podés marcarlos como de regalo (costo 0) o cobrarlos.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {/* Elegir accesorio: mientras no hay uno elegido se busca; una vez
                  elegido se muestra en una tarjeta propia. Antes el nombre se
                  metía dentro del input de búsqueda, que en un teléfono lo
                  corta y deja sin saber qué se seleccionó ni a qué precio. */}
              {(() => {
                const picked = accessoriesList.find(a => a.id === selectedAccId);
                if (picked) {
                  const label = `${picked.category}${picked.compatible_model ? ' ' + picked.compatible_model : ''}${picked.color ? ' ' + picked.color : ''}`;
                  return (
                    <div className="acc-picked">
                      <div className="acc-picked-main">
                        <div className="acc-picked-name">{label}</div>
                        <div className="acc-picked-meta">
                          Stock {picked.stock} · {picked.currency === 'ARS' ? '$' : 'U$'} {(picked.sale_price || 0).toLocaleString('es-AR')}
                        </div>
                      </div>
                      <button
                        className="btn-icon"
                        title="Elegir otro"
                        onClick={() => { setSelectedAccId(''); setAccSearch(''); setAccSearchOpen(true); }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                }
                return (
                  <div ref={accSearchRef} className="acc-search-wrap">
                    <input
                      className="inp"
                      placeholder="Buscar accesorio..."
                      value={accSearch}
                      onChange={e => { setAccSearch(e.target.value); setSelectedAccId(''); setAccSearchOpen(true); }}
                      onFocus={() => setAccSearchOpen(true)}
                      onBlur={() => setTimeout(() => setAccSearchOpen(false), 150)}
                      style={{ width: '100%' }}
                    />
                    {accSearchOpen && (
                      <div className="acc-dropdown">
                        {accessoriesList
                          .filter(a => {
                            const baseFilter = accessoryOnly
                              ? (a.currency || 'ARS') === 'ARS'
                              : String(a.deposit_id) === String(unit?.deposit);
                            if (!accSearch.trim()) return baseFilter;
                            return baseFilter && `${a.category} ${a.compatible_model || ''} ${a.color || ''}`.toLowerCase().includes(accSearch.toLowerCase());
                          })
                          .map(a => {
                            const label = `${a.category}${a.compatible_model ? ' ' + a.compatible_model : ''}${a.color ? ' ' + a.color : ''}`;
                            return (
                              <div
                                key={a.id}
                                className="pick-row acc-option"
                                onMouseDown={() => {
                                  setSelectedAccId(a.id);
                                  setAccSearch('');
                                  setAccSearchOpen(false);
                                }}
                              >
                                <span className="acc-option-name">{label}</span>
                                <span className="acc-option-meta">
                                  Stock {a.stock} · {a.currency === 'ARS' ? '$' : 'U$'} {(a.sale_price || 0).toLocaleString('es-AR')}
                                </span>
                              </div>
                            );
                          })}
                        {accessoriesList.filter(a => {
                          const base = accessoryOnly ? (a.currency || 'ARS') === 'ARS' : String(a.deposit_id) === String(unit?.deposit);
                          if (!accSearch.trim()) return base;
                          return base && `${a.category} ${a.compatible_model || ''} ${a.color || ''}`.toLowerCase().includes(accSearch.toLowerCase());
                        }).length === 0 && (
                          <div style={{ padding: '14px', fontSize: 13, color: 'var(--text-3)' }}>Sin resultados</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Cantidad, tipo y alta. Deshabilitados hasta elegir, para que
                  quede claro cuál es el paso que falta. */}
              <div className="acc-controls">
                <label className="acc-ctl">
                  <span className="acc-ctl-lbl">Cantidad</span>
                  <input
                    type="number"
                    className="inp"
                    value={accQty}
                    min={1}
                    disabled={!selectedAccId}
                    onChange={e => setAccQty(parseInt(e.target.value) || 1)}
                  />
                </label>
                <label className="acc-ctl acc-ctl-type">
                  <span className="acc-ctl-lbl">Tipo</span>
                  <select className="inp" value={accType} disabled={!selectedAccId} onChange={e => setAccType(e.target.value as 'venta' | 'regalo')}>
                    <option value="venta">Vender</option>
                    <option value="regalo">De Regalo</option>
                  </select>
                </label>
                <button className="btn btn-dark acc-add" disabled={!selectedAccId} onClick={() => {
                  if (!selectedAccId) return;
                  const acc = accessoriesList.find(a => a.id === selectedAccId);
                  if (!acc) return;
                  if (accQty > acc.stock) return toast.error('No hay stock suficiente');
                  setSelectedAccessories(p => {
                    const existing = p.find(x => x.id === selectedAccId && x.is_gift === (accType === 'regalo'));
                    if (existing) return p.map(x => x === existing ? { ...x, qty: x.qty + accQty } : x);
                    return [...p, { id: selectedAccId, name: `${acc.category} ${acc.compatible_model || ''} ${acc.color || ''}`.trim(), qty: accQty, price: accType === 'regalo' ? 0 : acc.sale_price, is_gift: accType === 'regalo', cost_price: acc.cost_price, currency: acc.currency || 'USD' }];
                  });
                  setAccSearch(''); setSelectedAccId(''); setAccQty(1);
                }}><Plus size={16}/> Agregar</button>
              </div>
            </div>

            {selectedAccessories.length > 0 && (
              <div style={{ borderTop: '1px dashed var(--border-md)', paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase' }}>Accesorios agregados</div>
                {selectedAccessories.map((sa, i) => (
                  <div key={i} className="acc-added">
                    <div className="acc-added-main">
                      <div className="acc-added-name"><strong>{sa.qty}×</strong> {sa.name}</div>
                      <div className="acc-added-meta">
                        {sa.is_gift
                          ? <span className="badge b-green">Regalo</span>
                          : <>{sa.currency === 'ARS' ? '$' : 'U$'} {(sa.price || 0).toLocaleString('es-AR')} c/u</>}
                      </div>
                    </div>
                    <button className="btn-icon" title="Quitar" onClick={() => setSelectedAccessories(p => p.filter((_, j) => j !== i))}><X size={15} color="var(--red)"/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="paso-acciones" style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>Atrás</button>
            <button className="btn btn-dark btn-lg" style={{ flex: 1 }} onClick={() => {
               if (accessoryOnly) {
                 if (selectedAccessories.length === 0) { toast.error('Agregá al menos un accesorio'); return; }
                 const total = selectedAccessories.reduce((acc, c) => acc + (c.is_gift ? 0 : c.price * c.qty), 0);
                 setSp(String(total));
                 setSc('ARS');
               }
               setStep(3);
            }}>Continuar al Cliente</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="lbl">4. Pago y Cierre</div>
          <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 8, marginBottom: 20 }}>
            {accessoryOnly ? (
              <>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Venta de accesorios</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  {selectedAccessories.map(a => `${a.qty}x ${a.name}`).join(' · ')}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{unit.brand} {unit.model}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{unit.storage} · {unit.color}</div>
                {isOwner && unit.cost_price && (
                  <div style={{ fontSize: 11, marginTop: 6, color: 'var(--text-3)' }}>
                    Precio de costo: <span style={{ fontFamily: 'JetBrains Mono' }}>{unit.currency === 'USD' ? 'U$' : '$'} {unit.cost_price?.toLocaleString('es-AR')}</span>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="row">
            <div className="col field"><label className="lbl">Precio de Venta</label><input className="inp" type="number" value={sp} onChange={e => setSp(e.target.value)} /></div>
            {!accessoryOnly && (
              <div className="col field"><label className="lbl">Moneda Venta</label><select className="inp" value={sc} onChange={e => {
                const nueva = e.target.value;
                // El precio se pasa a la moneda nueva: si no, "520" dólares
                // quedaba como $520 pesos.
                const cot = parseFloat(exchangeRate) || 0;
                const monto = parseFloat(sp);
                if (cot > 0 && monto > 0 && nueva !== sc) {
                  setSp(String(nueva === 'ARS' ? Math.round(monto * cot) : Math.round((monto / cot) * 100) / 100));
                }
                setSc(nueva); setPayments([]);
              }}>
                <option value="USD">Dólar (USD)</option>
                <option value="ARS">Pesos (ARS)</option>
              </select></div>
            )}
          </div>
          {unidadEnOtraMoneda && (() => {
            const cot = parseFloat(exchangeRate) || 0;
            const equivale = cot > 0 && price > 0 ? (sc === 'ARS' ? price / cot : price * cot) : null;
            return (
              <div className="row">
                <div className="col field">
                  <label className="lbl">Cotización del dólar de hoy{fuenteCotiz !== 'manual' ? ` · ${NOMBRE_FUENTE[fuenteCotiz].toLowerCase()} automático` : ''}</label>
                  <input className="inp" type="number" value={exchangeRate} onChange={e => { cotTocada.current = true; setExchangeRate(e.target.value); }} />
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>
                    El equipo está cargado en {unit.currency === 'USD' ? 'dólares' : 'pesos'}: con esta cotización se pasan a {sc === 'ARS' ? 'pesos' : 'dólares'} el precio y el costo.
                    {equivale !== null && (
                      <> Esta venta equivale a <strong style={{ color: 'var(--text)' }}>
                        {sc === 'ARS' ? 'U$' : '$'} {equivale.toLocaleString('es-AR', { maximumFractionDigits: sc === 'ARS' ? 0 : 2 })}
                      </strong>{unit.price ? <> (el equipo figura a {unit.currency === 'USD' ? 'U$' : '$'} {Number(unit.price).toLocaleString('es-AR')})</> : null}.</>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
          <div className="lbl">Método de Cobro</div>
          <div className="sell-pay-grid">
            {PAY.map(m => {
              const disabled = false; // Allow mixing currencies (ARS and USD)
              return <button key={m.id} disabled={disabled} className={`btn ${sm === m.id ? 'btn-dark' : 'btn-outline'} btn-sm`} onClick={() => { if (m.id === 'tradein') { setShowTI(true); setSm(null); } else { elegirMetodo(m.id); } }}>
                {m.id === 'tarjeta' && cardPlans.some(pl => pl.kind === 'financiera') ? 'Tarjeta / financiera' : m.label}
              </button>;
            })}
          </div>
          {sm && (
            <div className="card" style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', padding: 16, marginBottom: 16 }}>
              {(() => {
                const selectedPay = PAY.find(p => p.id === sm);
                const needsExchange = selectedPay && selectedPay.cur !== 'ANY' && selectedPay.cur !== sc;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {needsExchange && (
                      <div className="field" style={{ margin: 0 }}>
                        <label className="lbl">Cotización Dólar</label>
                        <input className="inp" type="number" value={exchangeRate} onChange={e => { cotTocada.current = true; setExchangeRate(e.target.value); }} />
                      </div>
                    )}
                    {sm === 'tarjeta' && (
                      cardPlans.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--amber)', lineHeight: 1.5 }}>
                          No tenés planes de tarjeta cargados. Cargalos en Ajustes → Planes de tarjeta
                          para que el recargo quede registrado en la venta.
                        </div>
                      ) : (() => {
                        const plan = cardPlans.find(pl => pl.id === planTarjeta);
                        const quien = quienPaga || plan?.paid_by || 'customer';
                        const monto = parseFloat(ma) || 0;
                        const res = plan ? resumenPlan({ precio: monto, costo: unitCostInSaleCurrency, plan, pagaEl: quien }) : null;
                        /* La ganancia es de TODA la venta: precio − costo − lo que
                           se llevan esta tarjeta y las que ya se cargaron. Medirla
                           contra el monto de este pago daba pérdidas que no eran
                           (un pago parcial contra el costo entero del equipo). */
                        const aVenta = sc === 'USD' ? 1 / (parseFloat(exchangeRate) || 1) : 1;
                        const gananciaVenta = res && unitCostInSaleCurrency != null
                          ? Math.round((price - unitCostInSaleCurrency - (res.costoParaElLocal + costoDeFinanciacion(payments)) * aVenta) * 100) / 100
                          : null;
                        const cuentaPlan = plan ? cuentas.find(c => c.id === plan.account_id) : null;
                        const acredita = plan ? acreditaEl(hoyISO(), plan.settlement_days) : null;
                        return (
                          <>
                            {/* Cada plan con lo que paga el cliente y la cuota, para
                                elegir viendo los números y no un porcentaje suelto. */}
                            <div className="field" style={{ margin: 0 }}>
                              <label className="lbl">
                                Plan · qué paga el cliente{!(parseFloat(ma) > 0) && restoEnMoneda('ARS') > 0 ? ` por $ ${restoEnMoneda('ARS').toLocaleString('es-AR')}` : ''}
                              </label>
                              <div className="planes-grid">
                                {opcionesDePlanes(cardPlans, parseFloat(ma) || restoEnMoneda('ARS')).map(({ plan: pl, total, cuota }) => (
                                  <button key={pl.id} type="button" className="plan-op" aria-pressed={planTarjeta === pl.id}
                                    onClick={() => {
                                      setPlanTarjeta(pl.id); setQuienPaga(null);
                                      if (!(parseFloat(ma) > 0) && restoEnMoneda('ARS') > 0) setMa(String(restoEnMoneda('ARS')));
                                    }}>
                                    <span>
                                      <span className="plan-op-nombre">{pl.card_name} · {pl.installments === 1 ? '1 pago' : `${pl.installments} cuotas`}</span>
                                      <span className="plan-op-sub" style={{ display: 'block' }}>
                                        {pl.kind === 'financiera' ? 'Financiera · ' : ''}
                                        {Number(pl.surcharge_pct) === 0 ? 'sin recargo' : `${pl.paid_by === 'shop' ? (pl.kind === 'financiera' ? 'retiene' : 'absorbe el local') : 'recargo'} ${pl.surcharge_pct}%`}
                                        {Number(pl.settlement_days) > 0 ? ` · acredita a ${pl.settlement_days} días` : ''}
                                      </span>
                                    </span>
                                    {total > 0 && (
                                      <span>
                                        <span className="plan-op-total" style={{ display: 'block' }}>$ {total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                                        {pl.installments > 1 && <span className="plan-op-cuota" style={{ display: 'block' }}>{pl.installments} × $ {cuota.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {plan && plan.surcharge_pct > 0 && (
                              <div className="field" style={{ margin: 0 }}>
                                <label className="lbl">¿Quién paga el recargo?</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button className={`btn btn-sm ${quien === 'customer' ? 'btn-dark' : 'btn-outline'}`}
                                    style={{ flex: 1 }} onClick={() => setQuienPaga('customer')}>El cliente</button>
                                  <button className={`btn btn-sm ${quien === 'shop' ? 'btn-dark' : 'btn-outline'}`}
                                    style={{ flex: 1 }} onClick={() => setQuienPaga('shop')}>Lo absorbe el local</button>
                                </div>
                              </div>
                            )}
                            {res && monto > 0 && (
                              <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 10, fontSize: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text-3)' }}>Paga el cliente</span>
                                  <span style={{ fontFamily: 'JetBrains Mono' }}>$ {res.cobradoAlCliente.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text-3)' }}>
                                    {cuentaPlan ? `Entra a ${cuentaPlan.name}` : 'Entra a la caja'}
                                    {acredita ? ` el ${acredita.split('-').reverse().slice(0, 2).join('/')}` : ''}
                                  </span>
                                  <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--green)' }}>$ {res.entraACaja.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
                                </div>
                                {res.costoParaElLocal > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--red)' }}>
                                    <span>Se lleva la tarjeta</span>
                                    <span style={{ fontFamily: 'JetBrains Mono' }}>− $ {res.costoParaElLocal.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
                                  </div>
                                )}
                                {gananciaVenta !== null && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 4, color: gananciaVenta < 0 ? 'var(--red)' : 'var(--green)' }}>
                                    <span>Ganancia de la venta</span>
                                    <span style={{ fontFamily: 'JetBrains Mono' }}>{sc === 'USD' ? 'U$' : '$'} {gananciaVenta.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
                                  </div>
                                )}
                                {res.cobradoAlCliente > res.cubreDeLaVenta && (
                                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>
                                    El recargo lo paga el cliente: compensa lo que cobra la tarjeta, no es ganancia.
                                  </div>
                                )}
                                {gananciaVenta !== null && gananciaVenta < 0 && (
                                  <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4, lineHeight: 1.5 }}>
                                    Con este plan la venta da pérdida: el recargo que absorbés supera el margen.
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()
                    )}
                    <div className="row">
                      <div className="col field" style={{ margin: 0 }}>
                        <label className="lbl">
                          {sm === 'tarjeta' ? 'Precio de lista a pasar por tarjeta (ARS)' : `Monto a cobrar en ${selectedPay?.cur}`}
                        </label>
                        <input className="inp" type="number" value={ma} onChange={e => setMa(e.target.value)} placeholder="0.00" autoFocus onKeyDown={e => e.key === 'Enter' && addP()} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button className="btn btn-dark" style={{ height: 42 }} onClick={addP}><Plus size={16} /> Agregar</button>
                      </div>
                    </div>
                    {/* Montos rápidos: el resto justo y billetes redondos (el
                        vuelto lo resuelve la pantalla). Sin pagos todavía, también
                        los anticipos típicos de una seña. */}
                    {(() => {
                      const cur = selectedPay?.cur === 'ANY' ? sc : (selectedPay?.cur || sc);
                      const resto = restoEnMoneda(cur);
                      const esEfectivo = sm === 'ars_cash' || sm === 'usd_cash';
                      const montos = sm === 'tarjeta' ? (resto > 0 ? [resto] : []) : esEfectivo ? montosRapidos(resto, cur === 'USD' ? 'USD' : 'ARS') : (resto > 0 ? [resto] : []);
                      const anticipos = payments.length === 0 && sm !== 'tarjeta' ? anticiposRapidos(resto, cur === 'USD' ? 'USD' : 'ARS') : [];
                      const simbolo = cur === 'USD' ? 'U$' : '$';
                      if (montos.length === 0 && anticipos.length === 0) return null;
                      return (
                        <div>
                          {montos.length > 0 && (
                            <div className="montos-rapidos" aria-label="Montos rápidos">
                              {montos.map((v, i) => (
                                <button key={v} type="button" className="monto-rapido" onClick={() => setMa(String(v))}>
                                  {i === 0 ? 'Justo · ' : ''}{simbolo} {v.toLocaleString('es-AR')}
                                </button>
                              ))}
                            </div>
                          )}
                          {anticipos.length > 0 && (
                            <div className="montos-rapidos" aria-label="Anticipo o seña">
                              <span style={{ fontSize: 11.5, color: 'var(--text-3)', alignSelf: 'center' }}>Seña:</span>
                              {anticipos.map(a => (
                                <button key={a.pct} type="button" className="monto-rapido" onClick={() => setMa(String(a.monto))}>
                                  {a.pct}% · {simbolo} {a.monto.toLocaleString('es-AR')}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {/* A qué cuenta entró la transferencia. Con una sola cuenta
                        de esa moneda no se pregunta: se dice. */}
                    {aceptaCuenta(sm) && (() => {
                      const posibles = cuentasDelMetodo(cuentas, sm);
                      if (posibles.length === 0) return null;
                      if (posibles.length === 1) {
                        return <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Entra a <strong style={{ color: 'var(--text)' }}>{posibles[0].name}</strong></div>;
                      }
                      return (
                        <div className="field" style={{ margin: 0 }}>
                          <label className="lbl">¿A qué cuenta entró?</label>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {posibles.map(c => (
                              <button key={c.id} type="button" className={`btn btn-sm ${cuentaSel === c.id ? 'btn-dark' : 'btn-outline'}`} onClick={() => setCuentaSel(c.id)}>
                                {c.name}{c.kind === 'financiera' ? ' (financiera)' : ''}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>
          )}
          {(payments.length > 0 || price > 0) && (
            <div className="card" style={{ background: 'var(--surface-2)', padding: 16, marginBottom: 16 }}>
              {sinPagos && (
                <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 10, lineHeight: 1.5 }}>
                  Todavía no cargaste ningún pago. Si el cliente se lleva el equipo y paga todo en cuotas,
                  armá el plan acá abajo; si paga algo hoy, cargalo arriba como anticipo.
                </div>
              )}
              {payments.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>{p.label}</span>
                    {p.exchange_rate && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.currency === 'USD' ? 'U$' : '$'} {p.original_amount.toLocaleString('es-AR')} (Cot. {p.exchange_rate})</span>}
                    {p.id === 'tarjeta' && p.card_charged != null && Number(p.card_charged) !== Number(p.amount) && (
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>el cliente paga $ {Number(p.card_charged).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                    )}
                    {p.account_name && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>entra a {p.account_name}{p.acredita_el ? ` · acredita el ${String(p.acredita_el).split('-').reverse().slice(0, 2).join('/')}` : ''}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'JetBrains Mono' }}>{sc === 'USD' ? 'U$' : '$'} {p.amount.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
                    <button className="btn-ghost" onClick={() => setPayments(ps => ps.filter((_, j) => j !== i))} style={{ padding: 0, color: 'var(--red)' }}>×</button>
                  </div>
                </div>
              ))}
              <div className="divider" style={{ margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span style={{ flex: 1 }}>Saldo</span>
                <span style={{ color: isOverpaid ? 'var(--blue)' : rem <= 0.01 ? 'var(--green)' : 'var(--amber)' }}>
                  {isOverpaid
                    ? `${sc === 'USD' ? 'U$' : '$'} ${overAmount.toLocaleString('es-AR', { maximumFractionDigits: 2 })} a favor del cliente`
                    : rem <= 0.01 ? 'Cubierto' : `${sc === 'USD' ? 'U$' : '$'} ${rem.toLocaleString('es-AR', { maximumFractionDigits: 2 })} pendiente`}
                </span>
              </div>

              {/* A dónde va la plata: lo que entra hoy, lo que acredita más
                  adelante, el equipo del canje y lo que queda debiendo. */}
              {payments.length > 0 && (() => {
                const destinos = destinoDelCobro(paymentsToSave(), {
                  monedaVenta: sc === 'USD' ? 'USD' : 'ARS',
                  saldoPendiente: modoFaltante === 'debe' ? saldoAGuardar : 0,
                  hoy: hoyISO(),
                });
                if (destinos.length === 0) return null;
                const CUANDO = { hoy: 'hoy', acredita: 'después', canje: 'canje', credito: 'a cobrar' } as const;
                return (
                  <div className="plata" style={{ marginTop: 12, background: 'var(--surface-3)' }}>
                    <div className="plata-titulo">A dónde va la plata</div>
                    {destinos.map(d => (
                      <div key={d.clave} className="plata-fila">
                        <span>
                          {d.etiqueta}<span className="plata-cuando" data-c={d.cuando}>{CUANDO[d.cuando]}</span>
                          {d.detalle && <span className="plata-sub" style={{ display: 'block' }}>{d.detalle}</span>}
                        </span>
                        <span>{d.moneda === 'USD' ? 'U$' : '$'} {d.monto.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {isUnderpaid && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border-md)' }}>
                  {!sinPagos && (
                    <>
                      <div style={{ fontSize: 13, marginBottom: 8 }}>
                        Estás cobrando <strong>{sc === 'USD' ? 'U$' : '$'} {rem.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</strong> menos que el precio marcado.
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className={`btn btn-sm ${underpay === 'descuento' ? 'btn-dark' : 'btn-outline'}`}
                          style={{ flex: 1 }}
                          onClick={() => setUnderpay('descuento')}
                        >
                          Le hice precio
                        </button>
                        <button
                          className={`btn btn-sm ${underpay === 'debe' ? 'btn-dark' : 'btn-outline'}`}
                          style={{ flex: 1 }}
                          onClick={() => setUnderpay('debe')}
                        >
                          Queda debiendo
                        </button>
                      </div>
                    </>
                  )}
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: sinPagos ? 0 : 8, lineHeight: 1.5 }}>
                    {modoFaltante === 'descuento'
                      ? `Se registra la venta por ${sc === 'USD' ? 'U$' : '$'} ${finalPrice.toLocaleString('es-AR', { maximumFractionDigits: 2 })}, que es lo que realmente cobraste.`
                      : `Se registra por el precio completo y queda un saldo pendiente de ${sc === 'USD' ? 'U$' : '$'} ${rem.toLocaleString('es-AR', { maximumFractionDigits: 2 })}.`}
                  </div>

                  {modoFaltante === 'debe' && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border-md)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                        <input type="checkbox" checked={enCuotas} onChange={e => setEnCuotas(e.target.checked)} />
                        <span>Armar plan de cuotas con vencimientos</span>
                      </label>

                      {enCuotas && (
                        <>
                          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                            <div style={{ flex: 1 }}>
                              <label className="lbl">Cuotas</label>
                              <select className="inp" value={cantCuotas} onChange={e => setCantCuotas(parseInt(e.target.value))}>
                                {[2, 3, 4, 5, 6, 9, 12].map(n => <option key={n} value={n}>{n}</option>)}
                              </select>
                            </div>
                            <div style={{ flex: 1 }}>
                              <label className="lbl">Interés %</label>
                              <input className="inp" type="number" min="0" step="0.5" value={pctMostrado}
                                onChange={e => { setModoInteres('pct'); setInteresPct(e.target.value); }} placeholder="0" />
                            </div>
                            {/* "Son 3 de 100 mil": el vendedor carga la cuota
                                y el interés se calcula solo. */}
                            <div style={{ flex: 1.2 }}>
                              <label className="lbl">Valor de cada cuota</label>
                              <input className="inp" type="number" min="0" step="any" value={cuotaMostrada}
                                onChange={e => { setModoInteres('cuota'); setValorCuota(e.target.value); }}
                                placeholder={sc === 'USD' ? 'U$' : '$'} />
                            </div>
                          </div>
                          <div style={{ marginTop: 10 }}>
                            <label className="lbl">Primer vencimiento</label>
                            <input className="inp" type="date" value={primerVenc} onChange={e => setPrimerVenc(e.target.value)} />
                          </div>
                          {cuotaNoAlcanza && (
                            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--red)' }}>
                              {cantCuotas} cuotas de {sc === 'USD' ? 'U$' : '$'} {(parseFloat(valorCuota) || 0).toLocaleString('es-AR')} no cubren
                              los {sc === 'USD' ? 'U$' : '$'} {balanceDue.toLocaleString('es-AR', { maximumFractionDigits: 2 })} que quedan. Subí la cuota o hacé el descuento en el precio.
                            </div>
                          )}

                          {planPreview && (
                            <div style={{ marginTop: 10, background: 'var(--surface-2)', borderRadius: 10, padding: 10 }}>
                              {planPreview.interes > 0 && (
                                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 8, fontSize: 12 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-3)' }}>
                                    <span>Saldo a financiar</span>
                                    <span style={{ fontFamily: 'JetBrains Mono' }}>{sc === 'USD' ? 'U$' : '$'} {planPreview.aFinanciar.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--amber)' }}>
                                    <span>Interés {pctMostrado}%</span>
                                    <span style={{ fontFamily: 'JetBrains Mono' }}>+ {sc === 'USD' ? 'U$' : '$'} {planPreview.interes.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 4 }}>
                                    <span>Total en cuotas</span>
                                    <span style={{ fontFamily: 'JetBrains Mono' }}>{sc === 'USD' ? 'U$' : '$'} {planPreview.totalFinanciado.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
                                  </div>
                                </div>
                              )}
                              {planPreview.cuotas.map(c => (
                                <div key={c.number} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
                                  <span style={{ color: 'var(--text-3)' }}>
                                    Cuota {c.number}/{planPreview.cuotas.length} · vence {c.due_date.split('-').reverse().join('/')}
                                  </span>
                                  <span style={{ fontFamily: 'JetBrains Mono' }}>
                                    {sc === 'USD' ? 'U$' : '$'} {c.amount.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              ))}
                              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.5 }}>
                                {planPreview.interes > 0
                                  ? `La venta se registra por ${sc === 'USD' ? 'U$' : '$'} ${planPreview.precioConInteres.toLocaleString('es-AR', { maximumFractionDigits: 2 })} — el interés es ingreso tuyo y cuenta en la ganancia. `
                                  : 'Sin interés. '}
                                Lo que cobrás hoy entra a la caja ahora; cada cuota entra el día que la cobres,
                                desde la ficha del cliente.
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isOverpaid && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border-md)' }}>
                  <div style={{ fontSize: 13, marginBottom: 8 }}>
                    Lo entregado supera el precio en <strong>{sc === 'USD' ? 'U$' : '$'} {overAmount.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</strong>.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className={`btn btn-sm ${overpay === 'vuelto' ? 'btn-dark' : 'btn-outline'}`}
                      style={{ flex: 1 }}
                      onClick={() => setOverpay('vuelto')}
                    >
                      Le devolví la diferencia
                    </button>
                    <button
                      className={`btn btn-sm ${overpay === 'cobre_mas' ? 'btn-dark' : 'btn-outline'}`}
                      style={{ flex: 1 }}
                      onClick={() => setOverpay('cobre_mas')}
                    >
                      Cobré de más
                    </button>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.5 }}>
                    {overpay === 'vuelto'
                      ? `La venta se registra por ${sc === 'USD' ? 'U$' : '$'} ${price.toLocaleString('es-AR', { maximumFractionDigits: 2 })} y queda asentado que le devolviste ${sc === 'USD' ? 'U$' : '$'} ${overAmount.toLocaleString('es-AR', { maximumFractionDigits: 2 })}. Es lo habitual cuando el equipo que te dejan en canje vale más que la venta.`
                      : `La venta se registra por ${sc === 'USD' ? 'U$' : '$'} ${paid.toLocaleString('es-AR', { maximumFractionDigits: 2 })}, que es todo lo que entró.`}
                  </div>
                </div>
              )}

              {sellingBelowCost && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 12, padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
                  <AlertTriangle size={15} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-2)' }}>
                    Estás vendiendo por debajo del costo. El equipo te salió{' '}
                    <strong>{sc === 'USD' ? 'U$' : '$'} {unitCostInSaleCurrency!.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</strong>{' '}
                    y lo estás dejando en {sc === 'USD' ? 'U$' : '$'} {finalPrice.toLocaleString('es-AR', { maximumFractionDigits: 2 })}.
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="field" style={{ marginTop: 16 }}>
            <label className="lbl" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={14} /> Notas / Garantía (opcional)
            </label>
            <textarea className="inp" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Garantía 30 días..." rows={2} style={{ resize: 'none' }} />
          </div>
          <div className="paso-acciones" style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={() => setStep(3)}>Atrás</button>
            {/* Antes se bloqueaba si no cerraba exacto: no se podía registrar
                ni un saldo pendiente ni un canje tomado por más que la venta.
                Ahora cada caso tiene su resolución explícita arriba. */}
            <button className="btn btn-dark btn-lg" style={{ flex: 1 }} disabled={!price || loading || cuotaNoAlcanza} onClick={confirm}>
              {loading ? 'Procesando...' : 'Finalizar Operación'}
            </button>
          </div>
        </div>
      )}

      {showTI && (
        <div className="mo" style={{ zIndex: 1000 }}>
          <div className="mb">
            <div className="mh"><div className="mh-title">Tomar equipo usado</div><button className="btn-icon" onClick={() => setShowTI(false)}><X size={18}/></button></div>
            <div className="mbd">
              <TradeInForm currency={sc} onConfirm={handleTI} valores={valoresToma} />
            </div>
          </div>
        </div>
      )}

      {lastSale && (
        <div className="mo" style={{ zIndex: 1000 }}>
          <div className="mb" style={{ maxWidth: 450 }}>
            <div className="mh"><div className="mh-title">Comprobante</div><button className="btn btn-outline btn-sm no-print" onClick={() => imprimirDocumento(comprobanteRef.current)}><Printer size={14} /> Imprimir</button></div>
            <div className="mbd" style={{ background: '#fff' }}>
              <div ref={comprobanteRef}><Receipt sale={lastSale} shop={shop} /></div>
            </div>
            <div className="mh no-print"><button className="btn btn-dark" style={{ width: '100%' }} onClick={() => setLastSale(null)}>Listo / Nueva Venta</button></div>
          </div>
        </div>
      )}
      <div style={{ height: 80 }} />
    </div>
  );
}

function TradeInForm({ currency, onConfirm, valores = [] }: any) {
  const [appleCategory, setAppleCategory] = useState('iPhone');
  const [f, setF] = useState({
    brand: 'Apple', model: 'iPhone 12', storage: '128GB', color: 'Negro',
    imei: '', condition: 'used', battery: '', notes: '', salePrice: '', value: '', valueCurrency: currency
  });

  return (
    <>
      <div className="row">
        <div className="col field">
          <label className="lbl">Marca</label>
          <select className="inp" value={f.brand} onChange={e => {
            const b = e.target.value;
            let m = MODELS[b]?.[0] || '';
            if (b === 'Apple') m = MODELS['Apple']?.find(x => x.startsWith(appleCategory)) || MODELS['Apple']?.[0] || '';
            setF(p => ({ ...p, brand: b, model: m }));
          }}>
            {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        {f.brand === 'Apple' && (
          <div className="col field">
            <label className="lbl">Línea</label>
            <select className="inp" value={appleCategory} onChange={e => {
              const cat = e.target.value;
              setAppleCategory(cat);
              const m = MODELS['Apple']?.find(x => x.startsWith(cat)) || '';
              setF(p => ({ ...p, model: m }));
            }}>
              <option value="iPhone">iPhone</option>
              <option value="MacBook">MacBook</option>
              <option value="AirPods">AirPods</option>
            </select>
          </div>
        )}
        <div className="col field">
          <label className="lbl">Modelo</label>
          <ModelPicker
            value={f.model}
            onChange={v => setF(p => ({ ...p, model: v }))}
            options={f.brand === 'Apple'
              ? (MODELS['Apple'] || []).filter(m => m.startsWith(appleCategory))
              : (MODELS[f.brand] || [])}
          />
        </div>
      </div>
      <div className="row"><div className="col field"><label className="lbl">GB</label><select className="inp" value={f.storage} onChange={e => setF(p => ({ ...p, storage: e.target.value }))}>{STORAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
        <div className="col field">
          <label className="lbl">Color</label>
          <input className="inp" list="tradein-colors" placeholder="Ej: Azul" value={f.color} onChange={e => setF(p => ({ ...p, color: e.target.value }))} />
          <datalist id="tradein-colors">
            {(COLORS[f.brand] || ['Negro']).map(c => <option key={c} value={c} />)}
          </datalist>
        </div>
      </div>
      <div className="row">
        <div className="col field"><label className="lbl">IMEI / N° Serie</label><input className="inp" value={f.imei} onChange={e => setF(p => ({ ...p, imei: e.target.value }))} placeholder="15 dígitos o alfanumérico..." /></div>
        <div className="col field"><label className="lbl">% Batería</label><input className="inp" type="number" placeholder="Ej: 85" value={f.battery} onChange={e => setF(p => ({ ...p, battery: e.target.value }))} /></div>
      </div>
      <div className="field"><label className="lbl">Detalles / Observaciones</label><input className="inp" value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} placeholder="Ej: Pantalla con rayas..." /></div>
      {/* Valor de toma según la tabla de Ajustes: se propone, no se impone. */}
      {(() => {
        const sug = valorSugerido(valores as ValorToma[], { model: f.model, storage: f.storage, battery: f.battery });
        if (!sug) return null;
        const misma = sug.currency === currency;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10, marginBottom: 12, fontSize: 13 }}>
            <span>
              Según tu tabla: <strong>{sug.currency === 'USD' ? 'U$' : '$'} {Number(sug.value).toLocaleString('es-AR')}</strong>
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-3)' }}>
                {sug.model}{sug.storage ? ` ${sug.storage}` : ''} · {describirTramo(sug)}{!misma ? ` · está en ${sug.currency} y la venta en ${currency}` : ''}
              </span>
            </span>
            {misma && <button type="button" className="btn btn-outline btn-sm" onClick={() => setF(p => ({ ...p, value: String(sug.value) }))}>Usar</button>}
          </div>
        );
      })()}
      <div className="row">
        <div className="col field"><label className="lbl">Precio Venta Sugerido</label><input className="inp" type="number" value={f.salePrice} onChange={e => setF(p => ({ ...p, salePrice: e.target.value }))} placeholder="0" /></div>
        <div className="col field"><label className="lbl">Costo (Valor toma)</label><input className="inp" type="number" value={f.value} onChange={e => setF(p => ({ ...p, value: e.target.value }))} placeholder="0" /></div>
        <div className="col field"><label className="lbl">Moneda</label><input className="inp" value={f.valueCurrency} disabled /></div>
      </div>
      <button className="btn btn-dark btn-lg" style={{ width: '100%' }} onClick={() => onConfirm(f)}>Agregar a la venta</button>
    </>
  );
}
