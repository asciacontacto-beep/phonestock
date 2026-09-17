import type { Metadata } from "next";
import { RECURSOS, ESTADOS_REPARACION_API } from "@/utils/api/recursos";
import { SCOPES } from "@/utils/api/compartido";

export const metadata: Metadata = {
  title: "API — Stackr",
  description: "Documentación de la API de Stackr para integrar tu local con otros sistemas.",
};

/*
 * Pública a propósito: la lee el programador de un cliente, que no tiene
 * cuenta en Stackr. Los recursos y permisos salen de las mismas definiciones
 * que usa la API, así la documentación no puede quedar desactualizada.
 */

const NOMBRES: Record<string, string> = {
  stock: "Equipos en inventario",
  ventas: "Ventas registradas",
  clientes: "Clientes",
  reparaciones: "Órdenes de servicio técnico",
  accesorios: "Accesorios",
  depositos: "Depósitos y sucursales",
};

const s = {
  page: { maxWidth: 860, margin: "0 auto", padding: "56px 24px 96px", fontFamily: "Inter, system-ui, sans-serif", color: "#18181b", lineHeight: 1.65 } as const,
  h1: { fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 8px" } as const,
  h2: { fontSize: 22, fontWeight: 750, letterSpacing: "-0.02em", margin: "48px 0 12px", paddingTop: 24, borderTop: "1px solid #e4e4e7" } as const,
  h3: { fontSize: 16, fontWeight: 700, margin: "28px 0 8px" } as const,
  p: { margin: "0 0 12px", color: "#3f3f46" } as const,
  pre: { background: "#0a0a0b", color: "#e4e4e7", padding: 16, borderRadius: 12, overflowX: "auto", fontSize: 13, lineHeight: 1.55, margin: "0 0 16px" } as const,
  code: { background: "#f4f4f5", padding: "1px 6px", borderRadius: 5, fontSize: "0.9em" } as const,
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14, margin: "0 0 16px" } as const,
  th: { textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #d4d4d8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#71717a" } as const,
  td: { padding: "8px 10px", borderBottom: "1px solid #f4f4f5", verticalAlign: "top" } as const,
  aviso: { background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 12, padding: "12px 16px", margin: "0 0 16px", fontSize: 14 } as const,
};

const C = ({ children }: { children: React.ReactNode }) => <code style={s.code}>{children}</code>;

export default function ApiDocsPage() {
  return (
    <main style={s.page}>
      <h1 style={s.h1}>Stackr API</h1>
      <p style={s.p}>Versión 1. Leé y cargá datos de tu local desde otros sistemas: tu web, un catálogo, tu contador o una integración propia.</p>

      <h2 style={s.h2}>Autenticación</h2>
      <p style={s.p}>
        Cada pedido lleva una clave en el header <C>Authorization</C>. Las claves las crea el dueño del negocio en{" "}
        <strong>Configuración → API</strong>, con los permisos que elija, y se pueden revocar en cualquier momento.
      </p>
      <pre style={s.pre}>{`curl https://stackrarg.vercel.app/api/v1/stock \\
  -H "Authorization: Bearer stk_live_..."`}</pre>
      <div style={s.aviso}>
        <strong>Usá la clave sólo desde un servidor.</strong> Si la ponés en el JavaScript de una página web, cualquiera que la
        abra puede leerla y usarla con todos sus permisos. Por eso la API no acepta pedidos hechos desde el JavaScript de otra web.
      </div>

      <h2 style={s.h2}>Permisos</h2>
      <p style={s.p}>Dale a cada clave sólo lo que necesita. Una web que muestra el catálogo no necesita ver costos ni clientes.</p>
      <table style={s.table}>
        <thead><tr><th style={s.th}>Permiso</th><th style={s.th}>Qué habilita</th></tr></thead>
        <tbody>
          {Object.entries(SCOPES).map(([k, v]) => (
            <tr key={k}><td style={s.td}><C>{k}</C></td><td style={s.td}>{v}</td></tr>
          ))}
        </tbody>
      </table>
      <p style={s.p}>
        Sin <C>costs:read</C>, las respuestas no incluyen costos (<C>cost_price</C>, <C>cost</C>, <C>labor_cost</C>), tampoco dentro de los
        accesorios de una venta.
      </p>

      <h2 style={s.h2}>Endpoints</h2>
      <table style={s.table}>
        <thead><tr><th style={s.th}>Método</th><th style={s.th}>Ruta</th><th style={s.th}>Qué hace</th></tr></thead>
        <tbody>
          <tr><td style={s.td}><C>GET</C></td><td style={s.td}><C>/api/v1/:recurso</C></td><td style={s.td}>Lista, con filtros y paginación</td></tr>
          <tr><td style={s.td}><C>GET</C></td><td style={s.td}><C>/api/v1/:recurso/:id</C></td><td style={s.td}>Un registro</td></tr>
          <tr><td style={s.td}><C>POST</C></td><td style={s.td}><C>/api/v1/:recurso</C></td><td style={s.td}>Crea (sólo recursos editables)</td></tr>
          <tr><td style={s.td}><C>PATCH</C></td><td style={s.td}><C>/api/v1/:recurso/:id</C></td><td style={s.td}>Edita los campos enviados</td></tr>
        </tbody>
      </table>
      <p style={s.p}>La API no permite borrar: una baja equivocada desde una integración no tiene vuelta. Hacelo desde la app.</p>

      <h3 style={s.h3}>Paginación y filtros comunes</h3>
      <table style={s.table}>
        <tbody>
          <tr><td style={s.td}><C>limite</C></td><td style={s.td}>Cantidad por página. Por defecto 50, máximo 200.</td></tr>
          <tr><td style={s.td}><C>offset</C></td><td style={s.td}>Desde qué registro empezar.</td></tr>
          <tr><td style={s.td}><C>q</C></td><td style={s.td}>Búsqueda de texto (donde se indica).</td></tr>
          <tr><td style={s.td}><C>desde</C> / <C>hasta</C></td><td style={s.td}>Rango de fechas, formato <C>2026-09-01</C> (donde se indica).</td></tr>
        </tbody>
      </table>
      <pre style={s.pre}>{`GET /api/v1/stock?estado=available&marca=Apple&limite=20

{
  "data": [ { "id": 812, "brand": "Apple", "model": "iPhone 15 Pro Max", "price": 950, "currency": "USD", ... } ],
  "paginacion": { "total": 37, "limite": 20, "offset": 0 }
}`}</pre>

      <h2 style={s.h2}>Recursos</h2>
      {Object.entries(RECURSOS).map(([nombre, r]) => (
        <section key={nombre}>
          <h3 style={s.h3}><C>{nombre}</C> — {NOMBRES[nombre]}</h3>
          <table style={s.table}>
            <tbody>
              <tr><td style={{ ...s.td, width: 180 }}>Leer</td><td style={s.td}><C>{r.scopeLeer}</C></td></tr>
              <tr><td style={s.td}>Escribir</td><td style={s.td}>{r.scopeEscribir ? <C>{r.scopeEscribir}</C> : "Sólo lectura"}</td></tr>
              {Object.keys(r.filtros).length > 0 && (
                <tr><td style={s.td}>Filtros</td><td style={s.td}>{Object.keys(r.filtros).map(f => <C key={f}>{f}</C>).reduce((a, b) => <>{a} {b}</>)}</td></tr>
              )}
              {r.columnaBusqueda && <tr><td style={s.td}>Búsqueda <C>q</C></td><td style={s.td}>por <C>{r.columnaBusqueda}</C></td></tr>}
              {r.columnaFecha && <tr><td style={s.td}>Fechas</td><td style={s.td}><C>desde</C> y <C>hasta</C></td></tr>}
              {r.escribiblesAlCrear && (
                <tr><td style={s.td}>Campos al crear</td><td style={s.td}>
                  {r.escribiblesAlCrear.map(c => (
                    <C key={c}>{c}{r.obligatoriosAlCrear?.includes(c) ? "*" : ""}</C>
                  )).reduce((a, b) => <>{a} {b}</>)}
                </td></tr>
              )}
              {r.escribiblesAlEditar && (
                <tr><td style={s.td}>Campos al editar</td><td style={s.td}>
                  {r.escribiblesAlEditar.map(c => <C key={c}>{c}</C>).reduce((a, b) => <>{a} {b}</>)}
                </td></tr>
              )}
            </tbody>
          </table>
        </section>
      ))}
      <p style={s.p}>* obligatorio. Cualquier otro campo enviado se ignora.</p>

      <h2 style={s.h2}>Lo que la API no hace, y por qué</h2>
      <table style={s.table}>
        <tbody>
          <tr>
            <td style={{ ...s.td, width: 220 }}><strong>Registrar ventas</strong></td>
            <td style={s.td}>Vender mueve el stock, la caja, los accesorios, el cliente y la rentabilidad a la vez. Por API quedaría a medias. Los equipos se crean siempre como disponibles y su estado no se puede cambiar.</td>
          </tr>
          <tr>
            <td style={s.td}><strong>Entregar reparaciones</strong></td>
            <td style={s.td}>Entregar con saldo pendiente cobra ese saldo a caja. Estados permitidos por API: {ESTADOS_REPARACION_API.map(e => <C key={e}>{e}</C>).reduce((a, b) => <>{a} {b}</>)}.</td>
          </tr>
          <tr>
            <td style={s.td}><strong>Costo de reparaciones</strong></td>
            <td style={s.td}>Se calcula solo, de los repuestos usados más la mano de obra.</td>
          </tr>
          <tr>
            <td style={s.td}><strong>Código de desbloqueo</strong></td>
            <td style={s.td}>El código del celular del cliente que se anota en la orden nunca sale por la API, con ningún permiso.</td>
          </tr>
        </tbody>
      </table>

      <h2 style={s.h2}>Errores</h2>
      <pre style={s.pre}>{`{ "error": { "codigo": "sin_permiso", "mensaje": "Esta clave no tiene el permiso \\"costs:read\\"." } }`}</pre>
      <table style={s.table}>
        <thead><tr><th style={s.th}>Estado</th><th style={s.th}>Cuándo</th></tr></thead>
        <tbody>
          <tr><td style={s.td}><C>400</C></td><td style={s.td}>Faltan campos, valor inválido, JSON mal formado, fecha inválida</td></tr>
          <tr><td style={s.td}><C>401</C></td><td style={s.td}>Sin clave, clave inválida o revocada</td></tr>
          <tr><td style={s.td}><C>403</C></td><td style={s.td}>La clave no tiene el permiso, o su dueño ya no es dueño del negocio</td></tr>
          <tr><td style={s.td}><C>404</C></td><td style={s.td}>El registro no existe o no es de tu negocio</td></tr>
          <tr><td style={s.td}><C>405</C></td><td style={s.td}>Recurso de sólo lectura, o intento de borrar</td></tr>
          <tr><td style={s.td}><C>409</C></td><td style={s.td}>Ese IMEI ya está en el inventario disponible</td></tr>
        </tbody>
      </table>

      <h2 style={s.h2}>Ejemplos</h2>
      <h3 style={s.h3}>Cargar un equipo</h3>
      <pre style={s.pre}>{`curl -X POST https://stackrarg.vercel.app/api/v1/stock \\
  -H "Authorization: Bearer stk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "brand": "Apple", "model": "iPhone 13", "storage": "128GB", "color": "Azul",
    "imei": "351234567890123", "condition": "used", "battery": "88%",
    "price": 520, "cost_price": 410, "currency": "USD", "deposit": 1
  }'`}</pre>

      <h3 style={s.h3}>Ventas del mes</h3>
      <pre style={s.pre}>{`curl "https://stackrarg.vercel.app/api/v1/ventas?desde=2026-09-01&hasta=2026-09-30&limite=200" \\
  -H "Authorization: Bearer stk_live_..."`}</pre>

      <h3 style={s.h3}>Pasar una reparación a "Reparado"</h3>
      <pre style={s.pre}>{`curl -X PATCH https://stackrarg.vercel.app/api/v1/reparaciones/8f2c... \\
  -H "Authorization: Bearer stk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "status": "REPARADO" }'`}</pre>

      <p style={{ ...s.p, marginTop: 48, fontSize: 13, color: "#71717a" }}>
        Todo lo que se crea o edita por API queda registrado en el historial de cambios del negocio, con el nombre de la clave que lo hizo.
      </p>
    </main>
  );
}
