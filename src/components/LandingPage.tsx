"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Store,
  BarChart3,
  Shield,
  Zap,
  Globe,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import styles from "./LandingPage.module.css";

const FAQ_ITEMS = [
  {
    q: "¿Puedo probar Stackr antes de pagar?",
    a: "Sí. Creás tu cuenta y tenés 48 horas de prueba completa y gratuita con acceso a todas las funciones. Sin tarjeta de crédito requerida.",
  },
  {
    q: "¿Qué pasa si necesito soporte o hay algo que no funciona?",
    a: "Tenemos soporte prioritario por WhatsApp. Respondemos en menos de 24hs en días hábiles. Tu pago único incluye soporte de por vida.",
  },
  {
    q: "¿Funciona en el celular?",
    a: "Sí. Stackr está optimizado para mobile. Podés vender, ver el stock y revisar las métricas desde cualquier celular sin instalar nada extra.",
  },
  {
    q: "¿Puedo tener varios empleados con distintos permisos?",
    a: "Absolutamente. Podés crear usuarios con roles de Vendedor o Propietario. Los vendedores solo ven lo que necesitan para vender, los dueños tienen acceso completo.",
  },
  {
    q: "¿El sistema funciona con varias sucursales?",
    a: "Sí. Podés crear múltiples depósitos o sucursales, asignar vendedores a cada uno y transferir stock entre ellos. Todo unificado en un mismo panel.",
  },
  {
    q: "¿Qué pasa si en el futuro agregan nuevas funciones?",
    a: "Todas las actualizaciones y nuevas funciones son gratuitas para siempre. Tu pago único te da acceso a todo lo que desarrollemos en el futuro.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.faqItem}>
      <button className={styles.faqQuestion} onClick={() => setOpen(o => !o)}>
        <span>{q}</span>
        <ChevronDown
          size={20}
          className={styles.faqChevron}
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <p className={styles.faqAnswer}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className={styles.landingRoot}>
      {/* Navbar */}
      <nav className={styles.nav}>
        <div className={styles.navContainer}>
          <div className={styles.logoArea}>
            <Image src="/logo.png" alt="Stackr Logo" width={64} height={64} className={styles.logoImg} />
            <span className={styles.logoText}>Stackr</span>
          </div>
          <div className={styles.navActions}>
            <Link href="/login" className={styles.navLink}>
              Iniciar Sesión
            </Link>
            <Link href="/onboarding" className={styles.navBtn}>
              Probar Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className={styles.badge}
          >
            <span style={{ color: "#eab308" }}>★</span>
            <span>La plataforma líder para locales de celulares</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className={styles.title}
          >
            Gestiona tu tienda de tecnología sin estrés
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className={styles.subtitle}
          >
            Stock, reparaciones, ventas y finanzas. Todo en un solo lugar, diseñado específicamente para optimizar y escalar tu negocio.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className={styles.ctaGroup}
          >
            <Link href="/onboarding" className={styles.primaryBtn}>
              Comenzar ahora
              <ArrowRight size={18} />
            </Link>
            <a href="#features" className={styles.secondaryBtn}>
              Ver características
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 80, rotateX: 10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.8, delay: 0.4, type: "spring", bounce: 0.4 }}
            className={styles.dashboardMockup}
          >
            <img src="/dashboard-screenshot.png" alt="Stackr Dashboard" />
          </motion.div>
        </div>
      </section>

      {/* Social Proof Marquee */}
      <section className={styles.trusted}>
        <h3 className={styles.trustedText}>Confían en nosotros cientos de tiendas locales</h3>
        <div className={styles.marquee}>
          <div className={styles.trustedLogos}>
            <span>iFix</span>
            <span>TecnoStore</span>
            <span>CellularCenter</span>
            <span>ApplePoint</span>
            <span>MobiShop</span>
            <span>GlobalCel</span>
            <span>FixIt</span>
            <span>PhoneMaster</span>
          </div>
          <div className={styles.trustedLogos}>
            <span>iFix</span>
            <span>TecnoStore</span>
            <span>CellularCenter</span>
            <span>ApplePoint</span>
            <span>MobiShop</span>
            <span>GlobalCel</span>
            <span>FixIt</span>
            <span>PhoneMaster</span>
          </div>
        </div>
      </section>

      {/* Stats row */}
      <section className={styles.statsSection}>
        <div className={styles.statsInner}>
          <div className={styles.statItem}>
            <div className={styles.statNum}>500+</div>
            <div className={styles.statLabel}>Tiendas activas</div>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <div className={styles.statNum}>$0</div>
            <div className={styles.statLabel}>Mensualidades, por siempre</div>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <div className={styles.statNum}>48hs</div>
            <div className={styles.statLabel}>Prueba gratuita completa</div>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <div className={styles.statNum}>∞</div>
            <div className={styles.statLabel}>Actualizaciones incluidas</div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section id="features" className={styles.features}>
        <div className={styles.featuresInner}>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={styles.sectionTitle}
          >
            Todo lo que necesitas, y más.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className={styles.sectionDesc}
          >
            Olvídate de las hojas de cálculo. Stackr ofrece herramientas avanzadas empaquetadas en una interfaz extremadamente simple y hermosa.
          </motion.p>

          <div className={styles.bentoGrid}>
            {/* Card 1: Métricas */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              className={`${styles.bentoCard} ${styles.cardLarge}`}
            >
              <div className={styles.fakeUiBox}>
                <div className={styles.fakeBarGroup}>
                  {[40, 70, 50, 90, 60, 100, 75].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: "10%" }}
                      whileInView={{ height: `${h}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06 }}
                      className={styles.fakeBar}
                    />
                  ))}
                </div>
              </div>
              <h3 className={styles.cardTitle}>Métricas que importan</h3>
              <p className={styles.cardDesc}>Cierres de caja automáticos, márgenes de ganancia por producto y tendencias de ventas. Todo calculado en tiempo real para que tomes mejores decisiones.</p>
            </motion.div>

            {/* Card 2: POS */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: 0.1 }}
              className={`${styles.bentoCard} ${styles.cardMedium}`}
            >
              <div className={styles.fakeUiBox}>
                <div className={styles.fakeReceipt}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className={styles.fakeLine} style={{ width: 80, background: "#d1d5db" }} />
                    <div className={styles.fakeLine} style={{ width: 120 }} />
                  </div>
                  <div style={{ fontWeight: 800 }}>$1,200</div>
                </div>
              </div>
              <h3 className={styles.cardTitle}>Ventas Rápidas</h3>
              <p className={styles.cardDesc}>Sistema POS optimizado para rapidez. Escanea códigos, emite tickets y descuenta stock al instante.</p>
            </motion.div>

            {/* Card 3: Multi-sucursal */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: 0.15 }}
              className={`${styles.bentoCard} ${styles.cardMedium}`}
            >
              <div className={styles.fakeUiBox} style={{ justifyContent: "center", alignItems: "center", minHeight: 100 }}>
                <Store size={40} color="#3b82f6" strokeWidth={1.5} />
              </div>
              <h3 className={styles.cardTitle}>Multi-sucursal</h3>
              <p className={styles.cardDesc}>Gestioná todas tus sucursales desde un solo panel. Transferí stock entre depósitos y controlá cada caja por separado.</p>
            </motion.div>

            {/* Card 4: Multi-moneda */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: 0.2 }}
              className={`${styles.bentoCard} ${styles.cardMedium}`}
            >
              <div className={styles.fakeUiBox} style={{ justifyContent: "center", alignItems: "center", minHeight: 100 }}>
                <Globe size={40} color="#10b981" strokeWidth={1.5} />
              </div>
              <h3 className={styles.cardTitle}>ARS y USD</h3>
              <p className={styles.cardDesc}>Manejá precios en pesos y dólares con tipo de cambio configurable. El sistema convierte automáticamente para los reportes.</p>
            </motion.div>

            {/* Card 5: Reparaciones (Wide) */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: 0.25 }}
              className={`${styles.bentoCard} ${styles.cardWide}`}
            >
              <div style={{ flex: 1 }}>
                <h3 className={styles.cardTitle}>Gestión de Reparaciones</h3>
                <p className={styles.cardDesc}>
                  Olvídate de los cuadernos. Ingresá el equipo, detallá la falla, asigná repuestos del inventario y el sistema notificará a tu cliente automáticamente por WhatsApp cuando el equipo esté listo para retirar.
                </p>
              </div>
              <div className={styles.fakeUiBox} style={{ flex: 1, marginBottom: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div className={styles.fakeAvatar} style={{ background: "#3b82f6" }}>WP</div>
                  <div>
                    <div className={styles.fakeLine} style={{ width: 140, marginBottom: 6 }} />
                    <div className={styles.fakeLine} style={{ width: 80, background: "#d1d5db" }} />
                  </div>
                </div>
                <div className={styles.fakeReceipt} style={{ background: "#dcf8c6", borderRadius: "12px 12px 12px 0" }}>
                  <span style={{ fontSize: 13, color: "#111" }}>¡Hola! Tu iPhone 13 Pro ya está reparado y listo para retirar. 🚀</span>
                </div>
              </div>
            </motion.div>

            {/* Card 6: Reportes */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: 0.3 }}
              className={`${styles.bentoCard} ${styles.cardMedium}`}
            >
              <div className={styles.fakeUiBox} style={{ justifyContent: "center", alignItems: "center", minHeight: 100 }}>
                <BarChart3 size={40} color="#f59e0b" strokeWidth={1.5} />
              </div>
              <h3 className={styles.cardTitle}>Reportes Detallados</h3>
              <p className={styles.cardDesc}>Rentabilidad por período, margen por producto, performance por vendedor y análisis de gastos. Todo exportable a CSV.</p>
            </motion.div>

            {/* Card 7: Seguridad */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: 0.35 }}
              className={`${styles.bentoCard} ${styles.cardMedium}`}
            >
              <div className={styles.fakeUiBox} style={{ justifyContent: "center", alignItems: "center", minHeight: 100 }}>
                <Shield size={40} color="#6366f1" strokeWidth={1.5} />
              </div>
              <h3 className={styles.cardTitle}>Roles y Permisos</h3>
              <p className={styles.cardDesc}>Cada empleado ve solo lo que necesita. Los vendedores no acceden a costos ni reportes. Vos tenés el control total.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className={styles.steps}>
        <div className={styles.featuresInner}>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={styles.sectionTitle}
          >
            Tu local digitalizado en minutos
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={styles.sectionDesc}
          >
            No requieres hardware costoso ni meses de aprendizaje.
          </motion.p>

          <div className={styles.stepGrid}>
            {[
              { n: 1, title: "Crea tu cuenta", desc: "Regístrate en menos de un minuto. Configurá tu tienda, sucursales y empleados con sus permisos." },
              { n: 2, title: "Carga tu stock", desc: "Importá tus productos, accesorios y repuestos fácilmente. Generá e imprimí códigos de barras." },
              { n: 3, title: "Comienza a vender", desc: "Registrá ventas y reparaciones. El sistema hará el trabajo duro y calculará tus métricas automáticamente." },
            ].map(({ n, title, desc }, i) => (
              <motion.div
                key={n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={styles.stepCard}
              >
                <div className={styles.stepNum}>{n}</div>
                <h3 className={styles.cardTitle}>{title}</h3>
                <p className={styles.cardDesc}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className={styles.testimonials}>
        <div className={styles.featuresInner}>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={styles.sectionTitle}
          >
            Hecho por y para dueños de locales
          </motion.h2>

          <div className={styles.testGrid} style={{ marginTop: 60 }}>
            {[
              {
                quote: '"Antes perdíamos repuestos y no sabíamos cuánto ganábamos realmente. Con Stackr, la caja siempre cuadra y mis empleados saben qué hacer."',
                name: "Carlos M.",
                role: "Dueño, FixMobile Center",
                emoji: "👨🏻‍🔧",
              },
              {
                quote: '"La función para avisarle a los clientes por WhatsApp que su celular está listo es un game-changer. Quedamos súper profesionales."',
                name: "Mariana V.",
                role: "Gerente, iStore Fix",
                emoji: "👩🏽‍💻",
              },
              {
                quote: '"Manejo mis 3 sucursales desde el sillón de mi casa. Veo en vivo las ventas y el stock disponible sin tener que llamar a nadie."',
                name: "Julián R.",
                role: "CEO, Cellular Point",
                emoji: "👨🏼‍💼",
              },
            ].map(({ quote, name, role, emoji }, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={styles.testCard}
              >
                <div className={styles.testStars}>★★★★★</div>
                <p className={styles.testQuote}>{quote}</p>
                <div className={styles.testAuthor}>
                  <div className={styles.testAvatar}>{emoji}</div>
                  <div className={styles.authorInfo}>
                    <h4>{name}</h4>
                    <p>{role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className={styles.pricing}>
        <div className={styles.pricingGrid}>
          {/* Pricing Card */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", bounce: 0.3 }}
            className={styles.pricingCard}
          >
            <div className={styles.pricingBadge}>Licencia de por vida</div>
            <div className={styles.price}>$400</div>
            <p className={styles.priceDesc}>pago único (USD)</p>

            <div className={styles.pricingFeatures}>
              {[
                "Gestión de sucursales ilimitadas",
                "Usuarios y empleados ilimitados",
                "Actualizaciones de por vida gratis",
                "Soporte prioritario por WhatsApp",
              ].map(f => (
                <div key={f} className={styles.pricingFeature}>
                  <CheckCircle2 color="#10b981" size={24} />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <Link href="/onboarding" className={styles.primaryBtn} style={{ width: "100%", justifyContent: "center" }}>
              Obtener Stackr Ahora
              <ArrowRight size={18} />
            </Link>
          </motion.div>

          {/* Manifesto */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={styles.manifestoBox}
          >
            <h2 className={styles.manifestoTitle}>
              ¿Por qué no hay mensualidad?<br />(Y cómo nos mantenemos)
            </h2>
            <p className={styles.manifestoText}>
              A la mayoría de los dueños les duele pagar mensualidades abusivas, pero al mismo tiempo se preguntan:{" "}
              <em>"Si no cobran por mes, ¿cómo pagan los servidores y mantienen el sistema funcionando?"</em>
            </p>
            <p className={styles.manifestoText}>
              El secreto es que Stackr está construido con <strong>tecnología extremadamente eficiente</strong>. No gastamos fortunas en oficinas, ni en enormes equipos de marketing. Mantenemos nuestros costos bajos para trasladarte ese ahorro.
            </p>
            <p className={styles.manifestoText}>
              Tu pago único de $400 USD cubre holgadamente los costos de tus servidores a largo plazo y nos deja un margen justo.{" "}
              <span className={styles.manifestoHighlight}>Nuestro negocio crece sumando nuevos clientes felices</span>, no exprimiendo a los que ya confiaron en nosotros.
            </p>

            <div className={styles.manifestoAuthor}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#111", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 18, flexShrink: 0 }}>
                JP
              </div>
              <div>
                <h4>Juan Pedro Nielsen</h4>
                <p>Fundador de Stackr</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className={styles.faqSection}>
        <div className={styles.featuresInner}>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={styles.sectionTitle}
          >
            Preguntas frecuentes
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className={styles.sectionDesc}
          >
            ¿Tenés dudas? Las respondemos todas acá.
          </motion.p>

          <div className={styles.faqGrid}>
            {FAQ_ITEMS.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <FaqItem q={item.q} a={item.a} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.bottomCta}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className={styles.heroContent}
          style={{ margin: "0 auto" }}
        >
          <h2 className={styles.sectionTitle}>El software que se paga solo</h2>
          <p className={styles.sectionDesc}>
            Con evitar perder un repuesto o cobrar mal una reparación, recuperás tu inversión. Únete a las tiendas más exitosas.
          </p>
          <div className={styles.checkList}>
            {[
              "Pago único de $400 USD",
              "Prueba completa gratis por 48hs",
              "Sin mensualidades, jamás",
            ].map(item => (
              <div key={item} className={styles.checkItem}>
                <CheckCircle2 size={24} color="#10b981" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <Link href="/onboarding" className={styles.primaryBtn} style={{ display: "inline-flex" }}>
            Comenzar mi prueba de 48hs
            <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.footerLogo}>Stackr</span>
            <p className={styles.footerTagline}>El software de gestión para locales de celulares que se paga solo.</p>
          </div>

          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <h5 className={styles.footerColTitle}>Producto</h5>
              <a href="#features">Características</a>
              <a href="#features">Reparaciones</a>
              <a href="#features">Multi-sucursal</a>
              <Link href="/onboarding">Probar gratis</Link>
            </div>
            <div className={styles.footerCol}>
              <h5 className={styles.footerColTitle}>Empresa</h5>
              <a href="#pricing">Precios</a>
              <a href="#faq">FAQ</a>
              <a href="mailto:soporte@stackrarg.com">Soporte</a>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>© {new Date().getFullYear()} Stackr. Todos los derechos reservados.</p>
          <p>Hecho con ❤️ en Argentina</p>
        </div>
      </footer>
    </div>
  );
}
