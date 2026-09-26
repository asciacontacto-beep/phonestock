import { eventoMeta } from '@/utils/metaPixel'

/* El que toca "Probar gratis" no tiene cuenta: el login abre directo en el
   alta. Cada toque se cuenta en el píxel para que Meta sepa qué anuncio trae
   gente con intención y no sólo clics. */
export const REGISTRO = '/login?registro'
export const alProbar = () => eventoMeta('Lead')
export const alEscribir = () => eventoMeta('Contact')
