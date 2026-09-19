"use client"
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useInView, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { ArrowRight, Plus, Check, MessageCircle } from 'lucide-react'
import s from './landing.module.css'
import { PRECIO_MENSUAL, PRECIO_LIFETIME, money, mesesDeAhorro, linkWhatsApp } from './precios'

/* ── Animación de entrada ────────────────────────────────────────────────
   En CSS y no con JavaScript. Con la animación por JS el contenido arranca
   en opacidad 0 y la sube el script: el DOM queda correcto pero el
   compositor no siempre repinta, y las secciones quedaban en negro. El
   observador sólo agrega una clase; la animación la corre el navegador. */
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { rootMargin: '-60px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`${s.revelar} ${visible ? s.revelarVisible : ''}`}
      style={visible && delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  )
}

/** Un número que cuenta hacia arriba cuando entra en pantalla. */
function NumeroQueSube({ hasta, prefijo = '', sufijo = '' }: { hasta: number; prefijo?: string; sufijo?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const visible = useInView(ref, { once: true, margin: '-100px' })
  /* Con "reducir movimiento" activado el número se muestra entero desde el
     principio: el dato importa más que la animación. */
  const reducido = useReducedMotion()
  const [n, setN] = useState(0)

  useEffect(() => {
    if (!visible || reducido) return
    const duracion = 1400
    const arranque = performance.now()
    let raf = 0
    const tick = (ahora: number) => {
      const t = Math.min(1, (ahora - arranque) / duracion)
      // Misma curva que las entradas, para que todo frene igual.
      setN(Math.round(hasta * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [visible, reducido, hasta])

  const valor = reducido ? hasta : n
  return <span ref={ref}>{prefijo}{valor.toLocaleString('es-AR')}{sufijo}</span>
}

const MODULOS = [
  {
    n: '01',
    t: 'Cada equipo, con nombre y apellido',
    d: 'IMEI, costo, precio y condición. Cuando se vende sale del stock solo. Si tenés varios locales, cada uno tiene el suyo y transferís entre ellos sin planillas.',
    visual: (
      <>
        <div className={s.filaCab} style={{ marginBottom: 12 }}>Inventario · Sucursal Centro</div>
        {[
          ['iPhone 15 Pro 256GB', 'U$ 980', 'Disponible'],
          ['iPhone 14 128GB', 'U$ 610', 'Disponible'],
          ['iPhone 13 128GB', 'U$ 475', 'En reparación'],
        ].map(([m, p, e], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderTop: i ? '1px solid rgba(233,229,219,0.07)' : 'none' }}>
            <span>{m}</span>
            <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className={s.mono}>{p}</span>
              <span className={`${s.pill} ${e === 'Disponible' ? s.pillVerde : s.pillOro}`}>{e}</span>
            </span>
          </div>
        ))}
      </>
    ),
  },
  {
    n: '02',
    t: 'La ganancia real, no la que parece',
    d: 'El costo del equipo, el recargo que se llevó la tarjeta, los repuestos que le pusiste antes de venderlo. Todo descontado. El número que ves es el que te queda.',
    visual: (
      <>
        {[
          ['Precio de venta', 'U$ 620', ''],
          ['Costo del equipo', '− U$ 400', ''],
          ['Reparación previa', '− U$ 75', 'rojo'],
          ['Ganancia real', 'U$ 145', 'verde'],
        ].map(([l, v, tono], i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', padding: '9px 0',
            borderTop: i === 3 ? '1px solid rgba(233,229,219,0.16)' : i ? '1px solid rgba(233,229,219,0.07)' : 'none',
            fontWeight: i === 3 ? 700 : 400,
            color: tono === 'verde' ? '#6ee7a8' : tono === 'rojo' ? '#ff6b5a' : undefined,
          }}>
            <span>{l}</span><span className={s.mono}>{v}</span>
          </div>
        ))}
      </>
    ),
  },
  {
    n: '03',
    t: 'El que te debe, con fecha',
    d: 'Ventas en cuotas con vencimientos, cobros que entran a la caja el día que cobrás, y una lista de quién está atrasado. No "creo que Martín me debe algo".',
    visual: (
      <>
        <div className={s.filaCab} style={{ marginBottom: 12 }}>Martín G. · debe U$ 570</div>
        {[
          ['Cuota 1/3 · 18/10', 'U$ 190', 'Pagada', s.pillVerde],
          ['Cuota 2/3 · 18/11', 'U$ 190', 'Vence en 4 días', s.pillOro],
          ['Cuota 3/3 · 18/12', 'U$ 190', 'Pendiente', ''],
        ].map(([l, v, e, cls], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderTop: i ? '1px solid rgba(233,229,219,0.07)' : 'none' }}>
            <span>{l}</span>
            <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className={s.mono}>{v}</span>
              {cls ? <span className={`${s.pill} ${cls}`}>{e}</span> : <span style={{ fontSize: 11, opacity: .45 }}>{e}</span>}
            </span>
          </div>
        ))}
      </>
    ),
  },
  {
    n: '04',
    t: 'La caja cierra o te dice por qué',
    d: 'Arqueo por turno y por vendedor. Cada peso que entra tiene un motivo y una fecha: una venta, un cobro, un gasto, una transferencia entre locales.',
    visual: (
      <>
        <div className={s.filaCab} style={{ marginBottom: 12 }}>Cierre de turno · Zuviría</div>
        {[
          ['Efectivo ARS', '$ 1.240.000'],
          ['Transferencias', '$ 880.000'],
          ['Dólares', 'U$ 1.150'],
          ['Diferencia', '$ 0'],
        ].map(([l, v], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderTop: i ? '1px solid rgba(233,229,219,0.07)' : 'none', fontWeight: i === 3 ? 700 : 400, color: i === 3 ? '#6ee7a8' : undefined }}>
            <span>{l}</span><span className={s.mono}>{v}</span>
          </div>
        ))}
      </>
    ),
  },
]

