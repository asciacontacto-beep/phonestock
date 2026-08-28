"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
  ArrowRight, Check, ChevronDown, MessageCircle,
  TrendingUp, Package, Wrench, Clock,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import Image from "next/image";
import styles from "./LandingPage.module.css";

const WA_LINK =
  "https://wa.me/5492262559559?text=Hola%2C%20quiero%20contratar%20Stackr%20%F0%9F%93%B1%20%C2%BFC%C3%B3mo%20procedo%3F";

/* ─── Datos ──────────────────────────────────────── */

const LOCALES = ["La tiendita", "GoldenApple Tandil", "Hola Apple Tandil"];

const PROBLEMAS = [
  {
    icon: <TrendingUp size={19} />, tono: "icGreen",
    t: "No sabés cuánto ganás",
    d: "Vendés todos los días, pero entre el costo, los gastos y el dólar que cambió desde que compraste, el margen real nunca aparece en ningún lado.",
  },
  {
    icon: <Package size={19} />, tono: "icBlue",
    t: "El stock es un caos",
    d: "Repuestos que no se encuentran, equipos cargados dos veces, precios de la semana pasada. Y la única copia de la verdad es un mensaje de WhatsApp.",
  },
  {
    icon: <Wrench size={19} />, tono: "icViolet",
    t: "Las reparaciones se pierden",
    d: "Un cuaderno con nombres y fallas. El cliente llama para preguntar por su equipo y nadie sabe dónde está ni qué se le hizo.",
  },
  {
    icon: <Clock size={19} />, tono: "icAmber",
    t: "El cierre se come la noche",
    d: "Sumar la caja, controlar lo que vendió cada uno, revisar los movimientos. Todos los días, a mano, cuando ya cerraste el local.",
  },
];

type Funcion = {
  eyebrow: string; t: string; d: string; puntos: string[];
  img: string | null; alt: string; recorte?: boolean;
};

const FUNCIONES: Funcion[] = [
  {
    eyebrow: "Rentabilidad",
    t: "El número real, no el aproximado",
    d: "Cada venta guarda el dólar del día en que se hizo, no el de hoy. Los repuestos se descuentan de la reparación que los usó. Lo que ves como ganancia es la ganancia.",
    puntos: ["Margen por equipo, accesorio y servicio", "Histórico en pesos y dólares", "Cierre de caja automático"],
    img: "/hero-stats.png",
    alt: "Indicadores de ganancia y margen en Stackr",
    recorte: true,
  },
  {
    eyebrow: "Inventario",
    t: "Un stock que no se discute",
    d: "Cada equipo tiene IMEI, costo, precio y condición. Cuando se vende, sale del stock solo. Si tenés más de un local, cada uno tiene el suyo y podés transferir entre ellos.",
    puntos: ["Alta por escaneo de código de barras", "Depósitos y sucursales separados", "Transferencias con registro"],
    img: "/hero-stock.png",
    alt: "Inventario por depósito en Stackr",
  },
  {
    eyebrow: "Servicio técnico",
    t: "El taller, ordenado",
    d: "Ingresás el equipo con la falla, el presupuesto y el técnico. Cargás los repuestos que se usaron y el costo entra solo en la cuenta. Cuando está listo, el cliente recibe un WhatsApp.",
    puntos: ["Orden de servicio imprimible", "Repuestos con stock propio", "Aviso automático al cliente"],
    img: null,
    alt: "",
  },
];

const PASOS = [
  { n: "1", tiempo: "30 segundos", t: "Registrás el negocio", d: "Nombre del local, email y contraseña. Sin tarjeta de crédito." },
  { n: "2", tiempo: "1 minuto", t: "Creás el depósito", d: "El depósito es tu local. Todo el stock vive adentro de uno." },
  { n: "3", tiempo: "2 a 5 minutos", t: "Cargás el inventario", d: "Escaneás el código o escribís marca, modelo y precio." },
  { n: "4", tiempo: "30 segundos", t: "Hacés la primera venta", d: "El comprobante con la garantía se genera solo, listo para imprimir." },
];

