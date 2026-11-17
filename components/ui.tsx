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
        <Link href={volver.href} className="mb-2 inline-block text-sm text-gris-500 hover:text-acento-700">
          ← {volver.texto}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-gris-900">{titulo}</h1>
          {descripcion && <p className="mt-1 text-sm text-gris-500">{descripcion}</p>}
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
    <section
      className={`rounded-2xl border border-gris-200/80 bg-papel shadow-[0_1px_2px_rgba(24,36,54,0.05),0_4px_16px_-8px_rgba(24,36,54,0.10)] ${className}`}
    >
      {titulo && (
        <header className="flex items-center justify-between gap-2 border-b border-gris-100 px-4 py-3">
          <h2 className="font-display text-[15px] font-semibold text-gris-900">{titulo}</h2>
          {acciones}
        </header>
      )}
      {children}
    </section>
  );
}

type Tono = "gris" | "verde" | "rojo" | "ambar" | "azul" | "acento";
const tonos: Record<Tono, string> = {
  gris: "bg-gris-100 text-gris-700 ring-gris-300/60",
  verde: "bg-oliva-50 text-oliva-700 ring-oliva-600/20",
  rojo: "bg-red-50 text-red-700 ring-red-600/20",
  ambar: "bg-amber-50 text-amber-800 ring-amber-600/25",
  azul: "bg-acento-100/70 text-acento-800 ring-acento-400/30", // ventas, vendedores
  acento: "bg-acento-50 text-acento-800 ring-acento-600/20",
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
      <p className="font-medium text-gris-800">{titulo}</p>
      {texto && <p className="mt-1 text-sm text-gris-500">{texto}</p>}
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
        <p className="mt-1 text-xs text-gris-500">{ayuda}</p>
      ) : null}
    </div>
  );
}

export function Aviso({ tipo, children }: { tipo: "error" | "ok"; children: ReactNode }) {
  const cls =
    tipo === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-oliva-600/25 bg-oliva-50 text-oliva-700";
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`rounded-lg border px-3 py-2 text-sm ${cls}`}>
      {children}
    </div>
  );
}

export function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gris-500">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm text-gris-900">{children || <span className="text-gris-400">—</span>}</dd>
    </div>
  );
}
