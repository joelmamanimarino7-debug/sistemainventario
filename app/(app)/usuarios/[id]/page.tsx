import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormUsuario } from "@/components/FormulariosCuenta";
import { Encabezado } from "@/components/ui";
import { exigirAdmin, ROLES } from "@/lib/auth";
import { obtenerUsuario } from "@/lib/data/usuarios";

export const metadata: Metadata = { title: "Editar usuario" };

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const yo = await exigirAdmin();
  const { id } = await params;
  const u = obtenerUsuario(Number(id));
  if (!u) notFound();
  return (
    <div className="max-w-3xl">
      <Encabezado titulo={u.nombre} descripcion="Editar usuario" volver={{ href: "/usuarios", texto: "Usuarios" }} />
      <FormUsuario usuario={u} roles={ROLES} esYo={u.id === yo.id} />
    </div>
  );
}
