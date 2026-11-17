import type { Metadata } from "next";
import { FormConfiguracion } from "@/components/FormulariosCuenta";
import { Encabezado } from "@/components/ui";
import { exigirAdmin } from "@/lib/auth";
import { obtenerNegocio } from "@/lib/negocio";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  await exigirAdmin();
  return (
    <>
      <Encabezado titulo="Configuración" descripcion="Datos del negocio que aparecen en el sistema y en los tickets de venta." />
      <FormConfiguracion negocio={obtenerNegocio()} />
    </>
  );
}
