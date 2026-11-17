import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormLogin } from "@/components/FormulariosCuenta";
import { PantallaAcceso } from "@/components/PantallaAcceso";
import { hayUsuarios, usuarioActual } from "@/lib/auth";
import { obtenerNegocio } from "@/lib/negocio";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ siguiente?: string }> }) {
  if (!hayUsuarios()) redirect("/configurar");
  if (await usuarioActual()) redirect("/");
  const sp = await searchParams;
  return (
    <PantallaAcceso nombre={obtenerNegocio().nombre} titulo="Iniciar sesión">
      <FormLogin siguiente={sp.siguiente} />
      <p className="mt-4 text-center text-xs text-zinc-500">¿Olvidaste tu contraseña? Pide a un administrador que la cambie.</p>
    </PantallaAcceso>
  );
}