const COMPARA = [
  { c: "Costo al empezar", a: "$0", b: "$260" },
  { c: "Año 1", a: "$600", b: "—" },
  { c: "Año 2", a: "$600", b: "—" },
  { c: "Año 3", a: "$600", b: "—" },
  { c: "Actualizaciones", a: "Según plan", b: "Incluidas" },
  { c: "Soporte", a: "Plan premium", b: "Incluido" },
];

const INCLUYE = [
  "Sucursales ilimitadas", "Usuarios ilimitados",
  "Stock, ventas y caja", "Servicio técnico",
  "Reportes de rentabilidad", "Pesos y dólares",
  "Avisos por WhatsApp", "Soporte prioritario",
];

const FAQ = [
  { q: "¿Puedo probarlo antes de pagar?", a: "Sí. Tenés 48 horas con todas las funciones abiertas y sin tarjeta de crédito. Si necesitás más tiempo para terminar de cargar el inventario, escribinos y te lo extendemos." },
  { q: "¿Qué pasa si necesito ayuda?", a: "Soporte por WhatsApp incluido de por vida, sin plan premium ni sistema de tickets. Respondemos en menos de 24 horas hábiles." },
  { q: "¿Funciona desde el celular?", a: "Sí, y está hecho para eso. Vendés, cargás stock y mirás las métricas desde el teléfono, sin instalar nada." },
  { q: "¿Puedo darle acceso a mis empleados?", a: "Sí. Creás usuarios con rol de Vendedor o Propietario. El vendedor ve lo que necesita para trabajar y no ve los costos ni la rentabilidad." },
  { q: "¿Sirve para varias sucursales?", a: "Sí. Un depósito por local, vendedores asignados a cada uno y transferencias de stock entre ellos. Todo se ve desde el mismo panel." },
  { q: "¿Las actualizaciones se cobran aparte?", a: "No. El pago único incluye todo lo que venga después, para siempre." },
];

/* ─── Aparición al hacer scroll ──────────────────── */
/* El contenido se sirve visible. Sólo cuando hay JS se marca la raíz y
   recién ahí el CSS lo esconde para poder revelarlo: sin JavaScript la
   página se ve completa igual. */

function useReveal() {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    el.classList.add(styles.jsOn);
    const objetivos = el.querySelectorAll(`.${styles.reveal}`);
    const obs = new IntersectionObserver(
      entradas => entradas.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add(styles.revealIn);
          obs.unobserve(e.target);
        }
      }),
      { rootMargin: "0px 0px -8% 0px" },
    );
    objetivos.forEach(t => obs.observe(t));
    return () => obs.disconnect();
  }, []);

  return root;
}

/* ─── Preguntas ──────────────────────────────────── */

function Pregunta({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`${styles.faqItem} ${open ? styles.faqOpen : ""}`}>
      <button className={styles.faqQ} onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>{q}</span>
        <ChevronDown size={18} className={styles.faqChevron} />
      </button>
      <div hidden={!open}><p className={styles.faqA}>{a}</p></div>
    </div>
  );
}

/* ─── Página ─────────────────────────────────────── */

