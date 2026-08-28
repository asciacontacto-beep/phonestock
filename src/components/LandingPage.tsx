"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import Image from "next/image";
import styles from "./LandingPage.module.css";

const WA_LINK =
  "https://wa.me/5492262559559?text=Hola%2C%20quiero%20contratar%20Stackr%20%F0%9F%93%B1%20%C2%BFC%C3%B3mo%20procedo%3F";

/* ─── Datos ──────────────────────────────────────── */

const PROBLEMAS = [
  {
    n: "i",
    t: "No sabés cuánto ganás",
    d: "Vendés todos los días, pero entre el costo, los gastos y el dólar que cambió desde que compraste, el margen real nunca aparece en ningún lado.",
  },
  {
    n: "ii",
    t: "El stock vive en la cabeza de alguien",
    d: "Repuestos que no se encuentran, equipos cargados dos veces, precios de la semana pasada. Y la única copia de la verdad es un mensaje de WhatsApp.",
  },
  {
    n: "iii",
    t: "Las reparaciones se pierden",
    d: "Un cuaderno con nombres y fallas. El cliente llama para preguntar por su equipo y nadie sabe dónde está ni qué se le hizo.",
  },
  {
    n: "iv",
    t: "El cierre se come la noche",
    d: "Sumar la caja, controlar lo que vendió cada uno, revisar los movimientos. Todos los días, a mano, cuando ya cerraste.",
  },
];

type Capitulo = {
  n: string; fig: string | null; img: string | null; alt: string;
  epigrafe: string; t: string; d: string; puntos: string[]; recorte?: boolean;
};

const CAPITULOS: Capitulo[] = [
  {
    n: "01",
    fig: "Fig. 2",
    img: "/hero-stats.png",
    alt: "Indicadores de ganancia y margen en Stackr",
    epigrafe: "Ganancia del mes y margen real, con el capital inmovilizado en stock.",
    recorte: true,
    t: "La rentabilidad, calculada bien",
    d: "Cada venta guarda el dólar del día en que se hizo, no el de hoy. Los repuestos se descuentan de la reparación que los usó. Lo que ves como ganancia es la ganancia.",
    puntos: ["Margen por equipo, accesorio y servicio", "Histórico en ARS y USD", "Cierre de caja automático"],
  },
  {
    n: "02",
    fig: "Fig. 3",
    img: "/hero-stock.png",
    alt: "Inventario de Stackr",
    epigrafe: "Inventario por depósito, con IMEI, costo y condición de cada unidad.",
    t: "Un inventario que no se discute",
    d: "Cada equipo tiene IMEI, costo, precio y condición. Cuando se vende, sale del stock solo. Si tenés más de un local, cada uno tiene el suyo y podés transferir entre ellos.",
    puntos: ["Alta por escaneo de código", "Depósitos y sucursales", "Transferencias con registro"],
  },
  {
    n: "03",
    fig: null,
    img: null,
    alt: "",
    epigrafe: "",
    t: "El taller, ordenado",
    d: "Ingresa el equipo con la falla, el presupuesto y el técnico. Se cargan los repuestos que se usaron y el costo entra solo en la cuenta. Cuando está listo, el cliente recibe un WhatsApp.",
    puntos: ["Orden de servicio imprimible", "Repuestos con stock propio", "Aviso automático al cliente"],
  },
];

const PASOS = [
  {
    n: "01",
    t: "Registrás el negocio",
    tiempo: "30 segundos",
    d: "Nombre del local, email y contraseña. Sin tarjeta. La cuenta queda activa al instante.",
  },
  {
    n: "02",
    t: "Creás el depósito",
    tiempo: "1 minuto",
    d: "El depósito es tu local. Todo el stock vive adentro de uno. Si tenés dos sucursales, creás dos.",
  },
  {
    n: "03",
    t: "Cargás el inventario",
    tiempo: "2 a 5 minutos",
    d: "Escaneás el código o escribís marca, modelo y precio. Se guarda costo, venta, IMEI y condición.",
  },
  {
    n: "04",
    t: "Hacés la primera venta",
    tiempo: "30 segundos",
    d: "Equipo, cliente, forma de pago. El comprobante con la garantía sale solo, listo para imprimir.",
  },
];

const TABLA = [
  { c: "Costo al empezar", otros: "$0", stackr: "$260" },
  { c: "Año 1", otros: "$600", stackr: "—" },
  { c: "Año 2", otros: "$600", stackr: "—" },
  { c: "Año 3", otros: "$600", stackr: "—" },
  { c: "Actualizaciones", otros: "Según plan", stackr: "Incluidas" },
  { c: "Soporte", otros: "Plan premium", stackr: "Incluido" },
];

