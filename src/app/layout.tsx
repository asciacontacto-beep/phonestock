import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { MetaPixel } from "@/components/MetaPixel";

// Deshabilitamos next/font/google por problemas de red durante el build
// Usaremos variables de entorno y fallback a fuentes del sistema
const interVariable = "font-sans";
const jetbrainsVariable = "font-mono";

export const viewport: Viewport = {
  /* La barra del navegador en el celular tiene que acompañar al tema, si no
     queda una franja clara arriba de una app oscura. Los dos valores son los
     de `--bg` en cada tema.

     Esto cubre la preferencia del sistema; cuando el usuario elige el tema a
     mano con el botón, `BotonTema` reescribe la etiqueta, porque esa
     elección manda sobre la del sistema. */
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0d" },
  ],
  width: "device-width",
  initialScale: 1,
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://stackrarg.vercel.app";

export const metadata: Metadata = {
  // Base para resolver las URLs relativas de OG/Twitter (og-image, logo).
  // Sin esto Next las resuelve contra localhost y se rompen los previews.
  metadataBase: new URL(siteUrl),
  title: "Stackr — Software de Gestión para Locales de Celulares y Servicio Técnico",
  description: "Gestioná stock, reparaciones, ventas, cuenta corriente y caja de tu local de celulares en un solo lugar. $50.000 por mes sin permanencia, o licencia de por vida. Probalo gratis 7 días.",
  keywords: [
    "software gestión celulares",
    "sistema punto de venta celulares",
    "gestión servicio técnico",
    "inventario telefonía",
    "POS celulares Argentina",
    "software tienda de celulares",
    "gestión reparaciones smartphone",
    "sistema stock celulares",
    "ERP telefonía",
    "software local tecnología",
  ],
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://stackrarg.vercel.app",
  },
  openGraph: {
    title: "Stackr — Software de Gestión para Locales de Celulares",
    description: "Stock, ventas, reparaciones, cuenta corriente y caja. $50.000 por mes sin permanencia. Probalo gratis 7 días.",
    url: "https://stackrarg.vercel.app",
    siteName: "Stackr",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Stackr — Dashboard de gestión para locales de celulares",
      },
    ],
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stackr — Software de Gestión para Locales de Celulares",
    description: "Stock, ventas, reparaciones, cuenta corriente y caja. $50.000 por mes sin permanencia.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: "/logo.jpg",
    shortcut: "/logo.jpg",
    // iOS espera un PNG cuadrado de 180px; antes apuntaba a la foto de 1254px.
    apple: "/apple-touch-icon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Stackr",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web, iOS, Android",
  "description": "Software de gestión para locales de celulares y servicio técnico. Gestión de stock, reparaciones, punto de venta y finanzas.",
  "url": "https://stackrarg.vercel.app",
  /* Los dos planes. Si el precio cambia, se cambia acá y en
     src/components/landing/precios.ts — son los dos únicos lugares. */
  "offers": [
    {
      "@type": "Offer",
      "price": "50000",
      "priceCurrency": "ARS",
      "priceValidUntil": "2027-12-31",
      "availability": "https://schema.org/InStock",
      "description": "Suscripción mensual, sin permanencia",
    },
    {
      "@type": "Offer",
      "price": "300000",
      "priceCurrency": "ARS",
      "priceValidUntil": "2027-12-31",
      "availability": "https://schema.org/InStock",
      "description": "Licencia de por vida, un solo pago",
    },
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "5",
    "reviewCount": "3",
  },
  "author": {
    "@type": "Person",
    "name": "Juan Pedro Nielsen",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* El tema se aplica ANTES de pintar. Si esperara a que React
            montara, la pantalla arrancaría en claro y saltaría a oscuro:
            un flash blanco en la cara del que eligió oscuro. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('stackr-tema');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t;var c=t==='dark'?'#0b0c0d':'#fbfbfa';var m=document.querySelector('meta[name="theme-color"]:not([media])');if(!m){m=document.createElement('meta');m.setAttribute('name','theme-color');document.head.appendChild(m)}m.setAttribute('content',c)}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${interVariable} ${jetbrainsVariable} antialiased`} suppressHydrationWarning>
        {children}
        <Toaster theme="system" position="bottom-right" richColors />
        <MetaPixel />
      </body>
    </html>
  );
}
