"use client";

import { useState } from "react";
import { Smartphone, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { confirmUserEmail } from "@/app/actions";

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
    if (!cleanEmail) {
      setError(
        "Por favor, ingresá tu email para enviarte el enlace de recuperación."
      );
      return;
    }
    try {
      setLoading(true);
      const siteUrl = window.location.origin;

      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo: `${siteUrl}/update-password`,
        }
      );
      if (resetErr) throw resetErr;
      setError("");
      toast.success(
        "Te enviamos un email para restablecer tu contraseña. Revisá tu bandeja de entrada."
      );
    } catch (err: any) {
      setError(err.message || "Error al enviar email de recuperación");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword || (!isLogin && (!name || !orgName)))
      return;

    if (!isLogin && cleanPassword !== confirmPassword.trim()) {
      setError("Las contraseñas no coinciden. Por favor, verificalas.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (!isLogin) {
        // Registro
        const { data, error: regErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
        });
        if (regErr) throw regErr;
        
        if (data.user) {
          // El RPC create_new_tenant se encarga de crear la organización
          const { data: orgId, error: rpcErr } = await supabase.rpc(
            "create_new_tenant",
            {
              org_name: orgName,
              user_name: name,
            }
          );

          if (rpcErr) throw rpcErr;

          await supabase.from("profiles").upsert({
            id: data.user.id,
            name,
            email,
            role: "owner",
            org_id: orgId,
            initials: name.substring(0, 2).toUpperCase(),
            color: "#f59e0b",
          });

          router.push("/dashboard");
        }
      } else {
        // Login
        const { data, error: authErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });
        
        if (authErr) throw authErr;

        if (data.user) {
          router.push("/dashboard");
          router.refresh();
        }
      }
    } catch (err: any) {
      let msg = err.message || "Error en la autenticación";
      if (msg.includes("User already registered")) {
        setIsLogin(true);
        setError(
          "Este email ya tiene una cuenta. Ingresá tu contraseña para continuar."
        );
      } else if (msg.includes("Invalid login credentials")) {
        msg = "Email o contraseña incorrectos.";
      } else if (msg.includes("Password should be at least")) {
        msg = "La contraseña debe tener al menos 6 caracteres.";
      } else if (msg.toLowerCase().includes("email not confirmed")) {
        // Auto-confirm server-side using admin API, then retry login
        try {
          const result = await confirmUserEmail(cleanEmail);
          if (result.success) {
            // Retry login now that email is confirmed
            const { data, error: retryErr } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: cleanPassword,
            });
            if (retryErr) throw retryErr;
            if (data.user) {
              router.push("/dashboard");
              router.refresh();
              setLoading(false);
              return;
            }
          } else {
            msg = result.error || "Error al confirmar cuenta.";
          }
        } catch {
          msg = "Error al confirmar cuenta. Contactá al administrador.";
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <style>{`
        .login-container { display: flex; min-height: 100vh; background: var(--surface); font-family: 'Inter', system-ui, sans-serif; }
        .login-left { flex: 1; background: linear-gradient(135deg, #09090b 0%, #18181b 100%); display: flex; flex-direction: column; justify-content: center; padding: 80px; position: relative; overflow: hidden; }
        .login-right { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; position: relative; background: var(--bg); }
        .mobile-logo { display: none; }
        .glass-panel { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 24px; padding: 32px; backdrop-filter: blur(10px); }
        .feature-item { display: flex; align-items: center; gap: 12px; color: rgba(255, 255, 255, 0.7); font-size: 14px; margin-bottom: 16px; font-weight: 500; }
        .feature-icon { width: 32px; height: 32px; border-radius: 8px; background: rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: center; color: #fff; }
        @media (max-width: 900px) {
          .login-left { display: none; }
          .mobile-logo { display: block; }
          .login-right { padding: 20px; }
        }
      `}</style>

      {/* Left Panel */}
      <div className="login-left">
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '70%', height: '70%', background: 'radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 70%)', borderRadius: '50%' }} />
        
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 480, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 60 }}>
            <div style={{ width: 44, height: 44, background: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(255,255,255,0.1)' }}>
              <Smartphone size={22} color="#000" />
            </div>
            <div style={{ color: '#fff', fontSize: 26, fontWeight: 800, letterSpacing: '-0.04em' }}>Stackr</div>
          </div>
          
          <h1 style={{ color: '#fff', fontSize: 52, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 24 }}>
            El sistema operativo para tu negocio.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18, lineHeight: 1.5, marginBottom: 48 }}>
            Gestioná inventario, ventas, finanzas y reparaciones en una única plataforma ultra-rápida.
          </p>

          <div className="glass-panel">
            <div className="feature-item">
              <div className="feature-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>
              Control de Inventario Multi-Depósito
            </div>
            <div className="feature-item">
              <div className="feature-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg></div>
              Punto de Venta Dinámico
            </div>
            <div className="feature-item" style={{ marginBottom: 0 }}>
              <div className="feature-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg></div>
              Tablero de Servicio Técnico
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel (Form) */}
      <div className="login-right">
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Logo on mobile only */}
          <div className="mobile-logo" style={{ marginBottom: 40 }}>
            <div style={{ width: 44, height: 44, background: 'var(--text)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
              <Smartphone size={22} color="var(--bg)" />
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6 }}>
              {isLogin ? "Iniciar sesión" : "Crear cuenta"}
            </h1>
            <p style={{ color: "var(--text-3)", fontSize: 15 }}>
              {isLogin ? "Ingresá a tu panel de control." : "Registrá tu tienda en segundos."}
            </p>
          </div>

          <div style={{ background: 'var(--surface)', padding: 32, borderRadius: 24, boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
            <h1 className="login-left" style={{ display: 'none' /* hidden logically, just to keep code neat if needed */}}></h1>
            <div style={{ marginBottom: 24, display: 'none' /* We keep this hidden to replace the old header entirely but preserve structure */ }}></div>
            
            <div style={{ textAlign: 'center', marginBottom: 28 }} className="hide-on-mobile">
              <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>{isLogin ? "¡Hola de nuevo!" : "Registrá tu tienda"}</h2>
              <p style={{ color: 'var(--text-3)', fontSize: 14 }}>{isLogin ? "Ingresá tus credenciales para continuar" : "Completá tus datos para empezar"}</p>
            </div>


        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="field">
                <label className="lbl">Nombre del negocio</label>
                <input
                  className="inp"
                  type="text"
                  placeholder="Ej. PhoneMax MDP"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required={!isLogin}
                />
              </div>
              <div className="field">
                <label className="lbl">Tu nombre</label>
                <input
                  className="inp"
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            </>
          )}

          <div className="field">
            <label className="lbl">Email</label>
            <input
              className="inp"
              type="email"
              placeholder="nombre@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
          </div>

          <div className="field">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <label className="lbl" style={{ margin: 0 }}>
                Contraseña
              </label>
              {isLogin && (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-3)",
                    fontSize: 12,
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>
            <input
              className="inp"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          {!isLogin && (
            <div className="field">
              <label className="lbl">Confirmar contraseña</label>
              <input
                className="inp"
                type="password"
                placeholder="Repetí tu contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required={!isLogin}
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
          )}

          {error && (
            <div
              style={{
                color: "var(--red)",
                fontSize: 13,
                marginBottom: 16,
                padding: "10px 14px",
                background: "var(--red-dim)",
                borderRadius: 8,
                lineHeight: 1.4,
              }}
            >
              {error}
            </div>
          )}

          <button
            className="btn btn-dark"
            style={{
              width: "100%",
              padding: "14px 16px",
              fontSize: 15,
              fontWeight: 600,
              marginTop: 12,
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              transition: "transform 0.1s, box-shadow 0.1s"
            }}
            disabled={loading}
            type="submit"
          >
            {loading ? (
              <Loader2 className="spin" size={18} />
            ) : isLogin ? (
              "Ingresar"
            ) : (
              "Crear mi cuenta"
            )}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <button
            className="btn-ghost"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            style={{ fontSize: 14, color: "var(--text-2)", fontWeight: 500 }}
          >
            {isLogin
              ? "¿No tenés cuenta? Registrate gratis"
              : "¿Ya tenés cuenta? Ingresá acá"}
          </button>
        </div>
      </div>
      </div>
      </div>
      <style>{`
        .hide-on-mobile { display: block; }
        @media (max-width: 900px) {
          .hide-on-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}
