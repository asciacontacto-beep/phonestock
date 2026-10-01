import { defineConfig } from 'vitest/config'

// Los tests corren en la hora de los locales, igual que el servidor (ver
// src/instrumentation.ts). Sin esto, los que miran "el día de la venta"
// daban distinto según la máquina: pasaban en Argentina y fallaban en UTC.
process.env.TZ = 'America/Argentina/Buenos_Aires'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
