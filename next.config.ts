import type { NextConfig } from "next";
import { readFileSync } from "node:fs";

// Safari bloquea de fábrica las peticiones a otro dominio ("Impedir seguimiento
// entre sitios"), así que el navegador no puede hablar directo con Supabase:
// el login moría sin respuesta. Con esto pide a `/sb/...` de la propia app y el
// servidor lo reenvía. Ver src/utils/supabase/env.ts para el detalle.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Versión que se ve al pie de Configuración: sirve para soporte ("¿qué
// versión ves?"). En Vercel se le suma el commit, para saber qué deploy es.
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };
const commit = (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7);

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: commit ? `${version} · ${commit}` : version,
  },
  experimental: {
    staleTimes: {
      dynamic: 0, // Sin caché de cliente para páginas dinámicas (default Next): datos siempre frescos al navegar (stock, ventas, dashboard reflejan cambios al instante)
      static: 180,
    },
  },
  async rewrites() {
    // Sin la variable no hay a dónde reenviar; la app ya avisa por consola.
    if (!supabaseUrl) return [];
    return [
      {
        source: '/sb/:path*',
        destination: `${supabaseUrl.replace(/\/$/, '')}/:path*`,
      },
    ];
  },
};

export default nextConfig;