const PREGUNTAS = [
  {
    q: '¿Y si dejo de pagar, pierdo todo?',
    a: 'No. Tus datos son tuyos y no se borran nunca. Si una suscripción se vence tenés diez días de gracia trabajando normal, y después la cuenta queda en sólo lectura: seguís viendo y descargando todo tu inventario, ventas, clientes y caja. Cuando renovás, volvés a cargar donde quedaste.',
  },
  {
    q: '¿Puedo llevarme mi información cuando quiera?',
    a: 'Sí, y sin pedir permiso. Desde Ajustes bajás un respaldo completo del negocio en un archivo que abrís con Excel: inventario, ventas, cuenta corriente, mayoristas, reparaciones, turnos, caja y gastos. No es un formato propietario.',
  },
  {
    q: '¿Qué diferencia hay entre el mensual y la licencia?',
    a: `El sistema es exactamente el mismo, con todo incluido en los dos. La diferencia es cómo lo pagás: ${money(PRECIO_MENSUAL)} por mes sin permanencia, o ${money(PRECIO_LIFETIME)} una sola vez y no pagás nunca más. La licencia se paga sola en ${mesesDeAhorro} meses.`,
  },
  {
    q: '¿Sirve si tengo más de un local?',
    a: 'Sí, y sin costo extra por sucursal. Un depósito por local, vendedores asignados a cada uno, transferencias de stock entre ellos y gastos separados. Todo se ve desde el mismo panel.',
  },
  {
    q: '¿Cuánto tardo en tenerlo andando?',
    a: 'Una tarde. Cargás el inventario escaneando el código de barras o escribiendo marca, modelo y precio, y ya podés vender. No hay implementación ni consultor: entrás y usás.',
  },
  {
    q: '¿Quién me ayuda si algo falla?',
    a: 'Yo, por WhatsApp, el mismo día. No hay mesa de ayuda ni tickets. Si algo rompe tu operación, lo arreglo ese día.',
  },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [plan, setPlan] = useState<'mensual' | 'lifetime'>('mensual')
  const [abierta, setAbierta] = useState<number | null>(0)

  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  /* La ventana de producto se endereza y se aleja al bajar: da profundidad
     sin que nada se mueva de más. */
  const rotarX = useTransform(scrollYProgress, [0, 1], [14, 0])
  const escala = useTransform(scrollYProgress, [0, 1], [1, 0.94])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const esMensual = plan === 'mensual'

  return (
    <div className={s.root}>
      <div className={s.atmosfera} aria-hidden>
        <div className={s.glowOro} />
        <div className={s.glowFrio} />
      </div>

      <div className={s.navWrap}>
        <nav className={`${s.nav} ${s.entra} ${scrolled ? s.navScrolled : ''}`}>
          <a href="#top" className={s.navMarca}>
            {/* Tres barras apiladas, de más ancha a más angosta. */}
            <svg className={s.navGlifo} width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden>
              <rect y="1.5" width="17" height="3" rx="1.5" fill="currentColor" />
              <rect y="7" width="12" height="3" rx="1.5" fill="currentColor" opacity=".7" />
              <rect y="12.5" width="7" height="3" rx="1.5" fill="currentColor" opacity=".45" />
            </svg>
            Stackr
          </a>
          <div className={s.navLinks}>
            <a href="#sistema" className={s.navLink}>El sistema</a>
            <a href="#precio" className={s.navLink}>Precio</a>
            <a href="#preguntas" className={s.navLink}>Preguntas</a>
          </div>
          <Link href="/login" className={s.navEntrar}>Entrar</Link>
          <Link href="/login" className={s.navCta}>
            Probar gratis <ArrowRight size={15} />
          </Link>
        </nav>
      </div>

      <div className={s.capa}>
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <header className={s.hero} id="top" ref={heroRef}>
          <div className={s.ancho}>
            <div className={`${s.chip} ${s.entra} ${s.d1}`}>
              <span className={s.chipPunto} /> 48 horas de prueba · sin tarjeta
            </div>

            <h1 className={`${s.h1} ${s.entra} ${s.d2}`}>
              Sabé exactamente<br />cuánto ganás<br /><em>con cada equipo.</em>
            </h1>

            <p className={`${s.heroTexto} ${s.entra} ${s.d3}`}>
              Stock, ventas, reparaciones, cuenta corriente y caja. El sistema para locales
              de celulares que te dice el número real, no el que parece.
            </p>

            <div className={`${s.heroCtas} ${s.entra} ${s.d4}`}>
              <Link href="/login" className={s.btnPrimario}>
                Empezar la prueba <ArrowRight size={17} />
              </Link>
              <a href="#sistema" className={s.btnSecundario}>Ver cómo funciona</a>
            </div>

            <div className={`${s.heroNota} ${s.entra} ${s.d5}`}>
              {money(PRECIO_MENSUAL)} por mes, sin permanencia · o una licencia para siempre
            </div>

            <div className={`${s.ventanaWrap} ${s.entra} ${s.d5}`}>
              <motion.div className={s.ventana} style={{ rotateX: rotarX, scale: escala }}>
                <div className={s.ventanaBarra}>
                  <span className={s.punto} /><span className={s.punto} /><span className={s.punto} />
                  <span className={s.ventanaTitulo}>stackr · panel</span>
                </div>
                <div className={s.ventanaCuerpo}>
                  <div className={s.kpis}>
                    <div className={s.kpi}>
                      <div className={s.kpiLabel}>Facturado este mes</div>
                      <div className={`${s.kpiValor}`}>U$ <NumeroQueSube hasta={48250} /></div>
                    </div>
                    <div className={s.kpi}>
                      <div className={s.kpiLabel}>Ganancia real</div>
                      <div className={`${s.kpiValor} ${s.kpiOro}`}>U$ <NumeroQueSube hasta={9870} /></div>
                    </div>
                    <div className={s.kpi}>
                      <div className={s.kpiLabel}>Equipos vendidos</div>
                      <div className={`${s.kpiValor} ${s.kpiVerde}`}><NumeroQueSube hasta={63} /></div>
                    </div>
                  </div>

                  <div className={s.filas}>
                    <div className={`${s.fila} ${s.filaCab}`}>
                      <span>Equipo</span>
                      <span className={s.filaOcultaMobile}>Costo</span>
                      <span>Venta</span>
                      <span className={s.filaOcultaMobile}>Deja</span>
                    </div>
                    {[
                      ['iPhone 15 Pro Max 512', 'U$ 1.180', 'U$ 1.430', 'U$ 250'],
                      ['iPhone 14 Pro 256', 'U$ 720', 'U$ 910', 'U$ 190'],
                      ['iPhone 13 128', 'U$ 475', 'U$ 620', 'U$ 145'],
                    ].map((f, i) => (
                      <div className={s.fila} key={i}>
                        <span>{f[0]}</span>
                        <span className={`${s.mono} ${s.filaOcultaMobile}`} style={{ opacity: .55 }}>{f[1]}</span>
                        <span className={s.mono}>{f[2]}</span>
                        <span className={`${s.mono} ${s.filaOcultaMobile}`} style={{ color: '#6ee7a8' }}>{f[3]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </header>

        {/* ── Marquesina ───────────────────────────────────────────── */}
        <div className={s.marquesina}>
          <div className={s.marquesinaPista}>
            {[0, 1].map(vuelta => (
              <div key={vuelta} style={{ display: 'flex', gap: 54 }} aria-hidden={vuelta === 1}>
                {[
                  ['Inventario con IMEI', 'cada aparato, uno'],
                  ['Cuenta corriente', 'quién debe y desde cuándo'],
                  ['Reparaciones', 'propias y de clientes'],
                  ['Mayoristas', 'pedidos y saldos'],
                  ['Caja por turno', 'cierra o te dice por qué'],
                  ['Multi sucursal', 'sin costo extra'],
                ].map(([a, b], i) => (
                  <span className={s.marquesinaItem} key={i}>
                    <b>{a}</b>{b}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── El sistema ───────────────────────────────────────────── */}
        <section className={s.seccion} id="sistema">
          <div className={s.ancho}>
            <Reveal>
              <div className={s.seccionCabecera}>
                <span className={s.etiqueta}>El sistema</span>
                <h2 className={s.h2}>
                  Cuatro cosas que ningún cuaderno<br /><em>te va a poder decir.</em>
                </h2>
              </div>
            </Reveal>

            {MODULOS.map((m, i) => (
              <Reveal key={m.n} delay={i * 0.05}>
                <div className={s.editorial}>
                  <div className={s.editorialNumero}>{m.n}</div>
                  <div>
                    <h3 className={s.editorialTitulo}>{m.t}</h3>
                    <p className={s.editorialTexto}>{m.d}</p>
                  </div>
                  <div className={s.editorialVisual}>{m.visual}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── El número grande ─────────────────────────────────────── */}
        <section className={s.foco}>
          <div className={s.ancho}>
            <Reveal>
              <div className={s.focoNumero}>
                U$ <NumeroQueSube hasta={145} />
              </div>
              <p className={s.focoTexto}>
                Lo que te deja de verdad un equipo que compraste en 400, arreglaste por 75
                y vendiste a 620. La mayoría de los sistemas te diría 220.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── Precio ───────────────────────────────────────────────── */}
        <section className={s.seccion} id="precio">
          <div className={s.ancho}>
            <Reveal>
              <div className={s.seccionCabecera}>
                <span className={s.etiqueta}>Precio</span>
                <h2 className={s.h2}>Un solo sistema.<br /><em>Vos elegís cómo pagarlo.</em></h2>
                <p className={s.parrafo}>
                  Todo incluido en los dos: sucursales, usuarios, módulos y actualizaciones.
                  No hay plan chico al que le falten cosas.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className={s.precioPanel}>
                <div className={s.toggle}>
                  <motion.span
                    className={s.togglePildora}
                    initial={false}
                    animate={{ left: esMensual ? 4 : '50%', right: esMensual ? '50%' : 4 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  />
                  <button
                    className={`${s.toggleBtn} ${esMensual ? s.toggleBtnOn : ''}`}
                    onClick={() => setPlan('mensual')}
                  >Mensual</button>
                  <button
                    className={`${s.toggleBtn} ${!esMensual ? s.toggleBtnOn : ''}`}
                    onClick={() => setPlan('lifetime')}
                  >De por vida</button>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={plan}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className={s.precioFila}>
                      <span className={s.precioNumero}>
                        {money(esMensual ? PRECIO_MENSUAL : PRECIO_LIFETIME)}
                      </span>
                      <span className={s.precioUnidad}>{esMensual ? 'por mes' : 'un solo pago'}</span>
                    </div>
                    <p className={s.precioNota}>
                      {esMensual
                        ? <>Sin permanencia y sin contrato. Te das de baja cuando querés y <b>te llevás todos tus datos</b>.</>
                        : <>Pagás una vez y no pagás nunca más. Se paga sola en <b>{mesesDeAhorro} meses</b> y las actualizaciones futuras van incluidas.</>}
                    </p>
                  </motion.div>
                </AnimatePresence>

                <div className={s.incluye}>
                  {[
                    'Sucursales ilimitadas',
                    'Usuarios ilimitados',
                    'Inventario con IMEI y código de barras',
                    'Ventas, cuotas y cuenta corriente',
                    'Reparaciones propias y de clientes',
                    'Mayoristas con saldos',
                    'Caja y arqueo por turno',
                    'Rentabilidad por equipo y vendedor',
                    'Respaldo completo descargable',
                    'Soporte directo por WhatsApp',
                  ].map(t => (
                    <div className={s.incluyeItem} key={t}>
                      <Check size={16} className={s.tilde} /> {t}
                    </div>
                  ))}
                </div>

                <div className={s.heroCtas} style={{ justifyContent: 'flex-start', marginBottom: 0 }}>
                  <Link href="/login" className={s.btnPrimario}>
                    Probar 48 horas gratis <ArrowRight size={17} />
                  </Link>
                  <a
                    className={s.btnSecundario}
                    href={linkWhatsApp(plan)}
                    target="_blank" rel="noopener noreferrer"
                  >
                    <MessageCircle size={16} /> Hablar antes de decidir
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Preguntas ────────────────────────────────────────────── */}
        <section className={s.seccion} id="preguntas">
          <div className={s.ancho}>
            <Reveal>
              <div className={s.seccionCabecera}>
                <span className={s.etiqueta}>Preguntas</span>
                <h2 className={s.h2}>Lo que todos preguntan<br /><em>antes de entrar.</em></h2>
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <div>
                {PREGUNTAS.map((p, i) => (
                  <div className={s.pregunta} key={i}>
                    <button
                      className={s.preguntaBtn}
                      onClick={() => setAbierta(abierta === i ? null : i)}
                      aria-expanded={abierta === i}
                    >
                      {p.q}
                      <Plus size={19} className={`${s.preguntaMas} ${abierta === i ? s.preguntaMasAbierto : ''}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {abierta === i && (
                        <motion.div
                          className={s.preguntaCuerpo}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <p className={s.preguntaTexto}>{p.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Cierre ───────────────────────────────────────────────── */}
        <section className={s.cierre}>
          <div className={s.ancho}>
            <Reveal>
              <h2 className={s.h2} style={{ maxWidth: 740, margin: '0 auto 26px' }}>
                Entrá hoy y esta noche<br /><em>cerrás la caja con el número real.</em>
              </h2>
              <div className={s.heroCtas}>
                <Link href="/login" className={s.btnPrimario}>
                  Empezar la prueba <ArrowRight size={17} />
                </Link>
              </div>
              <div className={s.heroNota} style={{ marginTop: 16 }}>
                48 horas, sin tarjeta. Después decidís.
              </div>
            </Reveal>
          </div>
        </section>

        <footer className={s.ancho}>
          <div className={s.pie}>
            <span>Stackr · Hecho en Argentina 🇦🇷</span>
            <span style={{ display: 'flex', gap: 18 }}>
              <a href="#precio">Precio</a>
              <a href="#preguntas">Preguntas</a>
              <Link href="/login">Entrar</Link>
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}
