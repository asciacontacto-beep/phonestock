import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Los tests corren en la hora de los locales, igual que el servidor (ver
// src/instrumentation.ts). Sin esto, los que miran "el día de la venta"
// daban distinto según la máquina: pasaban en Argentina y fallaban en UTC.
process.env.TZ = 'America/Argentina/Buenos_Aires'

export default defineConfig({
  // El mismo "@/..." que usa la app, para poder probar componentes.
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
