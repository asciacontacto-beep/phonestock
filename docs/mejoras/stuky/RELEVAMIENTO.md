# Relevamiento de Stuky (referencia para completar Stackr)

Objetivo: tomar ideas de Stuky (app.stukysistema.com) para cerrar los huecos de
Stackr **sin perder su simplicidad**. Huecos que marcó el dueño como prioridad:

- **Ganancia de una venta financiada:** cómo se cuenta la ganancia cuando se
  cobra en cuotas o a través de una financiera.
- **Destino de la transferencia:** poder elegir si una transferencia entra a
  una cuenta propia o a la cuenta de una financiera.
- Información que aparece en una pantalla y falta en otra.

Las capturas `*.webp` de esta carpeta son las que Stuky publica en su landing
(stukysistema.com/capturas/…).

---

## Registro y configuración inicial (capturas que pasó el dueño)

- **Registro:** nombre del negocio, nombre, correo, celular de WhatsApp (+54 9,
  validado en vivo) y contraseña con medidor de seguridad. La cuenta recién se
  crea al confirmar el correo; incluye 30 días de prueba.
- **Asistente de 9 pasos** (`/configuracion-inicial?paso=…`), con "Continuar
  más tarde" y guardado automático:
  1. **Cómo trabaja:** local físico, oficina/showroom, online o varias ubicaciones.
  2. **Qué vende:** iPhone, iPhone + accesorios, varias marcas, tecnología,
     servicio técnico u otro. Después se marcan los equipos (iPhone, Mac, iPad,
     Watch, AirPods) y el sistema solo muestra esos.
  3. (No hay captura.)
  4. **Qué quiere ordenar:** stock, caja y ventas, pesos y dólares, permutas,
     servicio técnico, cuentas corrientes o todo.
  5. **Monedas:** una moneda por tipo de producto (Apple en USD, otras marcas
     en ARS). AirPods y accesorios siempre en pesos. Solo se aplica a productos
     nuevos.
  6. **Dólar:** blue o cripto automático (dolarapi.com), o cargado a mano.
     Muestra un ejemplo: "USD 100 se cobra $156.000".
  7. **Garantía y señas:** duración de la garantía (o sin garantía), vigencia
     de la seña (o sin vencimiento) y condiciones de garantía de hasta 4000
     caracteres que salen en los comprobantes. Las señas vencidas no se
     cancelan: solo quedan marcadas.
  8. **Datos del comercio:** logo, nombre e Instagram, que salen en
     comprobantes y presupuestos.
  9. **Cómo nos conoció:** opcional.

## Menú de la app

Dashboard, Reportes · Ventas: Caja, Ventas, Señas · Inventario: Stock, Compras,
Permutas, Servicio técnico · Personas: Equipo/Empleados, Clientes, Cuenta
corriente · Ajustes: Catálogos, **Planes de pago** · Dólar hoy (blue y cripto)
fijo en el menú · Selector de sucursal arriba · Buscador "IMEI, modelo…" (Ctrl K).

## Pantallas

- **Dashboard (panel):**
  - Resumen del período con cuatro números: ventas, facturado (precio de lista
    de lo vendido), cobrado y ganancia.
  - Recuadro "Requiere atención" y bloque "Operación": señas por cobrar,
    compras por recibir, permutas por rutear, stock por identificar.
  - Finanzas: cuentas por cobrar (pesos y dólares separados) y deudas con
    proveedores.
  - Rendimiento por vendedor, producto, categoría y medio de pago.
  - Botón "Tutorial de cobros".
- **Ventas (`ventas.webp`):**
  - Facturado (antes de descuentos y permutas), cobrado ("plata que entró") y
    por cobrar (dividido en entregado y sin entregar), con barra de
    "% de lo vendido ya cobrado".
  - **Ganancia, con la parte "sin cobrar" marcada aparte.** Si hay ventas sin
    costo cargado, la ganancia sale como "provisional".
  - Pérdidas y descuentos.
  - Un chip por medio de pago con cantidad y total.
  - Filtros por período, vendedor, medio de pago y sucursal.
- **Nueva venta (`venta-pago.webp`):**
  - Asistente en pasos: vendedor → producto → permuta → acción → pago →
    confirmar.
  - Medios: efectivo, transferencia, tarjeta, dólar y cripto.
  - "Dividir en dos métodos" y "Monto recibido".
- **Caja (`caja.webp`):**
  - Caja por turno con monto inicial. El "efectivo esperado al cierre" es la
    apertura más las ventas en efectivo.
  - Chips por medio de pago. Cripto se muestra en USD con su equivalente en
    pesos.
  - Movimientos del turno con pago mixto y detalle de la tarjeta
    (ej. "Naranja X - Plan Z", "Débito 1c").
  - Historial de cajas.
- **Permutas (`permutas.webp`):**
  - Cuatro estados: recibidas, en stock, en técnico y todas.
  - Columnas: equipo, batería, valor de la permuta en USD, número de pedido,
    sucursal y estado.
  - Acciones para mandar el equipo a stock o al técnico.
- **Cuenta corriente (`cuenta.webp`):**
  - Solapas: cuentas, por cobrar y por entregar.
  - Deuda viva por antigüedad: vigente, 1-30, 31-60 y +60 días.
  - Cada venta tiene su vencimiento y muestra lo pendiente sobre el total.
- **Stock (`stock.webp`):**
  - Solapas: equipos, accesorios y personalizado. Dentro de equipos: iPhone,
    celulares, Mac y Watch.
  - Stock agrupado por modelo, marcando los que tienen seña.
- **Servicio técnico (`tecnico.webp`):**
  - Tipo de orden: cliente o permuta.
  - Estados: en proceso, listo y en stock. Se registra el costo y quién creó
    la orden.

## Pendiente de relevar dentro de la app (con cuenta de prueba)

- Planes de pago: cómo se cargan las financieras y las tarjetas, qué recargo o
  comisión tiene cada plan y cuándo se acredita.
- Venta con tarjeta, cuotas o financiera: cuánto cuenta como cobrado, cuánto
  como ganancia y si la comisión de la financiera se descuenta.
- Transferencia: si se puede elegir la cuenta de destino (propia o de la
  financiera).
- Configuración completa, señas, compras, clientes, reportes, cierre de caja.
