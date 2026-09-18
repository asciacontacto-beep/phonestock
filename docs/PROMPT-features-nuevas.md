# Prompt para construir las features nuevas de Stackr

> Copiar y pegar entero en una sesión nueva, parado en el repo `phonestock-main`.
> Está pensado para construir **una feature por sesión**, en el orden de abajo.
> El mockup de referencia es `mockups/nuevas-features.html` (abrilo antes de empezar).

---

## Contexto del proyecto (leer antes de escribir código)

Stackr es un ERP para locales de venta y reparación de celulares. Next.js 16 + Supabase,
multi-tenant por `org_id` con RLS. **Esta versión de Next tiene breaking changes respecto
a lo que sabés: leé la guía correspondiente en `node_modules/next/dist/docs/` antes de
escribir código.**

### Convenciones que ya existen y hay que respetar

- **Páginas**: `src/app/(app)/<modulo>/page.tsx` es un Server Component que hace los
  `select` de Supabase y le pasa los datos por props a `<Modulo>Client.tsx` (`"use client"`).
  Usan `export const dynamic = 'force-dynamic'`.
- **Lógica pura en utils**: la lógica de negocio va en `src/utils/*.ts` con su
  `*.test.ts` al lado (vitest, `npm test`). Ver `src/utils/saleTotals.ts`,
  `src/utils/sales.ts`, `src/utils/wholesaleSale.ts` como modelo. Los componentes
  llaman a esos utils; **no** hacen la cuenta inline.
- **Comentarios**: en español, explicando *por qué*, no *qué*. Los comentarios
  existentes cuentan qué problema real se estaba arreglando. Seguí ese tono.
- **Migrations**: `supabase/migrations/AAAAMMDD_nombre.sql`. Toda tabla nueva necesita
  `org_id`, `enable row level security` y su policy por org. Copiá el patrón de
  `supabase/migrations/20260622_mayoristas.sql`.
- **Monedas**: todo importe tiene su `currency` ('ARS' | 'USD'). Un costo guardado en
  una fila se interpreta **en la moneda de esa fila**. Para convertir se usa la
  cotización guardada en la operación (`payments[].exchange_rate`), y solo se cae en la
  cotización actual (`settings.exchange_rate`) si la operación no la tiene. Ver
  `saleExchangeRate()` en `src/utils/sales.ts` y el comentario que explica por qué.
- **Nunca guardar 0 donde corresponde null**: un costo en 0 significa "no me costó nada"
  e infla la ganancia. Si el dato falta, va `null` y se avisa al usuario.
- **Cajas**: el saldo de cada caja/depósito se calcula sumando `sales.payments`, no hay
  una columna de saldo. Cualquier plata que entre o salga tiene que quedar registrada
  de una forma que las cajas sepan sumar, **con la fecha real del movimiento**.
- **UI**: clases y variables CSS de `src/app/globals.css` (`.card`, `.inp`, `.btn`,
  `.badge`, `var(--text)`, `var(--green)`…). Toasts con `sonner`. Iconos `lucide-react`.

### Reglas de trabajo

1. **TDD**: primero el test que falla, después el código. La lógica de plata va en un
   util puro y se testea sin Supabase.
2. **Una feature por sesión.** No mezclar. No refactorizar de paso.
3. Antes de decir que terminaste: `npm test`, `npx tsc --noEmit` y `npm run build`,
   los tres en verde, y mostrar la salida.
4. Commit en español explicando el porqué. Push a `main` solo si los tres pasan.

---

## Feature 1 — Cuenta corriente de clientes y cobro de saldos

**Empezar por esta.** Las cuotas (feature 2) se construyen encima.

### El problema hoy

Una venta puede cerrarse cobrando menos que el precio: queda `sales.balance_due > 0` y
el cliente figura como deudor en Ventas y en el Dashboard. **Pero no hay ninguna forma
de cobrar ese saldo después.** El único camino es editar la venta vieja y agregarle un
pago a mano, lo que rompe dos cosas:

- `balance_due` no se recalcula al guardar (ver el `update` en
  `src/app/(app)/sales/SalesClient.tsx`, alrededor de la línea 605): la deuda queda
  figurando para siempre aunque ya te hayan pagado.
- El pago hereda la fecha de la venta, así que la plata **no aparece en el arqueo del
  día en que realmente cobraste**.

Además, las ventas no tienen FK al cliente: se emparejan por DNI/nombre con una
heurística (`ventaEsDe()` en `src/utils/customers.ts`). Para un saldo por cliente
confiable eso no alcanza — dos homónimos parten el saldo en dos.

### Qué construir

1. **Migration**: agregar `sales.customer_id uuid references customers(id)`. Backfill
   best-effort usando la misma lógica de `ventaEsDe()`; las que no matcheen quedan en
   null (no adivinar). La heurística por nombre se mantiene como fallback de lectura.
