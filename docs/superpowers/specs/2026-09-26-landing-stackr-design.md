# Landing de Stackr — rediseño estilo Apple (claro, verde, bento)

Fecha: 2026-09-26 · Estado: aprobado el recorrido, pendiente revisión de esta spec.

## Por qué

La landing actual (oscura, negro/hueso/dorado, del 19/9) no convence: el usuario marcó que
se ve genérica, no vende, le falta impacto, y pidió empezar de cero. Va a recibir tráfico de
anuncios de Meta, que entra casi todo desde el celular. Competidores que anuncian hoy:
CocosCRM, iVMSTOCK, Nexo App, StockCel.

## Decisiones tomadas con el usuario

| Tema | Decisión |
|---|---|
| Punto de partida | De cero: otra dirección, no una variante de la oscura |
| Referencia | Apple (apple.com): producto protagonista, mucho aire, frases cortas |
| Dirección | A + C: base clara estilo apple.com + una sección bento de highlights |
| Acento | Verde profundo ("verde plata"), bien premium |
| Imágenes | Pantallas de Stackr recreadas en código dentro de iPhone y notebook |
| Promesa principal | "Tu local, en orden." |
| Efectos | Componentes de React Bits, con moderación; sin fondos 3D/WebGL |

## Alcance

**Dentro:** `src/components/landing/*` (LandingPage, CSS, precios) y los componentes nuevos
que la landing use. `src/app/page.tsx` sólo si hace falta para montar la landing.

**Fuera:** todo el sistema (app autenticada, login, catálogo público, globals.css de la app).
El login no cambia salvo lo que ya existe (`?registro`).

**Se conserva sin cambios de comportamiento:**
- Píxel de Meta: `<MetaPixel />`, `Lead` en cada "Probar gratis", `Contact` en cada WhatsApp.
- Destino de "Probar gratis": `/login?registro`. "Entrar": `/login`.
- `precios.ts`: USD 250 de por vida (plan que manda), $50.000 por mes, `linkWhatsApp()`.
- Barra fija abajo en el celular (Probar gratis + WhatsApp) al pasar la portada.
- JSON-LD de `layout.tsx` (no se toca).
- Todas las afirmaciones deben ser ciertas: prueba de 48 horas sin tarjeta, soporte por
  WhatsApp del fundador, catálogo con hasta 3 fotos, sucursales y usuarios ilimitados.

## Sistema visual

**Colores** (una sola familia; el verde es el ÚNICO color fuerte):

| Uso | Valor |
|---|---|
| Fondo principal | `#fbfbfd` |
| Fondo alternado / bento | `#f5f5f7` |
| Bloque / tarjeta bento | `#ffffff` (sin borde, radio 28px) |
| Texto | `#1d1d1f` |
| Texto secundario | `#6e6e73` |
| Acento verde | `#0b7a4b` (hover `#096640`) |
| Verde tenue (chips, fondos) | `#e3f3ea` |
| Franja negra (precio) | `#000` con texto `#f5f5f7` / `#a1a1a6`; verde claro `#30d158` para detalles |

**Tipografía:** pila del sistema de Apple (`-apple-system, BlinkMacSystemFont, "SF Pro Display",
"Segoe UI", Inter, sans-serif`). Títulos 700, tracking −0.045em. Escala: portada
`clamp(48px, 9vw, 96px)`; títulos de sección `clamp(34px, 5.5vw, 64px)`; texto 17–19px.

**Forma:** sin bordes en tarjetas (la queja histórica: "cards con borde re clásicas de IA").
Separación por aire y por cambio de fondo. Radio 28px en bloques, 999px en botones.
Sombras sólo en los dispositivos.

**Movimiento:** una curva para todo (`cubic-bezier(.22,1,.36,1)`). Con
`prefers-reduced-motion`, todo aparece quieto y los números muestran el valor final.

## Secciones

1. **Barra** — fija, 52px, blanca translúcida con desenfoque. Izquierda "Stackr" escrito (sin
   cajita ni glifo), centro "Sistema · Catálogo · Precio · Preguntas" (anclas), derecha
   "Entrar" y "Probar gratis" (píldora verde). Celular: marca + "Probar gratis".
2. **Portada** — sello chico "Prueba gratis 48 h · sin tarjeta"; título "Tu local, en orden."
   (React Bits **BlurText**); bajada "Stock con IMEI, ventas, cuotas y caja. En un solo lugar,
   en el celular y en la compu."; botones "Probar gratis" (verde, **Magnet** en escritorio) y
   "Consultar por WhatsApp" (texto verde con ›). Debajo, iPhone con Inventario y notebook
   con el panel (**AnimatedContent**, suben al cargar), resplandor verde radial muy suave.
3. **Cinta de marcas** — "Para locales que venden" + Apple, Samsung, Motorola, Xiaomi, Google
   Pixel, Huawei, Honor en texto (sin logos con marca registrada) (**LogoLoop**).
