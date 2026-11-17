import type { Metadata } from "next";
import { FormMiClave } from "@/components/FormulariosCuenta";
import { Dato, Encabezado, Tarjeta } from "@/components/ui";
import { exigirUsuario, ROLES } from "@/lib/auth";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function CuentaPage() {
  const yo = await exigirUsuario();
  return (
    <>
      <Encabezado titulo="Mi cuenta" />
      <div className="grid max-w-4xl gap-6 md:grid-cols-2">
        <Tarjeta titulo="Mis datos" className="self-start">
          <dl className="space-y-3 p-4">
            <Dato etiqueta="Nombre">{yo.nombre}</Dato>
            <Dato etiqueta="Usuario">{yo.usuario}</Dato>
            <Dato etiqueta="Rol">{ROLES.find((r) => r.valor === yo.rol)?.texto}</Dato>
          </dl>
        </Tarjeta>
        <Tarjeta titulo="Cambiar contraseña" className="self-start">
          <FormMiClave />
        </Tarjeta>
      </div>
    </>
  );
}