2. **Migration**: tabla `customer_payments` — `id`, `org_id`, `customer_id`,
   `sale_id` (nullable: un cobro puede ser a cuenta, sin venta puntual),
   `installment_id` (nullable, lo usa la feature 2), `amount`, `currency`,
   `exchange_rate`, `method`, `deposit_id`, `paid_at` (fecha real del cobro, **editable
   por el usuario**, no `now()`), `notes`, `created_at`. RLS por org.
3. **Util puro** `src/utils/cuentaCorriente.ts` + tests:
   - saldo de un cliente = suma de `balance_due` de sus ventas − suma de sus cobros,
     separado por moneda (ARS y USD **no se mezclan**);
   - un cobro **nunca** puede superar el saldo pendiente de la venta a la que se imputa;
   - **se aceptan pagos parciales** (el cliente puede traer $80.000 de una deuda de
     $150.000);
   - el cobro tiene que impactar en la caja con `paid_at`, no con la fecha de la venta.
4. **Pantalla** `/customers/[id]` (o pestaña en la ficha del cliente): saldo total,
   tabla de movimientos debe/haber/saldo, y botón **Registrar cobro** con el modal del
   mockup (pantalla 3): monto, moneda, medio, **fecha del cobro**, caja.
5. Al registrar un cobro, **recalcular `balance_due` de la venta imputada**. Ese es el
   bug de fondo: hoy nadie lo toca nunca.
6. En `/sales`, el filtro "solo con saldo pendiente" que ya existe tiene que reflejar
   los cobros nuevos.

### Casos borde que los tests tienen que cubrir

- Cobro parcial, y después otro cobro que completa la deuda → `balance_due` llega a 0.
- Cobro en USD de una deuda en ARS (y al revés): se convierte con la cotización del día
  del cobro, que queda guardada en el registro.
- Cobro a cuenta sin venta asignada: baja el saldo total del cliente.
- Anular una venta que ya tenía cobros → avisar, no borrar los cobros en silencio.
  Mirar `src/utils/voidSale.ts` antes de tocar nada de anulación.

---

## Feature 2 — Ventas en cuotas del local

Depende de la feature 1. Referencia visual: pantallas 2 y 3 del mockup.

### Decisiones ya tomadas (no volver a preguntarlas)

- Plan de **vencimientos con fechas**, no un saldo suelto.
- **Sin interés propio.** No agregar el campo "todavía no". Dejar el cálculo armado de
  forma que agregar un `%` después sea un cambio chico, y nada más.
- La venta se registra **completa hoy**: el stock se descuenta y la ganancia se
  contabiliza en la fecha de la venta. A la **caja** entra solo el anticipo; cada cuota
  entra el día que se cobra.

### Qué construir

1. **Migration**: tabla `sale_installments` — `id`, `org_id`, `sale_id`, `number`,
   `due_date`, `amount`, `currency`, `status` ('pending' | 'paid' | 'partial'),
   `created_at`. RLS por org. El estado se deriva de los cobros: no duplicar la plata.
2. **Util puro** `src/utils/cuotas.ts` + tests:
   - generar el plan: `(precio − anticipo) / N` cuotas, vencimiento mensual desde una
     fecha inicial;
   - **el redondeo no puede perder ni inventar plata**: la suma de las cuotas más el
     anticipo tiene que dar exactamente el precio. La diferencia de redondeo va en la
     última cuota;
   - el anticipo es **opcional** (puede ser 0: venta 100% en cuotas);
   - una cuota está vencida si `due_date < hoy` y no está paga.
3. **En `/sell`**: nuevo medio de pago "Cuotas del local" con anticipo, cantidad de
   cuotas y fecha del primer vencimiento, que muestra **la tabla de cuotas antes de
   confirmar** (pantalla 2 del mockup).
4. Las cuotas aparecen en la cuenta corriente del cliente con su botón **Cobrar**, que
   usa el flujo de cobro de la feature 1.
5. En el Dashboard: cuánto vence esta semana y cuánto está vencido.

### Casos borde que los tests tienen que cubrir

- `850000 − 250000 = 600000` en 4 cuotas → 4 × 150.000, suma exacta.
- Un monto que no divide exacto (ej: 100.000 en 3) → 33.333 + 33.333 + 33.334.
- Anticipo 0 y anticipo igual al precio total (no debería generar cuotas).
- Pago parcial de una cuota → queda en 'partial' con el resto pendiente.

---

## Feature 3 — Tarjeta con recargo

Referencia visual: pantallas 1 y 5 del mockup. La pantalla 1 del mockup **ya tiene la
cuenta funcionando en JavaScript**: usala como especificación del cálculo.

### Decisión ya tomada

Configurable por plan, con las **dos** variantes: el recargo lo puede pagar el cliente o
lo puede absorber el local. El plan define el default; el vendedor lo puede cambiar en
la venta.

### Qué construir

