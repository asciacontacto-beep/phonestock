# Stackr Mobile

En el celular (≤ 768px) Stackr no es la versión de la compu achicada: tiene
su propio marco y sus propias pantallas. Comparte marca, colores,
tipografía, datos, lógica y permisos; cambian el layout, la navegación y la
jerarquía. La compu y la tablet siguen exactamente igual.

## Cómo se separan las dos vistas

- **CSS**: `.solo-mob` sólo existe en el celular; `.solo-desk`, sólo en la
  compu. Lo usa el marco (encabezado, barra de pestañas) e Inicio.
- **`useEsCelular()`** (`src/hooks/useEsCelular.ts`): las pantallas con
  listas largas montan una vista u otra, no las dos. En el servidor
  responde "compu" y React lo corrige al hidratar.
- Cada pantalla con vista propia tiene su componente mobile al lado del de
  la compu, y recibe el mismo estado y los mismos datos:

| Pantalla | Compu | Celular |
|---|---|---|
| Inicio | `dashboard/DashboardClient.tsx` | `dashboard/InicioMobile.tsx` |
| Stock | `stock/StockClient.tsx` | `stock/StockMobile.tsx` |
| Ventas | `sales/SalesClient.tsx` | `sales/VentasMobile.tsx` |
| Clientes | `customers/CustomersClient.tsx` | `customers/ClientesMobile.tsx` |
| Cuenta corriente | `CuentaCorriente` | `CuentaCorriente variante="mobile"` |
| Cajas | `cashiers/CashiersClient.tsx` | `cashiers/CajasMobile.tsx` |
| Gastos | `expenses/ExpensesClient.tsx` | `expenses/GastosMobile.tsx` |
| Servicio técnico | `repairs/RepairsClient.tsx` | `repairs/ReparacionesMobile.tsx` |
| Turnos | `turnos/TurnosClient.tsx` | `turnos/TurnosMobile.tsx` |
| Rentabilidad | `reports/ReportsClient.tsx` | `reports/RentabilidadMobile.tsx` |

Editar una venta, ver el comprobante, anular, cobrar, cargar un equipo:
siempre la misma lógica que la compu. La vista mobile sólo cambia cómo se
llega y cómo se ve.

## El marco

- `components/mobile/MobileShell.tsx`: encabezado compacto (título, buscar,
  cuenta), barra de pestañas (dueño: Inicio · Ventas · Stock · Clientes ·
  Más; vendedor: Inicio · Vender · Stock · Caja · Más) y las hojas "Más" y
  "Mi cuenta". El menú sale de las listas de `Sidebar.tsx`: agregar una
  pantalla ahí la agrega en los dos lados.
- `components/mobile/BottomSheet.tsx`: la hoja que sube desde abajo, para
  filtros, acciones y fichas (venta, cliente). Se cierra tocando afuera,
  con Escape o arrastrándola.
- Los modales de siempre (`.mo` / `.mb`) en el celular ya se muestran como
  hoja; los formularios largos, a pantalla completa. Mientras hay uno
  abierto, la barra de pestañas y el botón flotante se apartan
  (`data-m-modal` en el documento, lo pone el encabezado), así nunca tapan
  el botón de Guardar.
- Ojo con las animaciones de entrada: con `fill-mode: both` el elemento
  queda como capa propia para siempre y lo que tiene adentro (un modal)
  ya no puede pasar por encima de la barra. Se usa `backwards`.

## Piezas de diseño (globals.css, sección "STACKR MOBILE")

`m-card`, `m-hero` (el número que manda), `m-grid2` (métricas, nunca más de
dos columnas), `m-list` + `m-row` (listas agrupadas), `m-buscar`, `m-chips`
(filtros rápidos), `m-acciones` (accesos de un toque), `m-fab` (acción
principal), `m-estado` (punto + palabra), `m-sec` (títulos de sección).

## Movimiento y respuesta

- La barra de pestañas flota con bordes redondeados; una píldora se
  desliza hasta la pestaña tocada y se marca al instante, antes de que
  llegue la pantalla. Volver a tocar la activa sube al principio.
- Mientras carga una pantalla se ve su forma (`EsqueletoMobile`), no un
  hueco en blanco.
- Al bajar se esconde el botón flotante y el encabezado gana una línea
  fina; al subir vuelve todo.
- Las hojas se arrastran desde cualquier parte (si la lista está arriba):
  un tirón rápido o pasar el 30% la cierra; el fondo se aclara mientras.
- Sólo se animan `transform` y `opacity`, con la curva `--m-resorte`.
  `.page` sólo aparece (sin moverse), porque un transform rompería lo que
  tiene `position: fixed` adentro. Con "reducir movimiento" no se anima nada.

Reglas: áreas táctiles de 40px o más, nada que dependa del hover, safe
areas del iPhone en el encabezado y la barra, todo con los tokens del tema
(funciona en claro y oscuro).

## Pantallas sin vista propia

Ajustes, Mayoristas, Proveedores, Depósitos, etc. usan su diseño
responsive dentro del marco nuevo: el título va al encabezado y las tablas
se vuelven tarjetas con rótulos. Si alguna pasa a usarse mucho desde el
teléfono, el camino es el mismo: un `XMobile.tsx` al lado, con el mismo
estado.
