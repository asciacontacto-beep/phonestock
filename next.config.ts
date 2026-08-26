import type { NextConfig } from "next";

// Safari bloquea de fábrica las peticiones a otro dominio ("Impedir seguimiento
// entre sitios"), así que el navegador no puede hablar directo con Supabase:
// el login moría sin respuesta. Con esto pide a `/sb/...` de la propia app y el
// servidor lo reenvía. Ver src/utils/supabase/env.ts para el detalle.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
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
