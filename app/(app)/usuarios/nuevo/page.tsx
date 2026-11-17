import type { Metadata } from "next";
import { FormUsuario } from "@/components/FormulariosCuenta";
import { Encabezado } from "@/components/ui";
import { exigirAdmin, ROLES } from "@/lib/auth";

export const metadata: Metadata = { title: "Nuevo usuario" };

export default async function NuevoUsuarioPage() {
  await exigirAdmin();
  return (
    <div className="max-w-3xl">
      <Encabezado titulo="Nuevo usuario" volver={{ href: "/usuarios", texto: "Usuarios" }} />
      <FormUsuario roles={ROLES} />
    </div>
  );
}
