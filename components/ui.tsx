import Link from "next/link";
import type { ReactNode } from "react";
import { labelCls } from "./estilos";

export function Encabezado({
  titulo,
  descripcion,
  acciones,
  volver,
}: {
  titulo: ReactNode;
  descripcion?: ReactNode;
  acciones?: ReactNode;
  volver?: { href: string; texto: string };
}) {
  return (
    <div className="mb-6">
      {volver && (
        <Link href={volver.href} className="mb-2 inline-block text-sm text-zinc-500 hover:text-zinc-800">
          ← {volver.texto}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{titulo}</h1>
          {descripcion && <p className="mt-1 text-sm text-zinc-500">{descripcion}</p>}
        </div>
        {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
      </div>
    </div>
  );
}

export function Tarjeta({
  children,
  className = "",
  titulo,
  acciones,
}: {
  children: ReactNode;
  className?: string;
  titulo?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-zinc-200 bg-white shadow-xs ${className}`}>
      {titulo && (
        <header className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-800">{titulo}</h2>
          {acciones}
        </header>
      )}
      {children}
    </section>
  );
}

type Tono = "gris" | "verde" | "rojo" | "ambar" | "azul" | "teal";
const tonos: Record<Tono, string> = {
  gris: "bg-zinc-100 text-zinc-700",
  verde: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  rojo: "bg-red-50 text-red-700 ring-red-600/20",
  ambar: "bg-amber-50 text-amber-800 ring-amber-600/20",
  azul: "bg-sky-50 text-sky-700 ring-sky-600/20",
  teal: "bg-teal-50 text-teal-800 ring-teal-600/20",
};

export function Etiqueta({ tono = "gris", children }: { tono?: Tono; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-transparent ${tonos[tono]}`}
    >
      {children}
    </span>
  );
}

export function Vacio({ titulo, texto, accion }: { titulo: string; texto?: string; accion?: ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-medium text-zinc-800">{titulo}</p>
      {texto && <p className="mt-1 text-sm text-zinc-500">{texto}</p>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

export function Campo({
  label,
  htmlFor,
  error,
  ayuda,
  children,
  className = "",
  requerido,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  ayuda?: string;
  children: ReactNode;
  className?: string;
  requerido?: boolean;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={labelCls}>
        {label}
        {requerido && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : ayuda ? (
        <p className="mt-1 text-xs text-zinc-500">{ayuda}</p>
      ) : null}
    </div>
  );
}

export function Aviso({ tipo, children }: { tipo: "error" | "ok"; children: ReactNode }) {
  const cls =
    tipo === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`rounded-lg border px-3 py-2 text-sm ${cls}`}>
      {children}
    </div>
  );
}

export function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm text-zinc-900">{children || <span className="text-zinc-400">—</span>}</dd>
    </div>
  );
}
