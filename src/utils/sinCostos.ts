/**
 * Columnas que ve un vendedor: todas menos el costo.
 *
 * El vendedor no tiene que saber cuánto le costó el equipo al local, ni en
 * pantalla ni en los datos que baja el navegador (se leen con las
 * herramientas del navegador). Por eso se enumeran las columnas en vez de
 * pedir `*` y esconder el costo después.
 *
 * Si se agrega una columna a `stock` o `accessories` que el vendedor
 * necesita, va acá. El costo nunca.
 */
export const STOCK_SIN_COSTO =
  'id,created_at,brand,model,storage,color,imei,status,price,currency,deposit,condition,battery,notes,upc,supplier_id'

/** Lo que se le devuelve al vendedor de la venta que acaba de registrar. */
export const VENTA_SIN_COSTO =
  'id,created_at,brand,model,storage,color,imei,price,currency,payments,customer,seller_id,seller_name,notes,accessories,balance_due,deposit_id'

export const ACCESORIOS_SIN_COSTO =
  'id,created_at,deposit_id,category,compatible_model,color,stock,sale_price,currency'
