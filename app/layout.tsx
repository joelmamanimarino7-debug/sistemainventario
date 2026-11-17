import type { Metadata } from "next";
import "./globals.css";
import { obtenerNegocio } from "@/lib/negocio";

// Todas las páginas leen la base de datos en cada visita (nunca se generan como estáticas).
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const nombre = obtenerNegocio().nombre;
  return {
    title: { default: nombre, template: `%s · ${nombre}` },
    description: "Sistema de control de inventario",
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
