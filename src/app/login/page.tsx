"use client";

import { useState } from "react";
import { Smartphone, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
          redirectTo: siteUrl,
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
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-card">
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              width: 40,
              height: 40,
              background: "var(--text)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Smartphone size={20} color="#fff" />
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              marginBottom: 4,
            }}
          >
            {isLogin ? "Bienvenido" : "Crear cuenta"}
          </h1>
          <p style={{ color: "var(--text-2)", fontSize: 14 }}>
            {isLogin
              ? "Ingresá a tu panel de gestión."
              : "Registrá tu negocio en Stackr."}
          </p>
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
              padding: "12px 16px",
              fontSize: 14,
              marginTop: 4,
              borderRadius: "var(--r)",
            }}
            disabled={loading}
            type="submit"
          >
            {loading ? (
              <Loader2 className="spin" size={16} />
            ) : isLogin ? (
              "Iniciar sesión"
            ) : (
              "Crear cuenta"
            )}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <button
            className="btn-ghost"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            style={{ fontSize: 13, color: "var(--text-3)" }}
          >
            {isLogin
              ? "¿Nuevo? Crear cuenta gratis"
              : "Ya tengo cuenta → Ingresar"}
          </button>
        </div>
      </div>
    </div>
  );
}