export default function LandingPage() {
  const root = useReveal();

  // Registra una visita al link público (una vez por sesión). Si la tabla no
  // está creada todavía, falla en silencio y no afecta al visitante.
  useEffect(() => {
    try {
      if (typeof window === "undefined" || sessionStorage.getItem("sv_tracked")) return;
      sessionStorage.setItem("sv_tracked", "1");
      createClient()
        .from("site_visits")
        .insert({ path: window.location.pathname, referrer: document.referrer || null })
        .then(() => {}, () => {});
    } catch { /* noop */ }
  }, []);

  return (
    <div className={styles.root} ref={root}>

      {/* ── BARRA ──────────────────────────────────── */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navBrand}>
            <Image src="/logo.png" alt="" width={30} height={30} className={styles.navLogo} />
            <span className={styles.navName}>Stackr</span>
          </Link>
          <div className={styles.navLinks}>
            <a href="#funciones" className={styles.navLink}>Funciones</a>
            <a href="#precio" className={styles.navLink}>Precio</a>
            <a href="#faq" className={styles.navLink}>Preguntas</a>
          </div>
          <div className={styles.navActions}>
            <Link href="/login" className={styles.navEnter}>Entrar</Link>
            <Link href="/onboarding" className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}>
              Probar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── PORTADA ────────────────────────────────── */}
      <header className={styles.hero}>
        <div className={styles.heroBg} aria-hidden />
        <div className={styles.heroInner}>
          <span className={styles.badge}>
            <span className={styles.badgeDot} />
            Prueba de 48 horas — sin tarjeta de crédito
          </span>

          <h1 className={styles.h1}>
            El sistema para tu local de celulares<em> que se paga solo</em>
          </h1>

          <p className={styles.heroSub}>
            Stock, ventas, reparaciones y caja en un solo panel. Hecho para locales
            de celulares en Argentina — y por primera vez, el número real de lo que ganás.
          </p>

          <div className={styles.heroCtas}>
            <Link href="/onboarding" className={`${styles.btn} ${styles.btnPrimary}`}>
              Empezar prueba gratis <ArrowRight size={17} />
            </Link>
            <a href="#funciones" className={`${styles.btn} ${styles.btnGhost}`}>
              Ver cómo funciona
            </a>
          </div>

          <p className={styles.heroPrice}>
            <s>$400</s> <strong>$260 USD</strong> · un solo pago, sin mensualidades
          </p>

          <div className={styles.heroTrust}>
            <span className={styles.heroTrustItem}><Check size={13} strokeWidth={3} /> Sin tarjeta</span>
            <span className={styles.dot} />
            <span className={styles.heroTrustItem}><Check size={13} strokeWidth={3} /> Soporte por WhatsApp</span>
            <span className={styles.dot} />
            <span className={styles.heroTrustItem}><Check size={13} strokeWidth={3} /> Actualizaciones de por vida</span>
          </div>
        </div>

        <div className={styles.shot}>
          <div className={styles.shotBar} aria-hidden>
            <span className={styles.shotLight} />
            <span className={styles.shotLight} />
            <span className={styles.shotLight} />
          </div>
          <img src="/hero-dashboard.png" alt="Panel de control de Stackr" className={styles.shotImg} />
          <span className={styles.shotFade} aria-hidden />
        </div>
      </header>

      {/* ── LOCALES ────────────────────────────────── */}
      <section className={styles.clients}>
        <div className={styles.clientsInner}>
          <p className={styles.clientsLabel}>Locales que ya lo usan</p>
          <div className={styles.clientsRow}>
            {LOCALES.map(n => <span key={n} className={styles.clientName}>{n}</span>)}
          </div>
        </div>
      </section>

      {/* ── PROBLEMA ───────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={`${styles.head} ${styles.reveal}`}>
            <span className={styles.eyebrow}>El problema</span>
            <h2 className={styles.h2}>¿Te suena familiar?</h2>
            <p className={styles.lead}>
              La mayoría de los locales usan herramientas que no fueron hechas para este
              rubro. El resultado es plata que se escapa sin que te des cuenta.
            </p>
          </div>

          <div className={styles.grid4}>
            {PROBLEMAS.map(({ icon, tono, t, d }) => (
              <article key={t} className={`${styles.card} ${styles.reveal}`}>
                <span className={`${styles.cardIcon} ${styles[tono]}`}>{icon}</span>
                <h3 className={styles.cardTitle}>{t}</h3>
                <p className={styles.cardText}>{d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── FUNCIONES ──────────────────────────────── */}
      <section id="funciones" className={`${styles.section} ${styles.sectionTint}`}>
        <div className={styles.inner}>
          <div className={`${styles.head} ${styles.reveal}`}>
            <span className={styles.eyebrow}>La solución</span>
            <h2 className={styles.h2}>Todo lo que necesitás, nada de lo que no</h2>
            <p className={styles.lead}>
              Stackr reemplaza el cuaderno, la planilla y el grupo de WhatsApp con
              un sistema que hace el trabajo por vos.
            </p>
          </div>

          {FUNCIONES.map(({ eyebrow, t, d, puntos, img, alt, recorte }, i) => (
            <div
              key={t}
              className={[
                styles.featureRow,
                img ? (i % 2 === 1 ? styles.featureFlip : "") : styles.featureSolo,
                styles.reveal,
              ].filter(Boolean).join(" ")}
            >
              <div className={styles.featureText}>
                <span className={styles.eyebrow}>{eyebrow}</span>
                <h3 className={styles.featureH3}>{t}</h3>
                <p className={styles.featureP}>{d}</p>
                <ul className={styles.featureList}>
                  {puntos.map(p => (
                    <li key={p}>
                      <Check size={16} strokeWidth={3} className={styles.featureCheck} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              {img && (
                <div className={`${styles.featureShot} ${recorte ? styles.featureShotCrop : ""}`}>
                  <img src={img} alt={alt} loading="lazy" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CÓMO EMPIEZA ───────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={`${styles.head} ${styles.reveal}`}>
            <span className={styles.eyebrow}>Cómo funciona</span>
            <h2 className={styles.h2}>De cero a tu primera venta en 10 minutos</h2>
            <p className={styles.lead}>Cada paso desbloquea el siguiente. No hay instalación ni configuración.</p>
          </div>

          <div className={styles.steps}>
            {PASOS.map(({ n, tiempo, t, d }) => (
              <article key={n} className={`${styles.step} ${styles.reveal}`}>
                <span className={styles.stepNum}>{n}</span>
                <span className={styles.stepTime}>{tiempo}</span>
                <h3 className={styles.stepTitle}>{t}</h3>
                <p className={styles.stepText}>{d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRECIO ─────────────────────────────────── */}
      <section id="precio" className={`${styles.section} ${styles.sectionTint}`}>
        <div className={styles.inner}>
          <div className={`${styles.head} ${styles.reveal}`}>
            <span className={styles.eyebrow}>Precio</span>
            <h2 className={styles.h2}>La cuenta que casi nadie hace</h2>
            <p className={styles.lead}>
              Los sistemas con mensualidad parecen baratos el primer mes. La comparación
              honesta es contra lo que vas a haber pagado en tres años.
            </p>
          </div>

          <div className={`${styles.compare} ${styles.reveal}`}>
            <div className={`${styles.compareRow} ${styles.compareHead}`}>
              <span>Concepto</span>
              <span className={styles.compareA}>Sistema mensual</span>
              <span className={styles.compareB}>Stackr</span>
            </div>
            {COMPARA.map(({ c, a, b }) => (
              <div key={c} className={styles.compareRow}>
                <span className={styles.compareLabel}>{c}</span>
                <span className={styles.compareA}>{a}</span>
                <span className={styles.compareB}>{b}</span>
              </div>
            ))}
            <div className={`${styles.compareRow} ${styles.compareTotal}`}>
              <span className={styles.compareLabel}>Total a tres años</span>
              <span className={styles.compareA}>$1.800</span>
              <span className={styles.compareB}>$260</span>
            </div>
          </div>
          <p className={styles.compareNote}>
            Cifras en dólares. «Sistema mensual» toma un plan de referencia de $50 por mes.
          </p>

          <div className={`${styles.priceCard} ${styles.reveal}`}>
            <div>
              <span className={styles.priceTag}>Precio de lanzamiento</span>
              <p className={styles.priceAmount}>
                <s>$400</s><strong>$260</strong><span>USD</span>
              </p>
              <p className={styles.priceNote}>Un solo pago. Sin mensualidades. Para siempre.</p>
              <div className={styles.priceCtas}>
                <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className={`${styles.btn} ${styles.btnLight}`}>
                  <MessageCircle size={17} /> Comprar por WhatsApp
                </a>
                <Link href="/onboarding" className={styles.priceLink}>o probalo 48 h gratis</Link>
              </div>
            </div>
            <ul className={styles.priceFeatures}>
              {INCLUYE.map(f => (
                <li key={f}><Check size={15} strokeWidth={3} /> {f}</li>
              ))}
            </ul>
          </div>

          <div className={`${styles.manifesto} ${styles.reveal}`}>
            <h3 className={styles.manifestoH3}>¿Por qué no cobramos mensualidades?</h3>
            <p className={styles.manifestoP}>
              Stackr corre sobre infraestructura barata y está escrito para que siga siéndolo.
              Tu pago único cubre los servidores por años y nos deja un margen razonable.{" "}
              <mark>Nuestro negocio crece sumando locales nuevos</mark>, no cobrándole más
              al que ya confió.
            </p>
            <div className={styles.signature}>
              <span className={styles.signatureAv}>JP</span>
              <span className={styles.signatureText}>
                <strong className={styles.signatureName}>Juan Pedro Nielsen</strong>
                <span className={styles.signatureRole}>Fundador de Stackr</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PREGUNTAS ──────────────────────────────── */}
      <section id="faq" className={styles.section}>
        <div className={styles.inner}>
          <div className={`${styles.head} ${styles.reveal}`}>
            <span className={styles.eyebrow}>Preguntas</span>
            <h2 className={styles.h2}>Lo que suelen preguntarnos</h2>
          </div>
          <div className={`${styles.faq} ${styles.reveal}`}>
            {FAQ.map(item => <Pregunta key={item.q} q={item.q} a={item.a} />)}
          </div>
        </div>
      </section>

      {/* ── CIERRE ─────────────────────────────────── */}
      <section className={styles.closing}>
        <div className={styles.closingInner}>
          <h2 className={styles.closingH2}>Empezá hoy, sin riesgo</h2>
          <p className={styles.closingSub}>
            Cuarenta y ocho horas con todo abierto. Si no te convence no pagás nada,
            y no te pedimos una tarjeta para averiguarlo.
          </p>
          <div className={styles.closingCtas}>
            <Link href="/onboarding" className={`${styles.btn} ${styles.btnLight}`}>
              Empezar prueba gratis <ArrowRight size={17} />
            </Link>
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className={`${styles.btn} ${styles.btnOnDark}`}>
              <MessageCircle size={17} /> Hablar por WhatsApp
            </a>
          </div>
          <div className={styles.closingTrust}>
            <span><Check size={13} strokeWidth={3} /> $260 una sola vez</span>
            <span className={styles.dot} />
            <span><Check size={13} strokeWidth={3} /> Sin mensualidades</span>
            <span className={styles.dot} />
            <span><Check size={13} strokeWidth={3} /> Soporte incluido</span>
          </div>
        </div>
      </section>

      {/* ── PIE ────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <p className={styles.footerName}>Stackr</p>
            <p className={styles.footerTag}>
              El sistema de gestión para locales de celulares y servicio técnico que se paga solo.
            </p>
          </div>
          <div className={styles.footerCols}>
            <div className={styles.footerCol}>
              <p className={styles.footerColHead}>Producto</p>
              <a href="#funciones">Funciones</a>
              <a href="#precio">Precio</a>
              <Link href="/onboarding">Probar gratis</Link>
            </div>
            <div className={styles.footerCol}>
              <p className={styles.footerColHead}>Soporte</p>
              <a href="#faq">Preguntas</a>
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              <a href="mailto:hola@stackrarg.com">Correo</a>
            </div>
            <div className={styles.footerCol}>
              <p className={styles.footerColHead}>Cuenta</p>
              <Link href="/login">Entrar</Link>
              <Link href="/onboarding">Crear cuenta</Link>
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