4. **La frase** — "Chau cuaderno. Chau Excel. Chau «creo que Martín me debe algo»."
   (**ScrollReveal**, se aclara al bajar).
5. **Bento "todo de un vistazo"** — título "Todo lo del local. De un vistazo." Bloques:
   - Grande: "Cada equipo con su IMEI." + pantalla de inventario en código.
   - Negro: "Ganancia real" **CountUp** a U$ 145, "descontando costo, arreglo y tarjeta".
   - "Quién te debe": cuota 2/3 de Martín, chip "vence en 4 días".
   - "La caja cierra": Efectivo / Transferencias / Dólares → "Diferencia $0" en verde.
   - "Varias sucursales, sin costo extra".
   Los bloques usan **SpotlightCard** (luz suave que sigue al mouse; en celular no aplica).
6. **Vidriera para Instagram** — fondo `#f5f5f7`. Texto: "Tu vidriera, en la bio de
   Instagram." / "Elegís los equipos, subís hasta 3 fotos y compartís un link. El cliente
   elige y te escribe por WhatsApp." Al lado, fichas del catálogo (foto, modelo, precio,
   "Consultar") que pasan en mazo (**CardSwap**). En celular, el mazo va debajo del texto.
7. **Arrancás en una tarde** — tres pasos numerados en línea: "Te registrás" / "Cargás el
   stock escaneando" / "Vendés". Nota: "¿Preferís que lo configure yo? Escribime por
   WhatsApp." (**AnimatedContent** escalonado).
8. **Precio (franja negra)** — "USD 250." (**CountUp** 0→250) "Una vez." "Para siempre."
   (**ShinyText**). Línea: "Sucursales, usuarios y actualizaciones incluidos. Soporte por
   WhatsApp." Chica: "o $50.000 por mes, sin permanencia." Botones: "Probar gratis" (verde)
   y "Quiero la licencia" (WhatsApp con `linkWhatsApp('lifetime')`, evento `Contact`).
9. **Preguntas** — mismas 6 preguntas y respuestas de hoy (la de planes ya dice USD 250),
   acordeón sin bordes, separadores finos.
10. **Cierre** — "Entrá hoy. Esta noche cerrás la caja en orden." + "Probar gratis".
    Pie: "Stackr · Hecho en Argentina", links Precio / Preguntas / Entrar.

## Dispositivos en código

Componentes propios `IPhone` y `Notebook` (marco en CSS, pantalla con contenido HTML), para
que las pantallas sean nítidas, livianas y animables. Datos de ejemplo prolijos y
coherentes entre secciones (iPhone 15 Pro U$ 980, iPhone 14 U$ 610, Galaxy S24,
Moto G15 $ 280.000; Martín G.). Estética de las pantallas: la del sistema real (claro).

## React Bits: cómo se incorporan

- Variante **TS-CSS** (Stackr no usa Tailwind en la landing).
- Se bajan del registro (`https://reactbits.dev/r/<Nombre>-TS-CSS.json`), que trae el código,
  a `src/components/landing/reactbits/`, conservando el aviso de licencia (MIT + Commons
  Clause: permitido usarlos dentro de un sitio).
- Componentes: BlurText, Magnet, AnimatedContent, LogoLoop, ScrollReveal, CountUp,
  SpotlightCard, CardSwap, ShinyText (9).
- Dependencias nuevas: `motion` y `gsap` (+ `@gsap/react` si alguno lo pide). Nada de `ogl`,
  `three` ni `lenis`.
- Se ajustan colores/tamaños por props o CSS de la landing; no se reescribe su lógica.

## Rendimiento y accesibilidad

- El título y el botón de la portada tienen que verse aunque el JavaScript tarde: el texto
  está en el HTML y la animación sólo lo mejora (aprendido del bug "landing negra" del 19/9).
- Efectos que dependen del cursor (Magnet, SpotlightCard) sólo en punteros finos.
- `prefers-reduced-motion`: sin animaciones, números con el valor final.
- Contraste AA en todo texto (verde `#0b7a4b` sobre blanco cumple).
- Objetivo: Lighthouse móvil ≥ 85 en rendimiento, LCP < 2.5 s.

## Verificación

- `tsc`, lint de los archivos nuevos, `vitest` y `next build` en verde.
- Capturas en celular (390px) y escritorio (1280px) de cada sección, revisadas una por una.
- Con navegador real (Playwright sin marca de automatización): "Probar gratis" dispara `Lead`
  y abre `/login?registro` en "Creá tu cuenta"; WhatsApp dispara `Contact`.
- Revisión con la skill `web-design-guidelines` antes de publicar.

## Fuera de alcance

Fondos 3D/WebGL, testimonios (no hay reales todavía), cambios en la duración de la prueba,
cambios dentro del sistema.