1. **Migration**: tabla `card_plans` — `id`, `org_id`, `card_name`, `installments`,
   `surcharge_pct`, `paid_by` ('customer' | 'shop'), `deposit_id` (dónde acredita),
   `active`, `created_at`. RLS por org.
2. **Util puro** `src/utils/tarjetas.ts` + tests. La cuenta, con precio de lista `P`,
   recargo `r` y costo del equipo `C`:
   - recargo lo paga el cliente → cliente paga `P × (1+r)`, a caja entra `P × (1+r)`,
     ganancia = `P − C`;
   - lo absorbe el local → cliente paga `P`, a caja entra `P × (1−r)`,
     ganancia = `P − C − (P × r)`.
   - **La ganancia se mide siempre contra el precio de lista**, nunca contra lo que pagó
     el cliente. El recargo que paga el cliente no es ganancia tuya: es lo que se lleva
     la tarjeta.
   - La ganancia **puede dar negativa** (plan de 25% con margen de 24%). Mostrarla en
     rojo, no esconderla ni bloquear la venta.
3. **Pantalla** Ajustes → Planes de tarjeta (pantalla 5 del mockup): ABM de planes.
4. **En `/sell`**: medio de pago "Tarjeta" con selector de plan y toggle de quién paga
   el recargo, mostrando el desglose en vivo como en el mockup.
5. El pago guardado en `sales.payments` tiene que dejar registrado **qué plan se usó y
   cuánto fue el recargo**, para poder auditarlo después.

### Casos borde que los tests tienen que cubrir

- Recargo 0% (débito) en las dos variantes → no cambia nada.
- Ganancia negativa cuando el recargo absorbido supera el margen.
- Venta en USD con plan de tarjeta cargado en ARS.

---

## Feature 4 — Reparar equipos propios del inventario

Referencia visual: pantalla 4 del mockup.

### El problema hoy

El módulo Reparaciones (`src/app/(app)/repairs/`) es solo para equipos **de clientes**:
`repairs` guarda `customer_name`, `device_brand`, `device_model` como texto libre, sin
ningún vínculo con `stock`. Si arreglás un equipo propio antes de venderlo, podés editar
batería y condición a mano en Inventario, **pero el costo del repuesto no se suma al
costo del equipo**: el margen que ves al venderlo queda inflado.

### Decisión ya tomada

El costo del arreglo **se suma al `cost_price` del equipo**. No va como gasto operativo.

### Qué construir

1. **Migration**: agregar `repairs.stock_id` (nullable, FK a `stock`). Una reparación
   con `stock_id` es interna; sin `stock_id` es de un cliente, como hasta ahora.
2. Nuevo estado de stock `in_repair`. Un equipo en reparación **no aparece para vender**
   ni cuenta como stock disponible. Revisar todos los filtros que hoy asumen
   `status = 'available'` — incluido el índice único de IMEI de
   `supabase/migrations/20260914_imei_unico.sql`, que es parcial sobre `status = 'available'`.
3. Botón **Mandar a reparar** en la ficha del equipo en Inventario.
4. **Util puro** `src/utils/reparacionPropia.ts` + tests: el costo nuevo del equipo es
   `cost_price + Σ(repuestos) + mano de obra`, convertido a la moneda del equipo. Si
   falta la cotización para convertir, **no inventar el número**: avisar (mismo criterio
   que `src/utils/wholesaleSale.ts`).
5. Al cerrar la reparación: descontar los repuestos de `spare_parts` (ya existen los RPC
   `decrement_spare_part_stock` / `increment_spare_part_stock`), actualizar el
   `cost_price` del equipo, devolverlo a `available`, y permitir actualizar condición y
   batería en el mismo paso.
6. Mostrar el antes/después del costo al cerrar, como en el mockup ("US$400 → US$475").

### Casos borde que los tests tienen que cubrir

- Reparación cancelada: el equipo vuelve a `available` **sin** tocar el costo, y los
  repuestos vuelven al stock.
- Repuestos en USD sobre un equipo costado en ARS.
- Equipo que no tiene arreglo → estado de baja, sin volver a venta.

### Pregunta abierta

¿Los equipos propios van en la misma pantalla de Reparaciones (mezclados con los de
clientes, con un filtro) o en una pantalla aparte? **Preguntarlo antes de construir la UI.**

---

## Orden y por qué

1. **Cuenta corriente** — arregla un error de plata que ya está corriendo hoy.
2. **Cuotas** — se apoya en el cobro de la 1.
3. **Tarjeta con recargo** — independiente, se puede adelantar si apura.
4. **Reparación propia** — la más aislada del resto.

## Fuera de alcance (pedirlas aparte)

- Cuenta corriente de **proveedores** y compra de mercadería con salida de caja. Es el
  hueco más grande del sistema: hoy comprar stock no descuenta plata de ninguna caja, así
  que la ganancia sale inflada por otro lado. Va en su propia sesión.
- Fecha de nacimiento del cliente y estado "en tránsito" al ingresar equipos: dos cambios
  chicos, sueltos.
