/**
 * Las filas que muestran las pantallas mobile, con los campos que usan.
 * Vienen de las mismas consultas que la compu; acá sólo se nombra lo que
 * cada vista lee.
 */
/* No extienden Sale/Payment de types/domain: esos tienen una firma
   [key: string]: unknown que, al derivarlos, deja todos los campos en
   unknown. Para las funciones que piden Sale se convierte al llamarlas. */
export interface PagoFila {
  id?: string
  amount?: number
  original_amount?: number
  currency?: string | null
  label?: string
  account_name?: string
  device?: { brand?: string; model?: string } | null
}

export interface VentaFila {
  id: string | number
  brand?: string | null
  model?: string | null
  storage?: string | null
  color?: string | null
  imei?: string | null
  price?: number | null
  currency?: string | null
  balance_due?: number | null
  created_at: string
  seller_id?: string | null
  seller_name?: string | null
  notes?: string | null
  customer?: { name?: string; phone?: string; dni?: string } | null
  payments?: PagoFila[] | null
  accessories?: { qty?: number; name?: string }[] | null
}

export interface ClienteFila {
  id: string | number
  name: string
  phone?: string | null
  email?: string | null
  dni?: string | null
  instagram?: string | null
  created_at?: string | null
}

/** Un local / depósito o un vendedor: lo que hace falta para un filtro. */
export interface Opcion {
  id: string | number
  name: string
}
