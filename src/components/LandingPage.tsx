"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, ChevronDown, Check, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import styles from "./LandingPage.module.css";

/* ─── FAQ data ───────────────────────────────────── */
const FAQ = [
  {
    q: "¿Puedo probar Stackr antes de pagar?",
    a: "Sí. Tenés 48 horas de prueba completa y gratuita con acceso a todas las funciones. Sin tarjeta de crédito requerida.",
  },
  {
    q: "¿Qué pasa si necesito soporte?",
    a: "Soporte prioritario por WhatsApp incluido de por vida. Respondemos en menos de 24hs en días hábiles.",
  },
  {
    q: "¿Funciona en el celular?",
    a: "Sí. Stackr está optimizado para mobile. Vendé, controlá el stock y revisá las métricas desde cualquier celular, sin instalar nada.",
  },
  {
    q: "¿Puedo tener varios empleados con distintos permisos?",
    a: "Claro. Podés crear usuarios con roles de Vendedor o Propietario. Los vendedores solo ven lo que necesitan para operar.",
  },
  {
    q: "¿Funciona con varias sucursales?",
    a: "Sí. Creás múltiples depósitos, asignás vendedores a cada uno y transferís stock entre ellos. Todo en un panel.",
  },
  {
    q: "¿Las actualizaciones futuras cuestan extra?",
    a: "No. Tu pago único incluye todas las actualizaciones y funciones futuras para siempre. Sin sorpresas.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.faqItem}>
      <button className={styles.faqQ} onClick={() => setOpen(o => !o)}>
        <span>{q}</span>
        <ChevronDown
          size={18}
          style={{
            flexShrink: 0,
            color: "#888",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <p className={styles.faqA}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main component ─────────────────────────────── */
export default function LandingPage() {
  return (
    <div className={styles.root}>

      {/* ── NAVBAR ─────────────────────────────────── */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.navBrand}>
            <Image src="/logo.png" alt="Stackr" width={34} height={34} className={styles.navLogo} />
            <span className={styles.navName}>Stackr</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#features" className={styles.navLink}>Funciones</a>
            <a href="#pricing"  className={styles.navLink}>Precios</a>
            <a href="#faq"      className={styles.navLink}>FAQ</a>
          </div>
          <div className={styles.navActions}>
            <Link href="/login"      className={styles.navLinkBtn}>Entrar</Link>
            <Link href="/onboarding" className={styles.navCta}>Probar gratis →</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden />
        <div className={styles.heroInner}>
          <motion.div
            className={styles.heroBadge}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className={styles.heroBadgeDot} />
            Prueba gratuita de 48 horas — sin tarjeta de crédito
          </motion.div>

          <motion.h1
            className={styles.heroH1}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            El sistema de gestión para locales de celulares
            <span className={styles.heroAccent}> que se paga solo</span>
          </motion.h1>

          <motion.p
            className={styles.heroSub}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            Stock, ventas, reparaciones y caja — todo en un panel. Diseñado para tiendas de celulares en Argentina.{" "}
            <strong>Pago único de $400 USD, sin mensualidades jamás.</strong>
          </motion.p>

          <motion.div
            className={styles.heroCtaRow}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
          >
            <Link href="/onboarding" className={styles.heroPrimaryBtn}>
              Empezar prueba gratis
              <ArrowRight size={18} />
            </Link>
            <a href="#features" className={styles.heroSecondaryBtn}>Ver cómo funciona</a>
          </motion.div>

          <motion.div
            className={styles.heroTrust}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.36 }}
          >
            <span><Check size={13} strokeWidth={3} /> Sin tarjeta de crédito</span>
            <span className={styles.dot} />
            <span><Check size={13} strokeWidth={3} /> Listo en 5 minutos</span>
            <span className={styles.dot} />
            <span><Check size={13} strokeWidth={3} /> Soporte por WhatsApp</span>
          </motion.div>

          <div className={styles.heroCards}>
            {/* Card principal — stats */}
            <motion.div
              className={`${styles.heroCard} ${styles.heroCardMain}`}
              initial={{ opacity: 0, y: 48, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className={styles.heroCardChrome}>
                  <span className={styles.heroCardDot} style={{ background: '#ff5f57' }} />
                  <span className={styles.heroCardDot} style={{ background: '#febc2e' }} />
                  <span className={styles.heroCardDot} style={{ background: '#28c840' }} />
                  <span className={styles.heroCardUrl}>stackrarg.vercel.app/dashboard</span>
                </div>
                <img src="/hero-stats.png" alt="Dashboard Stackr" className={styles.heroCardImg} />
              </motion.div>
            </motion.div>

            {/* Card secundaria — stock */}
            <motion.div
              className={`${styles.heroCard} ${styles.heroCardStock}`}
              initial={{ opacity: 0, x: -32, y: 32 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.85, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                animate={{ y: [0, -7, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
              >
                <div className={styles.heroCardChrome}>
                  <span className={styles.heroCardDot} style={{ background: '#ff5f57' }} />
                  <span className={styles.heroCardDot} style={{ background: '#febc2e' }} />
                  <span className={styles.heroCardDot} style={{ background: '#28c840' }} />
                  <span className={styles.heroCardUrl}>Inventario Global</span>
                </div>
                <img src="/hero-stock.png" alt="Inventario Stackr" className={styles.heroCardImg} />
              </motion.div>
            </motion.div>

            {/* Card terciaria — chart */}
            <motion.div
              className={`${styles.heroCard} ${styles.heroCardChart}`}
              initial={{ opacity: 0, x: 32, y: 32 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.85, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2.5 }}
              >
                <div className={styles.heroCardChrome}>
                  <span className={styles.heroCardDot} style={{ background: '#ff5f57' }} />
                  <span className={styles.heroCardDot} style={{ background: '#febc2e' }} />
                  <span className={styles.heroCardDot} style={{ background: '#28c840' }} />
                  <span className={styles.heroCardUrl}>Tendencia del mes</span>
                </div>
                <img src="/hero-chart.png" alt="Tendencia Stackr" className={styles.heroCardImg} />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ────────────────────────────────── */}
      <div className={styles.marqueeSection}>
        <p className={styles.marqueeLabel}>Usado por locales de celulares en toda Argentina</p>
        <div className={styles.marqueeWrapper}>
          <div className={styles.marqueeTrack}>
            {["iFix","TecnoStore","CellularCenter","ApplePoint","MobiShop","GlobalCel","FixIt","PhoneMaster",
              "iFix","TecnoStore","CellularCenter","ApplePoint","MobiShop","GlobalCel","FixIt","PhoneMaster"].map((n, i) => (
              <span key={i} className={styles.marqueeItem}>{n}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── PROBLEMA ───────────────────────────────── */}
      <section className={styles.problem}>
        <div className={styles.sectionInner}>
          <motion.p className={styles.sectionLabel} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>El problema</motion.p>
          <motion.h2 className={styles.sectionH2} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>¿Te suena familiar?</motion.h2>
          <motion.p className={styles.sectionSub} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
            La mayoría de los locales de celulares usan herramientas que no fueron hechas para este rubro. El resultado: dinero que se escapa sin que te des cuenta.
          </motion.p>
          <div className={styles.problemGrid}>
            {[
              { icon: "📊", title: "No sabés cuánto ganás realmente",  desc: "Vendés, pero entre el costo, los gastos y el tipo de cambio, el margen real nunca está claro." },
              { icon: "📦", title: "El stock es un caos",               desc: "Repuestos que desaparecen, equipos duplicados, precios desactualizados. Todo por WhatsApp." },
              { icon: "🔧", title: "Las reparaciones se pierden",       desc: "Un cuaderno lleno de nombres y fallas. El cliente llama y no sabés dónde está el equipo." },
              { icon: "⏰", title: "El cierre te lleva horas",          desc: "Sumar caja, controlar vendedores, revisar movimientos. Un trabajo manual que podría ser automático." },
            ].map(({ icon, title, desc }, i) => (
              <motion.div key={title} className={styles.problemCard} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ delay: i * 0.08 }}>
                <span className={styles.problemIcon}>{icon}</span>
                <h3 className={styles.problemTitle}>{title}</h3>
                <p className={styles.problemDesc}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────── */}
      <section id="features" className={styles.features}>
        <div className={styles.sectionInner}>
          <motion.p className={styles.sectionLabel} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>Solución</motion.p>
          <motion.h2 className={styles.sectionH2} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>Todo lo que necesitás, nada de lo que no.</motion.h2>
          <motion.p className={styles.sectionSub} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
            Stackr reemplaza los cuadernos, las planillas y los mensajes de WhatsApp con un sistema que hace el trabajo por vos.
          </motion.p>

          <div className={styles.bentoGrid}>
            {/* Métricas */}
            <motion.div className={`${styles.bentoCard} ${styles.cardLarge}`} initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }}>
              <div className={styles.mockBox}>
                <div className={styles.mockBars}>
                  {[40, 65, 50, 85, 55, 100, 72].map((h, i) => (
                    <motion.div key={i} className={styles.mockBar} initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.07, ease: [0.16, 1, 0.3, 1] }} style={{ height: `${h}%`, transformOrigin: "bottom" }} />
                  ))}
                </div>
              </div>
              <h3 className={styles.cardH3}>Métricas en tiempo real</h3>
              <p className={styles.cardP}>Facturación, márgenes y tendencias calculados al instante. Sabé exactamente cuánto ganás, cuándo y con qué producto.</p>
            </motion.div>

            {/* POS */}
            <motion.div className={`${styles.bentoCard} ${styles.cardMedium}`} initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ delay: 0.1 }}>
              <div className={styles.mockBox}>
                <div className={styles.mockReceipt}>
                  <div>
                    <div className={styles.mockLine} style={{ width: 70, marginBottom: 8, background: "#d1d5db" }} />
                    <div className={styles.mockLine} style={{ width: 110 }} />
                  </div>
                  <span className={styles.mockPrice}>$1,200</span>
                </div>
              </div>
              <h3 className={styles.cardH3}>Punto de Venta</h3>
              <p className={styles.cardP}>Escanear el código, cargar el cliente y cerrar la venta en segundos. El stock se descuenta solo.</p>
            </motion.div>

            {/* Reparaciones */}
            <motion.div className={`${styles.bentoCard} ${styles.cardWide}`} initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ delay: 0.15 }}>
              <div style={{ flex: 1 }}>
                <h3 className={styles.cardH3}>Gestión de Reparaciones</h3>
                <p className={styles.cardP}>Ingresá el equipo, describí la falla, asigná técnico y presupuesto. Cuando esté listo, el sistema le manda un WhatsApp al cliente automáticamente.</p>
              </div>
              <div className={styles.mockBox} style={{ flex: 1, marginBottom: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div className={styles.mockAvatar}>WP</div>
                  <div>
                    <div className={styles.mockLine} style={{ width: 130, marginBottom: 6 }} />
                    <div className={styles.mockLine} style={{ width: 70, background: "#d1d5db" }} />
                  </div>
                </div>
                <div className={styles.mockWhatsapp}>¡Hola! Tu iPhone 13 Pro ya está reparado y listo para retirar. 🚀</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ──────────────────────────── */}
      <section className={styles.steps}>
        <div className={styles.sectionInner}>
          <motion.p className={styles.sectionLabel} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>Onboarding</motion.p>
          <motion.h2 className={styles.sectionH2} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>Tu local digitalizado en 5 minutos</motion.h2>
          <div className={styles.stepsRow}>
            {[
              { n: "01", title: "Creá tu cuenta",    desc: "Registrate en menos de un minuto. Configurá tu tienda y empleados con sus permisos." },
              { n: "02", title: "Cargá tu stock",    desc: "Escaneá códigos EAN o ingresá equipos manualmente. Generá e imprimí etiquetas." },
              { n: "03", title: "Empezá a vender",   desc: "Registrá ventas y reparaciones. Las métricas se calculan solas, en tiempo real." },
            ].map(({ n, title, desc }, i) => (
              <motion.div key={n} className={styles.stepCard} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <span className={styles.stepN}>{n}</span>
                <h3 className={styles.stepTitle}>{title}</h3>
                <p className={styles.stepDesc}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIOS ────────────────────────────── */}
      <section className={styles.testimonials}>
        <div className={styles.sectionInner}>
          <motion.p className={styles.sectionLabel} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>Testimonios</motion.p>
          <motion.h2 className={styles.sectionH2} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>Lo que dicen los que ya lo usan</motion.h2>
          <div className={styles.testiGrid}>
            {[
              { quote: "Antes perdíamos repuestos y no sabíamos cuánto ganábamos. Con Stackr, la caja siempre cuadra y mis empleados saben qué hacer.", result: "Cierre de caja en 10 min por primera vez", name: "Carlos M.", role: "Dueño, FixMobile Center", av: "CM", color: "#f59e0b" },
              { quote: "La notificación automática por WhatsApp cuando el celular está listo es un game-changer. Los clientes quedan impresionados.", result: "0 llamados perdidos de clientes", name: "Mariana V.", role: "Gerente, iStore Fix", av: "MV", color: "#10b981" },
              { quote: "Manejo mis 3 sucursales desde el celular. Veo en vivo las ventas y el stock de cada local sin tener que llamar a nadie.", result: "3 sucursales controladas en tiempo real", name: "Julián R.", role: "CEO, Cellular Point", av: "JR", color: "#6366f1" },
            ].map(({ quote, result, name, role, av, color }, i) => (
              <motion.div key={name} className={styles.testiCard} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className={styles.testiStars}>★★★★★</div>
                <p className={styles.testiQuote}>"{quote}"</p>
                <div className={styles.testiResult}>
                  <Check size={13} strokeWidth={3} color="#10b981" />
                  <span>{result}</span>
                </div>
                <div className={styles.testiAuthor}>
                  <div className={styles.testiAv} style={{ background: color }}>{av}</div>
                  <div><strong>{name}</strong><span>{role}</span></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRECIOS ────────────────────────────────── */}
      <section id="pricing" className={styles.pricing}>
        <div className={styles.sectionInner}>
          <motion.p className={styles.sectionLabel} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>Precios</motion.p>
          <motion.h2 className={styles.sectionH2} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>La cuenta que la mayoría no hace</motion.h2>
          <motion.p className={styles.sectionSub} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
            Los sistemas con mensualidades parecen baratos hasta que los sumás. Stackr cuesta lo mismo en año 1 que en año 5.
          </motion.p>

          <div className={styles.compareWrap}>
            <div className={styles.compareHead}>
              <div />
              <div className={styles.compareColLabel}>Competidor típico</div>
              <div className={`${styles.compareColLabel} ${styles.compareColStackr}`}><span>✦</span> Stackr</div>
            </div>
            {[
              { label: "Costo inicial",   comp: "$0",                       stackr: "$400 USD",            bold: false },
              { label: "Costo año 1",     comp: "$600 USD (≈ $50/mes)",     stackr: "$0",                  bold: false },
              { label: "Costo año 2",     comp: "$600 USD más",             stackr: "$0",                  bold: false },
              { label: "Costo año 3",     comp: "$600 USD más",             stackr: "$0",                  bold: false },
              { label: "Total 3 años",    comp: "$1,800 USD",               stackr: "$400 USD",            bold: true  },
              { label: "Actualizaciones", comp: "Según plan",               stackr: "Gratis para siempre", bold: false },
              { label: "Soporte",         comp: "Plan premium = más costo", stackr: "Incluido siempre",    bold: false },
            ].map(({ label, comp, stackr, bold }, i) => (
              <motion.div key={label} className={`${styles.compareRow} ${bold ? styles.compareRowTotal : ""}`} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                <div className={styles.compareLabel}>{label}</div>
                <div className={styles.compareComp}>{bold && <X size={14} color="#ef4444" style={{ marginRight: 6, flexShrink: 0 }} />}{comp}</div>
                <div className={styles.compareStackr}>{bold && <Check size={14} strokeWidth={3} color="#10b981" style={{ marginRight: 6, flexShrink: 0 }} />}{stackr}</div>
              </motion.div>
            ))}
          </div>

          <motion.div className={styles.pricingCard} initial={{ opacity: 0, y: 32, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true }} transition={{ type: "spring", bounce: 0.2 }}>
            <div className={styles.pricingLeft}>
              <div className={styles.pricingBadge}>Licencia de por vida</div>
              <div className={styles.pricingPrice}>$400 <span>USD</span></div>
              <p className={styles.pricingNote}>Un solo pago · Sin mensualidades · Para siempre</p>
              <Link href="/onboarding" className={styles.pricingCta}>Obtener Stackr ahora <ArrowRight size={18} /></Link>
              <p className={styles.pricingTrialNote}>Empezá con 48hs gratis — sin tarjeta de crédito</p>
            </div>
            <div className={styles.pricingFeatures}>
              {["Sucursales ilimitadas","Usuarios ilimitados","Stock, Ventas, Reparaciones y Caja","Reportes de rentabilidad","Gestión en ARS y USD","Notificaciones por WhatsApp","Actualizaciones de por vida","Soporte prioritario incluido"].map(f => (
                <div key={f} className={styles.pricingFeatureItem}><CheckCircle2 size={17} color="#10b981" strokeWidth={2.5} /><span>{f}</span></div>
              ))}
            </div>
          </motion.div>

          <motion.div className={styles.manifesto} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
            <h3 className={styles.manifestoTitle}>¿Por qué no cobramos mensualidades?</h3>
            <p className={styles.manifestoText}>
              Stackr está construido con tecnología eficiente y costos de infraestructura bajos. Tu pago único cubre los servidores a largo plazo y nos deja un margen justo.{" "}
              <mark>Nuestro negocio crece sumando nuevos clientes felices</mark>, no exprimiendo a los que ya confiaron en nosotros.
            </p>
            <div className={styles.manifestoAuthor}>
              <div className={styles.manifestoAv}>JP</div>
              <div><strong>Juan Pedro Nielsen</strong><span>Fundador de Stackr</span></div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────── */}
      <section id="faq" className={styles.faqSection}>
        <div className={styles.sectionInner}>
          <motion.p className={styles.sectionLabel} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>FAQ</motion.p>
          <motion.h2 className={styles.sectionH2} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>Preguntas frecuentes</motion.h2>
          <div className={styles.faqList}>
            {FAQ.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                <FaqItem q={item.q} a={item.a} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────── */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaInner}>
          <motion.h2 className={styles.finalCtaH2} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>Empezá hoy, sin riesgos</motion.h2>
          <motion.p className={styles.finalCtaSub} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.08 }}>
            48 horas de prueba completa. Si no te convence, no pagás nada.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.16 }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <Link href="/onboarding" className={styles.finalCtaBtn}>Comenzar prueba gratis de 48hs <ArrowRight size={20} /></Link>
            <div className={styles.finalCtaTrust}>
              <span><Check size={13} strokeWidth={3} /> $400 USD una sola vez</span>
              <span className={styles.dot} />
              <span><Check size={13} strokeWidth={3} /> Sin mensualidades jamás</span>
              <span className={styles.dot} />
              <span><Check size={13} strokeWidth={3} /> Soporte incluido siempre</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.footerLogo}>Stackr</span>
            <p className={styles.footerTagline}>El software de gestión para locales de celulares que se paga solo.</p>
          </div>
          <div className={styles.footerCols}>
            <div className={styles.footerCol}>
              <p className={styles.footerColHead}>Producto</p>
              <a href="#features">Funciones</a>
              <a href="#pricing">Precios</a>
              <Link href="/onboarding">Probar gratis</Link>
            </div>
            <div className={styles.footerCol}>
              <p className={styles.footerColHead}>Soporte</p>
              <a href="#faq">FAQ</a>
              <a href="mailto:hola@stackrarg.com">Contacto</a>
              <Link href="/login">Iniciar sesión</Link>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} Stackr · Todos los derechos reservados</span>
          <span>Hecho en Argentina 🇦🇷</span>
        </div>
      </footer>

    </div>
  );
}
