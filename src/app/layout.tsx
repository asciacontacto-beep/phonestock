import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";

// Deshabilitamos next/font/google por problemas de red durante el build
// Usaremos variables de entorno y fallback a fuentes del sistema
const interVariable = "font-sans";
const jetbrainsVariable = "font-mono";

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Stackr — Software de Gestión para Locales de Celulares y Servicio Técnico",
  description: "Gestioná stock, reparaciones, ventas y finanzas de tu local de tecnología en un solo lugar. Pago único de $400 USD, sin mensualidades. Probalo gratis 48hs.",
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
    description: "Stock, reparaciones, ventas y finanzas. Pago único, sin mensualidades. Probalo gratis 48hs.",
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
    description: "Stock, reparaciones, ventas y finanzas. Pago único, sin mensualidades.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: "/logo.jpg",
    shortcut: "/logo.jpg",
    apple: "/logo.jpg",
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
  "offers": {
    "@type": "Offer",
    "price": "400",
    "priceCurrency": "USD",
    "priceValidUntil": "2027-12-31",
    "availability": "https://schema.org/InStock",
    "description": "Licencia de por vida, pago único sin mensualidades",
  },
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
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${interVariable} ${jetbrainsVariable} antialiased`}>
        {children}
        <Toaster theme="dark" position="bottom-right" richColors />
      </body>
    </html>
  );
}
