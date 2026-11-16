"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { btnPrimario } from "./estilos";

/** Botón de envío que se deshabilita mientras el formulario se procesa. */
export function BotonEnviar({
  children,
  className = btnPrimario,
  textoCargando = "Guardando…",
}: {
  children: ReactNode;
  className?: string;
  textoCargando?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? textoCargando : children}
    </button>
  );
}

/** Botón de envío que pide confirmación antes de mandar el formulario. */
export function BotonConfirmar({
  children,
  mensaje,
  className,
}: {
  children: ReactNode;
  mensaje: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (!window.confirm(mensaje)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
