import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 60, // Mantiene los módulos en caché por 60s en el cliente
      static: 180,
    },
  },
};

export default nextConfig;
