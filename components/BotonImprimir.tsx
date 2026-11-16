"use client";

import { btnSecundario } from "./estilos";

export function BotonImprimir() {
  return (
    <button onClick={() => window.print()} className={btnSecundario}>
      Imprimir
    </button>
  );
}
