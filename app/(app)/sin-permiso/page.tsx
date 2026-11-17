import type { Metadata } from "next";
import Link from "next/link";
import { btnPrimario } from "@/components/estilos";
import { exigirUsuario } from "@/lib/auth";

export const metadata: Metadata = { title: "Sin permiso" };

export default async function SinPermisoPage() {
  await exigirUsuario();
  return (
    <div className="py-20 text-center">
      <p className="text-sm font-semibold text-teal-700">Acceso restringido</p>
      <h1 className="mt-2 text-2xl font-semibold">Esta pantalla es solo para administradores</h1>
      <p className="mt-2 text-zinc-500">Si necesitas hacer esto, pídeselo a un administrador.</p>
      <Link href="/" className={`${btnPrimario} mt-6`}>
        Ir al inicio
      </Link>
    </div>
  );
}
