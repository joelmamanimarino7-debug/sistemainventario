import Link from "next/link";
import { btnPrimario } from "@/components/estilos";

export default function NoEncontrado() {
  return (
    <div className="py-20 text-center">
      <p className="text-sm font-semibold text-acento-700">404</p>
      <h1 className="mt-2 text-2xl font-semibold">No encontramos esta página</h1>
      <p className="mt-2 text-gris-500">Puede que el registro no exista o que el enlace esté mal.</p>
      <Link href="/" className={`${btnPrimario} mt-6`}>
        Ir al inicio
      </Link>
    </div>
  );
}
