"use client";

import { useState } from "react";
import { Loader2, Package, CalendarDays, Users, TrendingUp } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { confirmUserEmail } from "@/app/actions";
import { authErrorMessage, isNetworkError } from "@/utils/authErrors";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const FEATURES = [
  { icon: <Package size={15} />, label: "Stock y ventas en tiempo real", color: "c-blue" },
  { icon: <CalendarDays size={15} />, label: "Turnos y reparaciones", color: "c-violet" },
  { icon: <Users size={15} />, label: "Mayoristas y cuentas corrientes", color: "c-green" },
  { icon: <TrendingUp size={15} />, label: "Rentabilidad por equipo y vendedor", color: "c-amber" },
];

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleResetPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setError("Ingresá tu email para enviarte el enlace de recuperación."); return; }
    try {
      setLoading(true);
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (resetErr) throw resetErr;
      setError("");
      toast.success("Te enviamos un email para restablecer tu contraseña.");
    } catch (err: any) {
      setError(isNetworkError(err) ? authErrorMessage(err) : err.message || "Error al enviar email de recuperación");
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    if (!cleanEmail || !cleanPassword || (!isLogin && (!name || !orgName))) return;
    if (!isLogin && cleanPassword !== confirmPassword.trim()) { setError("Las contraseñas no coinciden."); return; }

    try {
      setLoading(true);
      setError("");

      if (!isLogin) {
        const { data, error: regErr } = await supabase.auth.signUp({ email: cleanEmail, password: cleanPassword });
        if (regErr) throw regErr;
        if (data.user) {
          const { data: orgId, error: rpcErr } = await supabase.rpc("create_new_tenant", { org_name: orgName, user_name: name });
          if (rpcErr) throw rpcErr;
          await supabase.from("profiles").upsert({ id: data.user.id, name, email, role: "owner", org_id: orgId, initials: name.substring(0, 2).toUpperCase(), color: "#f59e0b" });

          /* Si llegó por el link de otro local, queda registrado quién lo trajo.
             Nunca frena el alta: si falla, la cuenta se crea igual. */
          try {
            const ref = localStorage.getItem("stackr_ref");
            if (ref && orgId) {
              await supabase.rpc("set_referral", { p_org_id: orgId, p_code: ref });
              localStorage.removeItem("stackr_ref");
            }
          } catch { /* noop */ }

          router.push("/dashboard");
        }
      } else {
        const { data, error: authErr } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword });
        if (authErr) throw authErr;
        if (data.user) { router.push("/dashboard"); router.refresh(); }
      }
    } catch (err: any) {
      // Una falla de red no es un problema de credenciales: cortar acá evita
      // que el usuario vea el "Load failed" crudo del navegador y crea que se
      // equivocó de contraseña.
      if (isNetworkError(err)) { setError(authErrorMessage(err)); return; }

      const raw: string = err?.message || "";
      let msg = authErrorMessage(err);
      if (raw.includes("User already registered")) { setIsLogin(true); msg = "Este email ya tiene una cuenta. Ingresá tu contraseña para continuar."; }
      else if (raw.toLowerCase().includes("email not confirmed")) {
        try {
          const result = await confirmUserEmail(cleanEmail);
          if (result.success) {
            const { data, error: retryErr } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword });
            if (retryErr) throw retryErr;
            if (data.user) { router.push("/dashboard"); router.refresh(); setLoading(false); return; }
          } else { msg = result.error || "Error al confirmar cuenta."; }
        } catch { msg = "Error al confirmar cuenta. Contactá al administrador."; }
      }
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* Los mismos tokens que la landing. El login es el puente entre las
           dos: el que acaba de leer la promesa entra por acá, y si le habla
           con otra voz y otros colores siente que entró a otro producto. */
        .lp-root {
          --tinta:     #08090a;
          --tinta-2:   #0e1012;
          --hueso:     #e9e5db;
          --hueso-dim: rgba(233, 229, 219, 0.55);
          --hueso-dim2:rgba(233, 229, 219, 0.35);
          --oro:       #d9a441;
          --verde:     #6ee7a8;
          display: flex;
          min-height: 100vh;
          font-family: 'Inter', system-ui, sans-serif;
          background: #fff;
        }

        /* ── Left panel ── */
        .lp-left {
          flex: 1;
          background: var(--tinta);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 52px 60px;
          position: relative;
          overflow: hidden;
        }

        .lp-left-bg {
          position: absolute;
          inset: 0;
          /* Oro y verde, como la landing. El azul y el violeta de antes eran
             de otra identidad. */
          background:
            radial-gradient(ellipse 70% 50% at 18% 18%, rgba(217,164,65,0.10) 0%, transparent 62%),
            radial-gradient(ellipse 60% 45% at 85% 85%, rgba(110,231,168,0.055) 0%, transparent 65%);
          background-size: auto, auto;
          pointer-events: none;
        }

        .lp-left-inner { position: relative; z-index: 1; }

        /* La entrada va por CSS y no por JavaScript. Con la animación por JS
           el contenido arranca en opacidad 0 y la sube el script: el DOM
           queda bien pero el compositor no siempre repinta, y la pantalla
           puede quedarse en blanco. Ya pasó en la landing. */
        @keyframes lpSubir {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: none; }
        }
        .lp-entra { animation: lpSubir .75s cubic-bezier(.22,1,.36,1) both; }
        .lp-d1 { animation-delay: .06s; }
        .lp-d2 { animation-delay: .14s; }
        @media (prefers-reduced-motion: reduce) { .lp-entra { animation: none; } }

        .lp-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 64px;
          text-decoration: none;
        }
        .lp-brand-name {
          font-size: 19px;
          font-weight: 600;
          color: var(--hueso);
          letter-spacing: -0.035em;
        }
        .lp-glifo { display: block; flex-shrink: 0; color: var(--hueso); opacity: .92; }

        .lp-headline {
          font-size: clamp(30px, 3.2vw, 46px);
          font-weight: 700;
          color: var(--hueso);
          letter-spacing: -0.042em;
          line-height: 1.02;
          margin-bottom: 20px;
        }
        .lp-headline span { color: var(--hueso-dim2); }

        .lp-sub {
          font-size: 15.5px;
          color: var(--hueso-dim);
          line-height: 1.7;
          margin-bottom: 48px;
          max-width: 400px;
        }

        .lp-features {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .lp-feature {
          display: flex;
          align-items: center;
          gap: 12px;
          color: rgba(255,255,255,0.6);
          font-size: 14px;
          font-weight: 500;
        }

        .lp-feature-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: rgba(255,255,255,0.5);
        }

        /* Borde superior de luz (efecto vidrio), como el hero del dashboard */
        .lp-left::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
          z-index: 2;
        }

        /* Un solo color para los cuatro. Cuatro colores distintos en cuatro
           íconos seguidos se leen como semáforo, no como marca. */
        .lp-feature-icon.c-blue,
        .lp-feature-icon.c-violet,
        .lp-feature-icon.c-green,
        .lp-feature-icon.c-amber {
          background: rgba(233,229,219,0.05);
          border-color: rgba(233,229,219,0.12);
          color: var(--hueso-dim);
        }

        .lp-testimonial {
          margin-top: 40px;
          padding: 18px 20px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          max-width: 400px;
        }
        .lp-testimonial-quote { font-size: 14px; color: rgba(233,229,219,0.8); line-height: 1.65; }
        .lp-testimonial-author { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 10px; font-weight: 500; }

        .lp-trust-row {
          display: flex; gap: 20px; flex-wrap: wrap;
          margin-top: 26px;
        }
        .lp-trust-item { display: flex; align-items: center; gap: 7px; color: var(--hueso-dim); font-size: 12.5px; font-weight: 500; }
        .lp-trust-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--verde); }

        .lp-cta-note {
          text-align: center; margin-top: 14px;
          font-size: 12px; color: #9ca3af; line-height: 1.5;
        }

        .lp-left-footer {
          position: relative;
          z-index: 1;
          font-size: 12px;
          color: rgba(255,255,255,0.2);
        }

        /* ── Right panel ── */
        .lp-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 40px;
          background: #fafafa;
        }

        .lp-form-wrap {
          width: 100%;
          max-width: 400px;
        }

        .lp-form-head {
          margin-bottom: 32px;
        }

        .lp-form-title {
          font-size: 26px;
          font-weight: 800;
          color: #000;
          letter-spacing: -0.03em;
          margin-bottom: 6px;
        }

        .lp-form-sub {
          font-size: 14px;
          color: #888;
        }

        .lp-form-card {
          background: #fff;
          border-radius: 20px;
          padding: 32px;
          border: 1px solid rgba(0,0,0,0.07);
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
        }

        .lp-field { margin-bottom: 18px; }
        .lp-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 7px;
        }
        .lp-input {
          width: 100%;
          padding: 13px 15px;
          border: 1.5px solid #e5e7eb;
          border-radius: 11px;
          font-size: 15px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          background: #fff;
          color: #111;
          font-family: inherit;
        }
        .lp-input::placeholder { color: #b0b7c3; }
        .lp-input:focus {
          border-color: #111;
          box-shadow: 0 0 0 3px rgba(0,0,0,0.06);
        }

        .lp-forgot {
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          transition: color 0.15s;
        }
        .lp-forgot:hover { color: #555; }

        .lp-submit {
          width: 100%;
          padding: 14px;
          background: #000;
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: opacity 0.15s, transform 0.1s;
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .lp-submit:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .lp-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .lp-toggle {
          text-align: center;
          margin-top: 24px;
          font-size: 13px;
          color: #9ca3af;
        }
        .lp-toggle button {
          background: none;
          border: none;
          color: #111;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .lp-error {
          background: #fef2f2;
          border: 1px solid rgba(239,68,68,0.2);
          color: #b91c1c;
          font-size: 13px;
          border-radius: 9px;
          padding: 10px 14px;
          margin-bottom: 16px;
          line-height: 1.5;
        }

        /* ── Mobile header (hidden on desktop) ── */
        .lp-mobile-top {
          display: none;
          background: transparent;
          padding: 34px 24px 4px;
          text-align: center;
        }
        .lp-mobile-brand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .lp-mobile-name {
          font-size: 20px;
          font-weight: 600;
          color: var(--hueso);
          letter-spacing: -0.035em;
        }
        .lp-mobile-tagline {
          font-size: 14px;
          color: var(--hueso-dim);
          line-height: 1.5;
          max-width: 300px;
          margin: 0 auto;
        }
        /* La franja de confianza que en escritorio vive en el panel
           izquierdo. En mobile no estaba y el formulario quedaba solo. */
        .lp-mobile-trust {
          display: none;
          gap: 18px;
          justify-content: center;
          flex-wrap: wrap;
          padding: 18px 20px 26px;
          font-size: 12px;
          color: var(--hueso-dim2);
        }
        .lp-mobile-trust span { display: flex; align-items: center; gap: 6px; }
        .lp-mobile-trust i {
          width: 4px; height: 4px; border-radius: 50%;
          background: var(--verde); display: block;
        }

        /* ── Responsive ── */
        /* ── Mobile ──────────────────────────────────────────────────────
           Todo oscuro, sin tarjeta. La primera versión ponía el formulario
           en un bloque crema sobre el fondo negro: se leía como un papel
           pegado encima, y los campos blancos adentro del crema quedaban
           sucios. Acá los campos son oscuros con borde de un pelo, como en
           la landing, y el único elemento claro es el botón — que es
           justamente lo que hay que tocar. */
        @media (max-width: 900px) {
          .lp-root {
            flex-direction: column;
            background: var(--tinta);
            min-height: 100svh;
          }
          .lp-left { display: none; }
          .lp-mobile-top { display: block; }

          .lp-right {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 0 22px 24px;
            background: transparent;
          }
          .lp-form-wrap { width: 100%; max-width: 420px; margin: 0 auto; }

          .lp-form-card {
            background: transparent;
            border: none;
            box-shadow: none;
            padding: 0;
          }

          .lp-form-head { text-align: center; margin-bottom: 26px; }
          .lp-form-title { color: var(--hueso); font-size: 26px; letter-spacing: -0.035em; }
          .lp-form-sub { color: var(--hueso-dim); }

          .lp-label { color: var(--hueso-dim); }
          .lp-forgot { color: var(--hueso-dim2); }

          .lp-input {
            padding: 15px 16px;
            font-size: 16px; /* evita el zoom de iOS */
            background: var(--tinta-2);
            border: 1px solid rgba(233,229,219,0.12);
            border-radius: 13px;
            color: var(--hueso);
          }
          .lp-input::placeholder { color: rgba(233,229,219,0.28); }
          .lp-input:focus {
            border-color: rgba(233,229,219,0.34);
            background: #12151800;
            box-shadow: none;
          }

          /* El único elemento claro de la pantalla es lo que hay que tocar. */
          .lp-submit {
            background: var(--hueso);
            color: var(--tinta);
            border-radius: 13px;
            padding: 15px;
            font-weight: 700;
          }

          .lp-toggle { color: var(--hueso-dim); margin-top: 22px; }
          .lp-toggle button { color: var(--hueso); }
          .lp-cta-note { color: var(--hueso-dim2); }
          .lp-mobile-trust { display: flex; }
        }
      `}</style>

      <div className="lp-root">

        {/* Mobile top bar */}
        <div className="lp-mobile-top">
          <div className="lp-mobile-brand">
            <svg className="lp-glifo" width="16" height="16" viewBox="0 0 17 17" fill="none" aria-hidden>
              <rect y="1.5" width="17" height="3" rx="1.5" fill="currentColor" />
              <rect y="7" width="12" height="3" rx="1.5" fill="currentColor" opacity=".7" />
              <rect y="12.5" width="7" height="3" rx="1.5" fill="currentColor" opacity=".45" />
            </svg>
            <span className="lp-mobile-name">Stackr</span>
          </div>
          <div className="lp-mobile-tagline">Sabé exactamente cuánto ganás con cada equipo</div>
        </div>

        {/* Left panel */}
        <div className="lp-left">
          <div className="lp-left-bg" />

          <div className="lp-left-inner">
            <Link href="/" className="lp-brand">
              <svg className="lp-glifo" width="19" height="19" viewBox="0 0 17 17" fill="none" aria-hidden>
                <rect y="1.5" width="17" height="3" rx="1.5" fill="currentColor" />
                <rect y="7" width="12" height="3" rx="1.5" fill="currentColor" opacity=".7" />
                <rect y="12.5" width="7" height="3" rx="1.5" fill="currentColor" opacity=".45" />
              </svg>
              <span className="lp-brand-name">Stackr</span>
            </Link>

            <div className="lp-entra lp-d1">
              <h1 className="lp-headline">
                Sabé exactamente<br />cuánto ganás<br />
                <span>con cada equipo.</span>
              </h1>
              <p className="lp-sub">
                Stock, ventas, reparaciones, cuenta corriente y caja. El sistema para locales
                de celulares que te dice el número real, no el que parece.
              </p>

              <div className="lp-features">
                {FEATURES.map(f => (
                  <div key={f.label} className="lp-feature">
                    <div className={`lp-feature-icon ${f.color}`}>{f.icon}</div>
                    {f.label}
                  </div>
                ))}
              </div>

              <div className="lp-testimonial">
                <div className="lp-testimonial-quote">“Desde que uso Stackr sé exactamente cuánto gano con cada equipo. Dejé las planillas y no vuelvo más.”</div>
                <div className="lp-testimonial-author">— Dueño de local, Buenos Aires</div>
              </div>

              <div className="lp-trust-row">
                <div className="lp-trust-item"><span className="lp-trust-dot" /> $50.000 por mes, sin permanencia</div>
                <div className="lp-trust-item"><span className="lp-trust-dot" /> Tus datos, siempre tuyos</div>
                <div className="lp-trust-item"><span className="lp-trust-dot" /> Soporte en español</div>
              </div>
            </div>
          </div>

          <div className="lp-left-footer">Stackr · Hecho en Argentina 🇦🇷</div>
        </div>

        {/* Right panel */}
        <div className="lp-right">
          <div className="lp-form-wrap lp-entra lp-d2">
            <div className="lp-form-head">
              <div className="lp-form-title">
                {isLogin ? "Bienvenido de nuevo" : "Creá tu cuenta"}
              </div>
              <div className="lp-form-sub">
                {isLogin ? "Ingresá tus credenciales para continuar." : "Completá tus datos para empezar la prueba gratis."}
              </div>
            </div>

            <div className="lp-form-card">
              <form onSubmit={handleSubmit}>
                <AnimatePresence initial={false}>
                  {!isLogin && (
                    <motion.div
                      key="register-fields"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="lp-field">
                        <label className="lp-label">Nombre del negocio</label>
                        <input className="lp-input" type="text" placeholder="Ej. TecnoFix Center" value={orgName} onChange={e => setOrgName(e.target.value)} required={!isLogin} />
                      </div>
                      <div className="lp-field">
                        <label className="lp-label">Tu nombre</label>
                        <input className="lp-input" type="text" placeholder="Ej. Juan Pérez" value={name} onChange={e => setName(e.target.value)} required={!isLogin} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="lp-field">
                  <label className="lp-label">Email</label>
                  <input className="lp-input" type="email" placeholder="nombre@empresa.com" value={email} onChange={e => setEmail(e.target.value)} required autoCapitalize="none" autoCorrect="off" spellCheck={false} />
                </div>

                <div className="lp-field" style={{ marginBottom: isLogin ? 8 : 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                    <label className="lp-label" style={{ margin: 0 }}>Contraseña</label>
                    {isLogin && (
                      <button type="button" className="lp-forgot" onClick={handleResetPassword}>
                        ¿Olvidaste tu contraseña?
                      </button>
                    )}
                  </div>
                  <input className="lp-input" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required autoCapitalize="none" autoCorrect="off" />
                </div>

                <AnimatePresence initial={false}>
                  {!isLogin && (
                    <motion.div
                      key="confirm-password"
                      className="lp-field"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <label className="lp-label">Confirmar contraseña</label>
                      <input className="lp-input" type="password" placeholder="Repetí tu contraseña" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required={!isLogin} autoCapitalize="none" autoCorrect="off" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      className="lp-error"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button className="lp-submit" type="submit" disabled={loading}>
                  {loading ? <Loader2 size={18} className="spin" /> : isLogin ? "Ingresar" : "Empezar prueba gratis"}
                </button>

                {!isLogin && (
                  <div className="lp-cta-note">48 horas gratis · Sin tarjeta · Configurás en minutos</div>
                )}
              </form>

              <div className="lp-toggle">
                {isLogin ? "¿No tenés cuenta? " : "¿Ya tenés cuenta? "}
                <button onClick={() => { setIsLogin(!isLogin); setError(""); }}>
                  {isLogin ? "Registrate gratis" : "Ingresá acá"}
                </button>
              </div>
            </div>
          </div>

          <div className="lp-mobile-trust">
            <span><i /> 48 horas gratis</span>
            <span><i /> Sin tarjeta</span>
          </div>
        </div>

      </div>
    </>
  );
}
