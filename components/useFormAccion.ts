"use client";

import { type FormEvent, startTransition, useActionState } from "react";
import type { EstadoForm } from "@/lib/forms";

/**
 * Igual que useActionState, pero NO limpia el formulario cuando el servidor devuelve un error
 * (React limpia automáticamente los formularios que usan `action={...}`).
 */
export function useFormAccion(accion: (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>) {
  const [estado, despachar, pendiente] = useActionState<EstadoForm, FormData>(accion, {});
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => despachar(fd));
  };
  return { estado, onSubmit, pendiente };
}