const FAQ = [
  {
    q: "¿Puedo probarlo antes de pagar?",
    a: "Sí. Tenés 48 horas con todas las funciones abiertas y sin tarjeta de crédito. Si necesitás más tiempo para cargar el inventario, escribinos y te lo extendemos.",
  },
  {
    q: "¿Qué pasa si necesito ayuda?",
    a: "Soporte por WhatsApp incluido de por vida, sin plan premium ni tickets. Respondemos en menos de 24 horas hábiles.",
  },
  {
    q: "¿Funciona desde el celular?",
    a: "Sí, y está hecho para eso. Vendés, cargás stock y mirás las métricas desde el teléfono, sin instalar nada.",
  },
  {
    q: "¿Puedo darle acceso a mis empleados?",
    a: "Sí. Creás usuarios con rol de Vendedor o Propietario. El vendedor ve lo que necesita para trabajar y no ve los costos ni la rentabilidad.",
  },
  {
    q: "¿Sirve para varias sucursales?",
    a: "Sí. Un depósito por local, vendedores asignados a cada uno y transferencias de stock entre ellos. Todo se ve desde el mismo panel.",
  },
  {
    q: "¿Las actualizaciones se cobran aparte?",
    a: "No. El pago único incluye todo lo que venga después, para siempre.",
  },
];

/* ─── Preguntas ──────────────────────────────────── */

function Pregunta({ q, a, n }: { q: string; a: string; n: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`${styles.qaItem} ${open ? styles.qaOpen : ""}`}>
      <button className={styles.qaQ} onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className={styles.qaN}>{n}</span>
        <span className={styles.qaText}>{q}</span>
        <span className={styles.qaMark} aria-hidden>{open ? "−" : "+"}</span>
      </button>
      <div className={styles.qaBody} hidden={!open}>
        <p className={styles.qaA}>{a}</p>
      </div>
    </div>
  );
}

/* ─── Página ─────────────────────────────────────── */

