"use client";

import { useState } from "react";
import type { ProductoBusqueda } from "@/lib/data/productos";
import { EscanerCamara } from "./EscanerCamara";
import { inputCls } from "./estilos";

/**
 * Campo «Código de barras» del formulario de producto, con botón para leerlo con la cámara.
 * Avisa si el código ya lo tiene otro producto (el servidor igual lo impide al guardar).
 */
export function CampoCodigoBarras({ valorInicial, productoId }: { valorInicial: string; productoId?: number }) {
  const [valor, setValor] = useState(valorInicial);
  const [escaneando, setEscaneando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function revisarDuplicado(codigo: string): Promise<string | null> {
    if (!codigo) return null;
    try {
      const r = await fetch(`/api/productos/buscar?q=${encodeURIComponent(codigo)}`);
      if (!r.ok) return null;
      const datos = (await r.json()) as ProductoBusqueda[];
      const otro = datos.find((p) => p.codigo_barras === codigo && p.id !== productoId);
      return otro ? `Este código ya lo tiene «${otro.nombre}» (${otro.codigo}).` : null;
    } catch {
      return null;
    }
  }

  async function alEscanear(codigo: string) {
    const texto = codigo.trim();
    setValor(texto);
    const duplicado = await revisarDuplicado(texto);
    setAviso(duplicado);
    setEscaneando(false);
    return duplicado ? { ok: false, mensaje: duplicado } : { ok: true, mensaje: `✓ ${texto}` };
  }

  return (
    <>
      <div className="relative">
        <input
          id="codigo_barras"
          name="codigo_barras"
          value={valor}
          onChange={(e) => {
            setValor(e.target.value);
            setAviso(null);
          }}
          onBlur={async () => setAviso(await revisarDuplicado(valor.trim()))}
          // Los lectores USB terminan con Enter: que no envíe el formulario.
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          autoComplete="off"
          className={`${inputCls} !pr-12`}
        />
        <button
          type="button"
          onClick={() => setEscaneando(true)}
          className="absolute right-1 top-1 bottom-1 grid w-10 place-items-center rounded-md bg-acento-600 text-white hover:bg-acento-700"
          aria-label="Leer el código de barras con la cámara"
          title="Leer con la cámara"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4.5 w-4.5" aria-hidden>
            <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
            <path d="M7 8v8M10 8v8M13 8v8M16 8v8" />
          </svg>
        </button>
      </div>
      {aviso && <p className="mt-1 text-xs font-medium text-amber-800">{aviso}</p>}
      {escaneando && <EscanerCamara onCodigo={alEscanear} onCerrar={() => setEscaneando(false)} />}
    </>
  );
}
