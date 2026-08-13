/**
 * Configuración del recibo. Todo lo que el dueño puede personalizar del
 * comprobante vive acá y se guarda en settings.receipt_config (jsonb).
 * Un único lugar para Settings (editar) y el componente Receipt (renderizar).
 */

export type ReceiptFormat = 'ticket' | 'a4';

export interface ReceiptConfig {
  /** Color de acento (títulos, líneas, total). */
  accent: string;
  /** Ancho de ticket angosto (58/80mm) o comprobante A4. */
  format: ReceiptFormat;

  /** Encabezado sobre el nombre del negocio, ej "COMPROBANTE DE VENTA". */
  headerNote: string;
  /** Mensaje de agradecimiento arriba del pie. */
  thankYouText: string;
  /** Texto libre extra en el pie (además de la garantía). */
  footerText: string;
  /** Garantía por defecto que se precarga en cada recibo. */
  warrantyDefault: string;

  /** Qué secciones mostrar. */
  showLogo: boolean;
  showBusinessDetails: boolean; // dirección, tel, ig, email, web
  showCuit: boolean;
  showSeller: boolean;
  showImei: boolean;
  showPayments: boolean;
  showWarranty: boolean;
  showSignature: boolean;       // línea para firma del cliente
  showFooterBrand: boolean;     // "Generado con Stackr"
}

export const DEFAULT_RECEIPT_CONFIG: ReceiptConfig = {
  accent: '#111111',
  format: 'ticket',
  headerNote: 'COMPROBANTE DE VENTA',
  thankYouText: '¡Gracias por tu compra!',
  footerText: '',
  warrantyDefault: '90 días por fallas de fábrica',
  showLogo: true,
  showBusinessDetails: true,
  showCuit: false,
  showSeller: true,
  showImei: true,
  showPayments: true,
  showWarranty: true,
  showSignature: false,
  showFooterBrand: true,
};

/** Mezcla lo guardado con los defaults, tolerando null/campos faltantes. */
export function normalizeReceiptConfig(raw: unknown): ReceiptConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_RECEIPT_CONFIG };
  return { ...DEFAULT_RECEIPT_CONFIG, ...(raw as Partial<ReceiptConfig>) };
}

/** Identidad del negocio: columnas propias de settings + el config del recibo. */
export interface ShopSettings {
  id?: string;
  org_id?: string;
  shop_name?: string;
  address?: string;
  phone?: string;
  instagram?: string;
  email?: string;
  cuit?: string;
  website?: string;
  logo_url?: string;
  warranty_text?: string;
  exchange_rate?: number;
  receipt_config?: ReceiptConfig | null;
  [key: string]: unknown;
}

/** Una línea de producto editable dentro del recibo. */
export interface ReceiptLine {
  id: string;
  description: string;
  detail?: string;   // storage/color, o subtítulo libre
  qty: number;
  amount: number;    // importe total de la línea (en la moneda del recibo)
}

/** Campo extra libre (etiqueta + valor) que el usuario agrega al recibo. */
export interface ReceiptExtraField {
  id: string;
  label: string;
  value: string;
}
