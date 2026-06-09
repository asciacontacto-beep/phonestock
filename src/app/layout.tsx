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
  title: "Stackr — Gestión de Tiendas de Celulares y Servicio Técnico",
  description: "La plataforma definitiva para gestionar stock, reparaciones, ventas y finanzas de tu local de tecnología. Todo en un solo lugar.",
  keywords: ["stock", "inventario", "reparaciones", "servicio técnico", "celulares", "pos", "punto de venta"],
  manifest: "/manifest.json",
  openGraph: {
    title: "Stackr — Gestión de Tiendas de Celulares",
    description: "La plataforma definitiva para gestionar stock y reparaciones.",
    url: "https://stackr.app",
    siteName: "Stackr",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Stackr Dashboard",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stackr — Gestión de Tiendas de Celulares",
    description: "La plataforma definitiva para gestionar stock y reparaciones.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: "/logo.jpg",
    shortcut: "/logo.jpg",
    apple: "/logo.jpg"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${interVariable} ${jetbrainsVariable} antialiased`}>
        {children}
        <Toaster theme="dark" position="bottom-right" richColors />
      </body>
    </html>
  );
}