export default function LandingPage() {
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

  const anio = new Date().getFullYear();

  return (
    <div className={styles.root}>

      {/* ── CABECERA ───────────────────────────────── */}
      <header className={styles.masthead}>
        <div className={styles.mastheadInner}>
          <Link href="/" className={styles.mastheadBrand}>
            <Image src="/logo.png" alt="" width={26} height={26} className={styles.mastheadLogo} />
            <span className={styles.mastheadName}>Stackr</span>
          </Link>
          <nav className={styles.mastheadNav}>
            <a href="#sistema">Sistema</a>
            <a href="#cuenta">La cuenta</a>
            <a href="#preguntas">Preguntas</a>
          </nav>
          <div className={styles.mastheadActions}>
            <Link href="/login" className={styles.linkPlain}>Entrar</Link>
            <Link href="/onboarding" className={styles.btnInk}>Probar gratis</Link>
          </div>
        </div>
      </header>

      {/* ── PORTADA ────────────────────────────────── */}
      <section className={styles.cover}>
        <div className={styles.coverInner}>
          <div className={styles.dateline}>
            <span>Edición Argentina</span>
            <span className={styles.datelineSep} />
            <span>Locales de celulares y servicio técnico</span>
            <span className={styles.datelineSep} />
            <span>{anio}</span>
          </div>

          <h1
            className={styles.coverH1}
          >
            Vendés todos los días.
            <em> ¿Sabés cuánto ganaste?</em>
          </h1>

          <div className={styles.coverGrid}>
            <p
              className={styles.coverDeck}
            >
              Stackr es el sistema de gestión para locales de celulares en Argentina.
              Stock, ventas, reparaciones y caja en un solo lugar — y por primera vez,
              el número real de lo que te queda.
            </p>

            <div
              className={styles.coverAside}
            >
              <div className={styles.coverActions}>
                <Link href="/onboarding" className={styles.btnInkLg}>Empezar la prueba</Link>
                <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className={styles.linkUnderline}>
                  Comprar por WhatsApp
                </a>
              </div>
              <p className={styles.coverFine}>
                48 horas completas, sin tarjeta de crédito.
              </p>
            </div>
          </div>

          {/* Lámina principal */}
          <figure
            className={styles.plate}
          >
            <div className={styles.plateFrame}>
              <img src="/hero-dashboard.png" alt="Panel de control de Stackr" className={styles.plateImg} />
            </div>
            <figcaption className={styles.plateCaption}>
              <span className={styles.plateFig}>Fig. 1</span>
              Panel de rentabilidad. Los datos de la imagen son de demostración.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ── FRANJA DE CIFRAS ───────────────────────── */}
      <section className={styles.ledger}>
        <div className={styles.ledgerInner}>
          <div className={styles.ledgerCell}>
            <span className={styles.ledgerNum}>$260</span>
            <span className={styles.ledgerLbl}>Pago único, en dólares</span>
          </div>
          <div className={styles.ledgerCell}>
            <span className={styles.ledgerNum}>$0</span>
            <span className={styles.ledgerLbl}>Por mes, para siempre</span>
          </div>
          <div className={styles.ledgerCell}>
            <span className={styles.ledgerNum}>48 h</span>
            <span className={styles.ledgerLbl}>De prueba, sin tarjeta</span>
          </div>
          <div className={styles.ledgerCell}>
            <span className={styles.ledgerNum}>10 min</span>
            <span className={styles.ledgerLbl}>Hasta tu primera venta</span>
          </div>
        </div>
      </section>

      {/* ── § EL PROBLEMA ──────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <header className={styles.sectionHead}>
            <span className={styles.sectionNum}>§ 01</span>
            <h2 className={styles.sectionH2}>Lo que se escapa</h2>
          </header>

          <p className={styles.lead}>
            <span className={styles.dropcap}>L</span>a mayoría de los locales de celulares trabajan
            con herramientas que no fueron hechas para este rubro: una planilla, un cuaderno y un
            grupo de WhatsApp. Funciona, hasta que deja de funcionar. Y el costo de que deje de
            funcionar no se ve en ningún lado — se ve en lo que no te quedó a fin de mes.
          </p>

          <div className={styles.problemList}>
            {PROBLEMAS.map(({ n, t, d }) => (
              <article key={t} className={styles.problemItem}>
                <span className={styles.problemNum}>{n}</span>
                <h3 className={styles.problemT}>{t}</h3>
                <p className={styles.problemD}>{d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── § EL SISTEMA ───────────────────────────── */}
      <section id="sistema" className={styles.sectionAlt}>
        <div className={styles.sectionInner}>
          <header className={styles.sectionHead}>
            <span className={styles.sectionNum}>§ 02</span>
            <h2 className={styles.sectionH2}>El sistema</h2>
          </header>

          {CAPITULOS.map(({ n, fig, img, alt, epigrafe, t, d, puntos, recorte }, i) => (
            <div
              key={n}
              className={`${styles.chapter} ${i % 2 === 1 ? styles.chapterFlip : ""}`}
             
            >
              <div className={styles.chapterText}>
                <span className={styles.chapterNum}>{n}</span>
                <h3 className={styles.chapterH3}>{t}</h3>
                <p className={styles.chapterP}>{d}</p>
                <ul className={styles.chapterList}>
                  {puntos.map(p => <li key={p}>{p}</li>)}
                </ul>
              </div>
              {img && (
                <figure className={styles.chapterFigure}>
                  <div className={styles.plateFrame}>
                    <img
                      src={img}
                      alt={alt}
                      className={`${styles.plateImg} ${recorte ? styles.plateCrop : ""}`}
                      loading="lazy"
                    />
                  </div>
                  <figcaption className={styles.plateCaption}>
                    <span className={styles.plateFig}>{fig}</span>
                    {epigrafe}
                  </figcaption>
                </figure>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── § CÓMO EMPIEZA ─────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <header className={styles.sectionHead}>
            <span className={styles.sectionNum}>§ 03</span>
            <h2 className={styles.sectionH2}>De cero a la primera venta</h2>
          </header>

          <div className={styles.steps}>
            {PASOS.map(({ n, t, tiempo, d }) => (
              <article key={n} className={styles.step}>
                <div className={styles.stepMeta}>
                  <span className={styles.stepNum}>{n}</span>
                  <span className={styles.stepTime}>{tiempo}</span>
                </div>
                <div className={styles.stepBody}>
                  <h3 className={styles.stepT}>{t}</h3>
                  <p className={styles.stepD}>{d}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── § LA CUENTA ────────────────────────────── */}
      <section id="cuenta" className={styles.sectionInk}>
        <div className={styles.sectionInner}>
          <header className={styles.sectionHead}>
            <span className={styles.sectionNum}>§ 04</span>
            <h2 className={styles.sectionH2}>La cuenta que casi nadie hace</h2>
          </header>

          <p className={styles.leadInk}>
            Los sistemas con mensualidad parecen baratos el primer mes. La comparación honesta
            no es contra el precio de entrada: es contra lo que vas a haber pagado en tres años.
          </p>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col" className={styles.thLabel}>Concepto</th>
                  <th scope="col" className={styles.thNum}>Sistema mensual</th>
                  <th scope="col" className={`${styles.thNum} ${styles.thUs}`}>Stackr</th>
                </tr>
              </thead>
              <tbody>
                {TABLA.map(({ c, otros, stackr }) => (
                  <tr key={c}>
                    <th scope="row" className={styles.tdLabel}>{c}</th>
                    <td className={styles.tdNum}>{otros}</td>
                    <td className={`${styles.tdNum} ${styles.tdUs}`}>{stackr}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className={styles.tfLabel}>Total a tres años</th>
                  <td className={styles.tfNum}>$1.800</td>
                  <td className={`${styles.tfNum} ${styles.tfUs}`}>$260</td>
                </tr>
              </tfoot>
            </table>
            <p className={styles.tableNote}>
              Cifras en dólares. «Sistema mensual» toma un plan de referencia de $50 por mes.
            </p>
          </div>

          <div className={styles.offer}>
            <div className={styles.offerMain}>
              <span className={styles.offerLbl}>Precio de lanzamiento</span>
              <p className={styles.offerPrice}>
                <s>$400</s>
                <strong>$260</strong>
                <span>USD</span>
              </p>
              <p className={styles.offerSub}>Un solo pago. Sin mensualidades. Para siempre.</p>
              <div className={styles.offerActions}>
                <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className={styles.btnPaper}>
                  Comprar por WhatsApp
                </a>
                <Link href="/onboarding" className={styles.linkUnderlineLight}>
                  o probalo 48 h gratis
                </Link>
              </div>
            </div>
            <ul className={styles.offerList}>
              {[
                "Sucursales ilimitadas",
                "Usuarios ilimitados",
                "Stock, ventas, reparaciones y caja",
                "Reportes de rentabilidad",
                "Gestión en pesos y dólares",
                "Avisos por WhatsApp",
                "Actualizaciones de por vida",
                "Soporte prioritario incluido",
              ].map(f => <li key={f}>{f}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* ── MANIFIESTO ─────────────────────────────── */}
      <section className={styles.manifesto}>
        <div className={styles.manifestoInner}>
          <blockquote className={styles.manifestoQuote}>
            <p>
              No cobramos por mes porque no queremos que nuestro negocio crezca
              cobrándole más al que ya confió. Crece sumando locales nuevos.
            </p>
          </blockquote>
          <div className={styles.manifestoBody}>
            <p>
              Stackr corre sobre infraestructura barata y está escrito para que siga siéndolo.
              Tu pago único cubre los servidores por años y nos deja un margen razonable. Es una
              decisión de cómo queremos ganar plata, no una promoción que vence.
            </p>
            <footer className={styles.signature}>
              <span className={styles.signatureName}>Juan Pedro Nielsen</span>
              <span className={styles.signatureRole}>Fundador</span>
            </footer>
          </div>
        </div>
      </section>

      {/* ── § PREGUNTAS ────────────────────────────── */}
      <section id="preguntas" className={styles.section}>
        <div className={styles.sectionInner}>
          <header className={styles.sectionHead}>
            <span className={styles.sectionNum}>§ 05</span>
            <h2 className={styles.sectionH2}>Preguntas</h2>
          </header>
          <div className={styles.qaList}>
            {FAQ.map((item, i) => (
              <Pregunta key={item.q} q={item.q} a={item.a} n={String(i + 1).padStart(2, "0")} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CIERRE ─────────────────────────────────── */}
      <section className={styles.closing}>
        <div className={styles.closingInner}>
          <h2 className={styles.closingH2}>
            Empezá esta semana.
          </h2>
          <p className={styles.closingSub}>
            Cuarenta y ocho horas con todo abierto. Si no te convence, no pagás nada
            y no te pedimos una tarjeta para averiguarlo.
          </p>
          <div className={styles.closingActions}>
            <Link href="/onboarding" className={styles.btnInkLg}>Empezar la prueba</Link>
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className={styles.linkUnderline}>
              Hablar por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── COLOFÓN ────────────────────────────────── */}
      <footer className={styles.colophon}>
        <div className={styles.colophonInner}>
          <div className={styles.colophonBrand}>
            <span className={styles.colophonName}>Stackr</span>
            <p className={styles.colophonLine}>
              Sistema de gestión para locales de celulares y servicio técnico.
              Hecho en Argentina.
            </p>
          </div>
          <nav className={styles.colophonNav}>
            <div>
              <span className={styles.colophonHead}>Producto</span>
              <a href="#sistema">Sistema</a>
              <a href="#cuenta">Precio</a>
              <Link href="/onboarding">Probar gratis</Link>
            </div>
            <div>
              <span className={styles.colophonHead}>Contacto</span>
              <a href="#preguntas">Preguntas</a>
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              <a href="mailto:hola@stackrarg.com">Correo</a>
            </div>
            <div>
              <span className={styles.colophonHead}>Cuenta</span>
              <Link href="/login">Entrar</Link>
              <Link href="/onboarding">Crear cuenta</Link>
            </div>
          </nav>
        </div>
        <div className={styles.colophonBottom}>
          <span>© {anio} Stackr</span>
          <span className={styles.colophonType}>
            Compuesto en Instrument Serif y Instrument Sans.
          </span>
        </div>
      </footer>

    </div>
  );
}
