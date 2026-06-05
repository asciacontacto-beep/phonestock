"use client";

import { useState } from "react";
import { Smartphone, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { confirmUserEmail } from "@/app/actions";
import { motion } from "framer-motion";

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
    <div className="login-wrapper">
      <style>{`
        .login-wrapper { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #fafafa; font-family: 'Inter', system-ui, sans-serif; position: relative; overflow: hidden; }
        .bg-grid { position: absolute; inset: 0; background-image: radial-gradient(#d1d5db 1px, transparent 1px); background-size: 24px 24px; opacity: 0.6; z-index: 0; }
        .bg-glow { position: absolute; top: 50%; left: 50%; width: 60vw; height: 60vw; transform: translate(-50%, -50%); background: radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 60%); z-index: 0; pointer-events: none; }
        .login-content { position: relative; z-index: 1; width: 100%; max-width: 440px; padding: 24px; }
        .logo-box { width: 88px; height: 88px; background: #09090b; border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; box-shadow: 0 16px 40px rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.1); }
        .auth-card { background: #ffffff; padding: 48px 40px; border-radius: 28px; box-shadow: 0 12px 48px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.04); }
        .auth-inp { width: 100%; padding: 14px 16px; border: 1px solid #e5e7eb; border-radius: 12px; font-size: 15px; outline: none; transition: all 0.2s ease; background: #fff; color: #111; }
        .auth-inp:focus { border-color: #09090b; box-shadow: 0 0 0 4px rgba(9,9,11,0.05); }
        .auth-lbl { display: block; font-size: 13px; font-weight: 600; color: #4b5563; margin-bottom: 8px; }
        @media (max-width: 480px) {
          .auth-card { padding: 32px 24px; }
        }
      `}</style>

      <div className="bg-grid" />
      <div className="bg-glow" />

      <div className="login-content">
        <motion.div 
          initial={{ y: -30, opacity: 0, scale: 0.95 }} 
          animate={{ y: 0, opacity: 1, scale: 1 }} 
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="logo-box">
            <Smartphone size={44} color="#fff" strokeWidth={1.5} />
          </div>
          <h1 style={{ textAlign: 'center', fontSize: 36, fontWeight: 800, letterSpacing: '-0.04em', color: '#09090b', margin: '0 0 40px 0' }}>
            Stackr
          </h1>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="auth-card">
            <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8, textAlign: 'center', color: '#09090b' }}>
              {isLogin ? "Iniciar sesión" : "Crear tu cuenta"}
            </h2>
            <p style={{ color: '#6b7280', fontSize: 15, textAlign: 'center', marginBottom: 36 }}>
              {isLogin ? "Ingresá tus credenciales para continuar" : "Registrá tu negocio y empezá hoy"}
            </p>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div style={{ marginBottom: 20 }}>
                <label className="auth-lbl">Nombre del negocio</label>
                <input
                  className="auth-inp"
                  type="text"
                  placeholder="Ej. PhoneMax MDP"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required={!isLogin}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="auth-lbl">Tu nombre</label>
                <input
                  className="auth-inp"
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            </>
          )}

          <div style={{ marginBottom: 20 }}>
            <label className="auth-lbl">Email</label>
            <input
              className="auth-inp"
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

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label className="auth-lbl" style={{ margin: 0 }}>
                Contraseña
              </label>
              {isLogin && (
                <button type="button" onClick={handleResetPassword} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>
            <input
              className="auth-inp"
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
            <div style={{ marginBottom: 20 }}>
              <label className="auth-lbl">Confirmar contraseña</label>
              <input
                className="auth-inp"
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
              marginTop: 16,
              borderRadius: "12px",
              background: "#09090b",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              transition: "opacity 0.2s"
            }}
            disabled={loading}
            type="submit"
          >
            {loading ? (
              <Loader2 className="spin" size={18} style={{ margin: '0 auto' }} />
            ) : isLogin ? (
              "Ingresar"
            ) : (
              "Crear mi cuenta"
            )}
          </button>
        </form>

        <div style={{ marginTop: 28, textAlign: "center" }}>
          <button
            className="btn-ghost"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            style={{ fontSize: 14, color: "#6b7280", fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {isLogin
              ? "¿No tenés cuenta? Registrate gratis"
              : "¿Ya tenés cuenta? Ingresá acá"}
          </button>
        </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
