# Landing de Stackr (estilo Apple, verde, bento) — plan de implementación

> Ejecución inline en la sesión que escribió la spec. Pasos con casillas para seguimiento.
> Desvío consciente del formato: el código de UI se escribe al ejecutar y se valida con
> capturas; el plan fija archivos, interfaces, contenido y verificación.

**Goal:** reemplazar la landing oscura por la de la spec `docs/superpowers/specs/2026-09-26-landing-stackr-design.md`.

**Architecture:** `LandingPage.tsx` sólo compone secciones. Cada sección es un archivo en
`src/components/landing/secciones/`. Un solo CSS module (`landing.module.css`) con los tokens
de la spec y un bloque por sección. Los 9 componentes de React Bits se copian del registro a
`src/components/landing/reactbits/` sin reescribir su lógica.

**Tech Stack:** Next 16 (app router), React 19, CSS modules, `motion` + `gsap` (React Bits).

## Global Constraints

- Sólo la landing: nada del sistema, del login ni de `globals.css`.
- Colores: fondo `#fbfbfd`, alterno `#f5f5f7`, bloque `#fff` sin borde radio 28px, texto `#1d1d1f`, secundario `#6e6e73`, verde `#0b7a4b` (hover `#096640`), verde tenue `#e3f3ea`, franja negra `#000`.
- Tipografía: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Inter, sans-serif`; títulos 700, tracking −0.045em.
- Curva única `cubic-bezier(.22,1,.36,1)`; `prefers-reduced-motion` sin animaciones.
- Se conservan: `<MetaPixel />`, `Lead` en "Probar gratis" → `/login?registro`, `Contact` en WhatsApp, `precios.ts`, barra fija en celular.
- Sin `ogl`, `three`, `lenis`. Efectos de cursor sólo con puntero fino.
- Afirmaciones verdaderas: prueba 48 h sin tarjeta, hasta 3 fotos, sucursales y usuarios ilimitados, soporte por WhatsApp.

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `landing/LandingPage.tsx` | Compone secciones, píxel, barra móvil |
| `landing/landing.module.css` | Tokens + estilos por sección |
| `landing/acciones.ts` | `REGISTRO`, `alProbar()`, `alEscribir()` |
| `landing/precios.ts` | Sin cambios |
| `landing/secciones/Barra.tsx` | Barra superior |
| `landing/secciones/Portada.tsx` | Hero + dispositivos |
| `landing/secciones/Dispositivos.tsx` | `IPhone`, `Notebook`, pantallas de ejemplo |
| `landing/secciones/MarcasYFrase.tsx` | LogoLoop + ScrollReveal |
| `landing/secciones/Bento.tsx` | Bloques con CountUp + SpotlightCard |
| `landing/secciones/Vidriera.tsx` | Catálogo con CardSwap |
| `landing/secciones/Pasos.tsx` | Tres pasos |
| `landing/secciones/Precio.tsx` | Franja negra USD 250 |
| `landing/secciones/Preguntas.tsx` | FAQ + cierre + pie |
| `landing/secciones/BarraMovil.tsx` | CTA fija en celular |
| `landing/reactbits/*` | 9 componentes copiados con aviso de licencia |

## Tareas

### Task 1: Dependencias y React Bits
- [ ] `npm install motion gsap`
- [ ] Copiar BlurText, Magnet, AnimatedContent, LogoLoop, ScrollReveal, CountUp, SpotlightCard, CardSwap, ShinyText (TS-CSS) a `landing/reactbits/`, con cabecera `/* React Bits — MIT + Commons Clause © David Haz — reactbits.dev */`
- [ ] `npx tsc --noEmit` sin errores nuevos

### Task 2: Base, barra y barra móvil
- [ ] `acciones.ts` con `REGISTRO = '/login?registro'`, `alProbar = () => eventoMeta('Lead')`, `alEscribir = () => eventoMeta('Contact')`
- [ ] Reescribir `landing.module.css` con tokens; `Barra.tsx` (52px, translúcida, "Stackr" escrito, anclas centradas, Entrar + Probar gratis verde; celular: marca + botón); `BarraMovil.tsx` (aparece pasada la portada)
- [ ] `LandingPage.tsx` compone con `<MetaPixel />`
- [ ] Captura 390px y 1280px

### Task 3: Dispositivos + Portada
- [ ] `IPhone` (marco CSS, notch, pantalla children) y `Notebook` (pantalla + base)
- [ ] Pantallas: `PantallaInventario` (iPhone 15 Pro U$ 980 Disponible, iPhone 14 U$ 610 Disponible, Galaxy S24 U$ 780 En reparación, Moto G15 $ 280.000) y `PantallaPanel` (Facturado U$ 48.250, Ganancia real U$ 9.870, 63 equipos, tabla corta)
- [ ] Portada: sello, BlurText "Tu local, en orden.", bajada, Probar gratis (Magnet) + Consultar por WhatsApp ›, dispositivos con AnimatedContent, resplandor verde
- [ ] Captura en frío: el título se ve sin interactuar

### Task 4: Marcas y frase
- [ ] LogoLoop de nombres en texto (Apple, Samsung, Motorola, Xiaomi, Google Pixel, Huawei, Honor), fundido a los costados
- [ ] ScrollReveal: "Chau cuaderno. Chau Excel. Chau «creo que Martín me debe algo»."

### Task 5: Bento
- [ ] Título "Todo lo del local. De un vistazo."; bloques: IMEI (grande, pantalla), Ganancia real CountUp 145 (negro), Quién te debe, La caja cierra ($0 verde), Varias sucursales
- [ ] SpotlightCard verde tenue; grid 3 columnas en escritorio, 1 en celular

### Task 6: Vidriera
- [ ] Texto + CardSwap con 3 fichas (foto en degradé, modelo, precio, "Consultar"); en celular, mazo debajo

### Task 7: Pasos y precio
- [ ] Pasos: Te registrás / Cargás el stock escaneando / Vendés + nota WhatsApp
- [ ] Franja negra: CountUp 250, "Una vez." "Para siempre." (ShinyText), línea de incluidos, "o $50.000 por mes, sin permanencia.", Probar gratis + "Quiero la licencia" (`linkWhatsApp('lifetime')`)

### Task 8: Preguntas, cierre, pie
- [ ] Las 6 preguntas actuales en acordeón sin bordes; cierre "Entrá hoy. Esta noche cerrás la caja en orden."; pie

### Task 9: Verificación y publicación
- [ ] `npx tsc --noEmit`, eslint de `src/components/landing`, `npx vitest run`, `next build`
- [ ] Capturas 390/1280 de todas las secciones; carga en frío; `prefers-reduced-motion`
- [ ] Playwright sin marca de automatización: `Lead` + `/login?registro` en "Creá tu cuenta"; `Contact` en WhatsApp
- [ ] Revisión con skill `web-design-guidelines`
- [ ] Commit y `git push origin HEAD:main`
