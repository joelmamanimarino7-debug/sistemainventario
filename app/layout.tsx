import type { Metadata } from "next";
import "./globals.css";
import { Navegacion } from "@/components/Navegacion";
import { CONFIG } from "@/lib/config";

// Todas las páginas leen la base de datos en cada visita (nunca se generan como estáticas).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: CONFIG.nombreNegocio, template: `%s · ${CONFIG.nombreNegocio}` },
  description: "Sistema de control de inventario",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <Navegacion nombre={CONFIG.nombreNegocio} />
        <main className="lg:pl-60 print:pl-0">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
