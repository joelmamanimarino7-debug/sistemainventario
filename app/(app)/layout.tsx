import { Navegacion } from "@/components/Navegacion";
import { exigirUsuario } from "@/lib/auth";
import { obtenerNegocio } from "@/lib/negocio";

// Pantallas del sistema (con menú). Cada página vuelve a revisar la sesión por su cuenta;
// aquí solo se usa el usuario para armar el menú.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  return (
    <>
      <Navegacion nombre={obtenerNegocio().nombre} usuario={usuario} />
      <main className="lg:pl-60 print:pl-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </>
  );
}
