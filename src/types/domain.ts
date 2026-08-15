/**
 * Tipos de dominio de la app.
 *
 * Se infieren del esquema de Supabase y del uso real en el código. Los campos
 * van casi todos como opcionales a propósito: las filas de Supabase llegan sin
 * garantías de columnas (selects parciales, columnas agregadas por migración,
 * datos históricos), así que un tipo estricto rompería más de lo que ayuda.
 *
 * La idea es ir reemplazando `any` por estos tipos módulo por módulo, sin
 * cambiar comportamiento. Ampliá los campos a medida que haga falta.
 */

/** Moneda usada en toda la app. */
export type Currency = 'ARS' | 'USD'

/** Marcas "mágicas" que clasifican una venta que no es de un equipo. */
export type MagicBrand = 'MOVIMIENTO' | 'SERVICIO' | 'ACCESORIOS'

/** Un medio de pago dentro de una venta (guardado como JSON en `sales.payments`). */
export interface Payment {
  /** Identificador del medio: 'efectivo', 'transferencia', 'tarjeta', 'tradein', ... */
  id?: string
  amount?: number
  currency?: Currency | string | null
  /** Cotización ARS→USD usada el día de la venta. Clave para no revaluar ventas viejas. */
  exchange_rate?: number | string | null
  /** Equipo recibido como parte de pago (canje). */
  device?: StockItem | null
  [key: string]: unknown
}

/** Línea de accesorio dentro de una venta (guardada como JSON en `sales.accessories`). */
export interface SaleAccessory {
  id?: string
  name?: string
  price?: number
  cost_price?: number
  qty?: number
  currency?: Currency | string | null
  /** Si es un regalo: suma al costo pero no a la facturación. */
  is_gift?: boolean
  [key: string]: unknown
}

/** Un equipo del inventario (`stock`). */
export interface StockItem {
  id?: string
  org_id?: string
  brand?: string | null
  model?: string | null
  storage?: string | null
  color?: string | null
  imei?: string | null
  status?: 'available' | 'sold' | string
  cost_price?: number | null
  price?: number | null
  currency?: Currency | string | null
  deposit_id?: string | null
  observations?: string | null
  created_at?: string
  [key: string]: unknown
}

/** Una venta (`sales`). Puede ser de un equipo, accesorios sueltos, servicio o movimiento. */
export interface Sale {
  id?: string
  org_id?: string
  brand?: string | null
  model?: string | null
  storage?: string | null
  color?: string | null
  imei?: string | null
  price?: number | null
  cost_price?: number | null
  currency?: Currency | string | null
  payments?: Payment[]
  accessories?: SaleAccessory[]
  seller_id?: string | null
  seller_name?: string | null
  customer_id?: string | null
  created_at?: string
  [key: string]: unknown
}

/** Una reparación (`repairs`). */
export interface Repair {
  id?: string
  org_id?: string
  customer_name?: string
  customer_phone?: string | null
  device_brand?: string
  device_model?: string
  device_color?: string | null
  issue_description?: string
  status?: 'INGRESADO' | 'REVISION' | 'REPUESTO' | 'REPARADO' | 'ENTREGADO' | 'CANCELADO' | string
  budget?: number | null
  /** Costo total del trabajo (repuestos + mano de obra) usado en reportes. */
  cost?: number | null
  deposit_paid?: number | null
  deposit_id?: string | null
  assigned_technician?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

/** Un accesorio del inventario (`accessories`). */
export interface Accessory {
  id?: string
  org_id?: string
  category?: string
  compatible_model?: string | null
  color?: string | null
  stock?: number
  cost_price?: number | null
  sale_price?: number | null
  deposit_id?: string | null
  created_at?: string
  [key: string]: unknown
}

/** Un repuesto del inventario (`spare_parts`). */
export interface SparePart {
  id?: string
  org_id?: string
  name?: string
  category?: string | null
  cost_price?: number
  currency?: Currency | string
  stock?: number
  deposit_id?: string | null
  created_at?: string
  [key: string]: unknown
}

/** Una caja / depósito de dinero (`deposits`). */
export interface Deposit {
  id?: string
  org_id?: string
  name?: string
  balance?: number | null
  currency?: Currency | string
  created_at?: string
  [key: string]: unknown
}

/** Perfil de usuario (`profiles`). */
export interface Profile {
  id?: string
  org_id?: string | null
  name?: string | null
  email?: string | null
  role?: 'owner' | 'admin' | 'seller' | string
  [key: string]: unknown
}
