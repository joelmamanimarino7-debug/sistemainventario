import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormPrimerAdmin } from "@/components/FormulariosCuenta";
import { PantallaAcceso } from "@/components/PantallaAcceso";
import { hayUsuarios } from "@/lib/auth";
import { obtenerNegocio } from "@/lib/negocio";

export const metadata: Metadata = { title: "Primer uso" };

// Solo existe mientras no haya ningún usuario: crea el primer administrador.
export default function ConfigurarPage() {
  if (hayUsuarios()) redirect("/login");
  return (
    <PantallaAcceso
      nombre={obtenerNegocio().nombre}
      titulo="Bienvenido"
      texto="Crea tu usuario de administrador. Después podrás agregar a tus vendedores desde Usuarios."
    >
      <FormPrimerAdmin />
    </PantallaAcceso>
  );
}
