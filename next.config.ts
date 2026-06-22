import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 0, // Sin caché de cliente para páginas dinámicas (default Next): datos siempre frescos al navegar (stock, ventas, dashboard reflejan cambios al instante)
      static: 180,
    },
  },
};

export default nextConfig;
