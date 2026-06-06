"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import styles from "./LandingPage.module.css";

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

      {/* Social Proof (Marquee) */}
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
            {/* Bento Card 1: Finanzas (Large) */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              className={`${styles.bentoCard} ${styles.cardLarge}`}
            >
              <div className={styles.fakeUiBox}>
                <div className={styles.fakeBarGroup}>
                  <motion.div initial={{ height: "20%" }} whileInView={{ height: "40%" }} viewport={{ once: true }} className={styles.fakeBar} />
                  <motion.div initial={{ height: "20%" }} whileInView={{ height: "70%" }} viewport={{ once: true }} className={styles.fakeBar} />
                  <motion.div initial={{ height: "20%" }} whileInView={{ height: "50%" }} viewport={{ once: true }} className={styles.fakeBar} />
                  <motion.div initial={{ height: "20%" }} whileInView={{ height: "90%" }} viewport={{ once: true }} className={styles.fakeBar} />
                  <motion.div initial={{ height: "20%" }} whileInView={{ height: "60%" }} viewport={{ once: true }} className={styles.fakeBar} />
                  <motion.div initial={{ height: "20%" }} whileInView={{ height: "100%" }} viewport={{ once: true }} className={styles.fakeBar} />
                </div>
              </div>
              <h3 className={styles.cardTitle}>Métricas que importan</h3>
              <p className={styles.cardDesc}>Cierres de caja automáticos, márgenes de ganancia por producto y tendencias de ventas. Todo calculado en tiempo real para que tomes mejores decisiones.</p>
            </motion.div>

            {/* Bento Card 2: Stock (Medium) */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: 0.1 }}
              className={`${styles.bentoCard} ${styles.cardMedium}`}
            >
              <div className={styles.fakeUiBox}>
                <div className={styles.fakeReceipt}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className={styles.fakeLine} style={{ width: "80px", background: "#d1d5db" }} />
                    <div className={styles.fakeLine} style={{ width: "120px" }} />
                  </div>
                  <div style={{ fontWeight: 800 }}>$1,200</div>
                </div>
              </div>
              <h3 className={styles.cardTitle}>Ventas Rápidas</h3>
              <p className={styles.cardDesc}>Sistema de punto de venta (POS) optimizado para rapidez. Escanea códigos, emite tickets y descuenta stock al instante.</p>
            </motion.div>

            {/* Bento Card 3: Reparaciones (Wide) */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: 0.2 }}
              className={`${styles.bentoCard} ${styles.cardWide}`}
            >
              <div style={{ flex: 1 }}>
                <h3 className={styles.cardTitle}>Gestión de Reparaciones</h3>
                <p className={styles.cardDesc}>
                  Olvídate de los cuadernos. Ingresa el equipo, detalla la falla, asigna repuestos del inventario y el sistema notificará a tu cliente automáticamente por WhatsApp cuando el equipo esté listo para retirar.
                </p>
              </div>
              <div className={styles.fakeUiBox} style={{ flex: 1, marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div className={styles.fakeAvatar} style={{ background: '#3b82f6' }}>WP</div>
                  <div>
                    <div className={styles.fakeLine} style={{ width: "140px", marginBottom: "6px" }} />
                    <div className={styles.fakeLine} style={{ width: "80px", background: "#d1d5db" }} />
                  </div>
                </div>
                <div className={styles.fakeReceipt} style={{ background: '#dcf8c6', borderRadius: '12px 12px 12px 0' }}>
                  <span style={{ fontSize: '13px', color: '#111' }}>¡Hola! Tu iPhone 13 Pro ya está reparado y listo para retirar. 🚀</span>
                </div>
              </div>
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
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={styles.stepCard}
            >
              <div className={styles.stepNum}>1</div>
              <h3 className={styles.cardTitle}>Crea tu cuenta</h3>
              <p className={styles.cardDesc}>Regístrate en menos de un minuto. Configura tu tienda, sucursales y empleados con sus permisos.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className={styles.stepCard}
            >
              <div className={styles.stepNum}>2</div>
              <h3 className={styles.cardTitle}>Carga tu stock</h3>
              <p className={styles.cardDesc}>Importa tus productos, accesorios y repuestos fácilmente. Genera e imprime códigos de barras.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className={styles.stepCard}
            >
              <div className={styles.stepNum}>3</div>
              <h3 className={styles.cardTitle}>Comienza a vender</h3>
              <p className={styles.cardDesc}>Registra ventas y reparaciones. El sistema hará el trabajo duro y calculará tus métricas.</p>
            </motion.div>
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
          
          <div className={styles.testGrid} style={{ marginTop: '60px' }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className={styles.testCard}
            >
              <div className={styles.testStars}>★★★★★</div>
              <p className={styles.testQuote}>"Antes perdíamos repuestos y no sabíamos cuánto ganábamos realmente. Con Stackr, la caja siempre cuadra y mis empleados saben qué hacer."</p>
              <div className={styles.testAuthor}>
                <div className={styles.testAvatar}>👨🏻‍🔧</div>
                <div className={styles.authorInfo}>
                  <h4>Carlos M.</h4>
                  <p>Dueño, FixMobile Center</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className={styles.testCard}
            >
              <div className={styles.testStars}>★★★★★</div>
              <p className={styles.testQuote}>"La función para avisarle a los clientes por WhatsApp que su celular está listo es un game-changer. Quedamos súper profesionales."</p>
              <div className={styles.testAuthor}>
                <div className={styles.testAvatar}>👩🏽‍💻</div>
                <div className={styles.authorInfo}>
                  <h4>Mariana V.</h4>
                  <p>Gerente, iStore Fix</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className={styles.testCard}
            >
              <div className={styles.testStars}>★★★★★</div>
              <p className={styles.testQuote}>"Manejo mis 3 sucursales desde el sillón de mi casa. Veo en vivo las ventas y el stock disponible sin tener que llamar a nadie."</p>
              <div className={styles.testAuthor}>
                <div className={styles.testAvatar}>👨🏼‍💼</div>
                <div className={styles.authorInfo}>
                  <h4>Julián R.</h4>
                  <p>CEO, Cellular Point</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className={styles.pricing}>
        <div className={styles.pricingGrid}>
          {/* Left Column: Pricing Card */}
          <motion.div 
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', bounce: 0.3 }}
            className={styles.pricingCard}
          >
            <div className={styles.pricingBadge}>Licencia de por vida</div>
            <div className={styles.price}>$400</div>
            <p className={styles.priceDesc}>pago único (USD)</p>

            <div className={styles.pricingFeatures}>
              <div className={styles.pricingFeature}>
                <CheckCircle2 color="#10b981" size={24} />
                <span>Gestión de sucursales ilimitadas</span>
              </div>
              <div className={styles.pricingFeature}>
                <CheckCircle2 color="#10b981" size={24} />
                <span>Usuarios y empleados ilimitados</span>
              </div>
              <div className={styles.pricingFeature}>
                <CheckCircle2 color="#10b981" size={24} />
                <span>Actualizaciones de por vida gratis</span>
              </div>
              <div className={styles.pricingFeature}>
                <CheckCircle2 color="#10b981" size={24} />
                <span>Soporte prioritario por WhatsApp</span>
              </div>
            </div>

            <Link href="/onboarding" className={styles.primaryBtn} style={{ width: '100%', justifyContent: 'center' }}>
              Obtener Stackr Ahora
              <ArrowRight size={18} />
            </Link>
          </motion.div>

          {/* Right Column: The Manifesto */}
          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={styles.manifestoBox}
          >
            <h2 className={styles.manifestoTitle}>
              ¿Por qué no hay mensualidad?<br/>(Y cómo nos mantenemos)
            </h2>
            <p className={styles.manifestoText}>
              A la mayoría de los dueños les duele pagar mensualidades abusivas, pero al mismo tiempo se preguntan: <em>"Si no cobran por mes, ¿cómo pagan los servidores y mantienen el sistema funcionando?"</em>
            </p>
            <p className={styles.manifestoText}>
              El secreto es que Stackr está construido con <strong>tecnología extremadamente eficiente</strong>. No gastamos fortunas en oficinas, ni en enormes equipos de marketing. Mantenemos nuestros costos bajos para trasladarte ese ahorro.
            </p>
            <p className={styles.manifestoText}>
              Tu pago único de $400 USD cubre holgadamente los costos de tus servidores a largo plazo y nos deja un margen justo. <span className={styles.manifestoHighlight}>Nuestro negocio crece sumando nuevos clientes felices</span>, no exprimiendo a los que ya confiaron en nosotros.
            </p>

            <div className={styles.manifestoAuthor}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px' }}>JP</div>
              <div>
                <h4>Juan Pedro Nielsen</h4>
                <p>Fundador de Stackr</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.bottomCta}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className={styles.heroContent} style={{ margin: "0 auto" }}
        >
          <h2 className={styles.sectionTitle}>
            El software que se paga solo
          </h2>
          <p className={styles.sectionDesc}>
            Con evitar perder un repuesto o cobrar mal una reparación, recuperas tu inversión. Únete a las tiendas más exitosas.
          </p>
          <div className={styles.checkList}>
            <div className={styles.checkItem}>
              <CheckCircle2 size={24} color="#10b981" />
              <span>Pago único de $400 USD</span>
            </div>
            <div className={styles.checkItem}>
              <CheckCircle2 size={24} color="#10b981" />
              <span>Prueba completa gratis por 48hs</span>
            </div>
            <div className={styles.checkItem}>
              <CheckCircle2 size={24} color="#10b981" />
              <span>Sin mensualidades, jamás</span>
            </div>
          </div>
          <Link href="/onboarding" className={styles.primaryBtn} style={{ display: "inline-flex" }}>
            Comenzar mi prueba de 48hs
            <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Stackr. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
