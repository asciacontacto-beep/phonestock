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
    <div className="login-container">
      <style>{`
        body { overflow: auto; background: #000; margin: 0; }
        .login-container { min-height: 100vh; width: 100vw; font-family: 'Inter', system-ui, sans-serif; position: relative; display: flex; align-items: center; justify-content: center; }
        
        /* Animated Dark Mesh Background */
        .mesh-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; z-index: 0; background: #000; }
        @keyframes float1 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(5%, 5%) scale(1.1); } }
        @keyframes float2 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-5%, -5%) scale(0.9); } }
        .blob1 { position: absolute; top: -10%; left: -10%; width: 50vw; height: 50vw; background: radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%); border-radius: 50%; animation: float1 20s ease-in-out infinite; filter: blur(80px); }
        .blob2 { position: absolute; bottom: -20%; right: -10%; width: 60vw; height: 60vw; background: radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%); border-radius: 50%; animation: float2 25s ease-in-out infinite; filter: blur(100px); }
        .blob3 { position: absolute; top: 40%; left: 40%; width: 40vw; height: 40vw; background: radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%); border-radius: 50%; animation: float1 22s ease-in-out infinite reverse; filter: blur(80px); }

        .auth-card { 
          position: relative; z-index: 1; width: 100%; max-width: 440px; margin: 40px 20px;
          background: rgba(25, 25, 25, 0.4); 
          border: 1px solid rgba(255, 255, 255, 0.08); 
          border-radius: 24px; padding: 48px 40px; 
          backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
          box-shadow: 0 30px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1); 
        }

        .auth-inp { 
          width: 100%; padding: 16px 20px; 
          background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); 
          border-radius: 14px; font-size: 15px; color: #fff; 
          outline: none; transition: all 0.2s ease; 
        }
        .auth-inp::placeholder { color: rgba(255,255,255,0.3); }
        .auth-inp:focus { border-color: rgba(255,255,255,0.3); box-shadow: 0 0 0 4px rgba(255,255,255,0.05); }
        .auth-lbl { display: block; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); margin-bottom: 10px; letter-spacing: 0.3px; }

        .submit-btn {
          width: 100%; padding: 16px; font-size: 16px; font-weight: 700;
          margin-top: 24px; border-radius: 14px; background: #ffffff; color: #000000;
          border: none; cursor: pointer; transition: transform 0.1s, box-shadow 0.2s;
          box-shadow: 0 4px 14px rgba(255,255,255,0.15);
        }
        .submit-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255,255,255,0.25); }
        .submit-btn:active { transform: translateY(1px); }
        
        .switch-btn { background: none; border: none; color: rgba(255,255,255,0.5); font-size: 14px; font-weight: 500; cursor: pointer; transition: color 0.2s; padding: 10px; }
        .switch-btn:hover { color: #fff; }
      `}</style>

      <div className="mesh-bg">
        <div className="blob1" />
        <div className="blob2" />
        <div className="blob3" />
      </div>

      <motion.div 
        className="auth-card"
        initial={{ opacity: 0, y: 30, scale: 0.95 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }} 
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}>
            <Smartphone size={32} color="#fff" strokeWidth={1.5} />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12, color: '#fff' }}>
            {isLogin ? "Bienvenido a Stackr" : "Comienza con Stackr"}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
            {isLogin ? "Ingresa a tu terminal de gestión" : "Registra tu tienda en segundos"}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ overflow: 'hidden' }}>
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
            </motion.div>
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

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label className="auth-lbl" style={{ margin: 0 }}>Contraseña</label>
              {isLogin && (
                <button type="button" onClick={handleResetPassword} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
                  ¿Olvidaste tu clave?
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
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ overflow: 'hidden', marginBottom: 24 }}>
              <label className="auth-lbl">Confirmar contraseña</label>
              <input
                className="auth-inp"
                type="password"
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required={!isLogin}
                autoCapitalize="none"
                autoCorrect="off"
              />
            </motion.div>
          )}

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                style={{
                  color: "#fca5a5", fontSize: 14, marginBottom: 20, padding: "12px 16px",
                  background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: 12, lineHeight: 1.4, textAlign: 'center'
                }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button className="submit-btn" disabled={loading} type="submit">
            {loading ? (
              <Loader2 className="spin" size={20} style={{ margin: '0 auto' }} />
            ) : isLogin ? (
              "Ingresar a Stackr"
            ) : (
              "Crear mi cuenta"
            )}
          </button>
        </form>

        <div style={{ marginTop: 32, textAlign: "center" }}>
          <button
            className="switch-btn"
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
          >
            {isLogin
              ? "¿No tienes cuenta? Regístrate aquí"
              : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
