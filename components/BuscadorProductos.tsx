"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { ProductoBusqueda } from "@/lib/data/productos";
import { cantidad, dinero, nombreUnidad } from "@/lib/format";
import { inputCls } from "./estilos";
import { Miniatura } from "./Foto";

export type BuscadorRef = { enfocar: () => void };

/**
 * Buscador con lista desplegable. Funciona con teclado (↑ ↓ Enter Esc) y con lector de códigos de barras:
 * si el texto coincide exactamente con un código, Enter lo agrega directo.
 */
export const BuscadorProductos = forwardRef<
  BuscadorRef,
  {
    onElegir: (p: ProductoBusqueda) => void;
    precio: "venta" | "costo";
    placeholder?: string;
  }
>(function BuscadorProductos({ onElegir, precio, placeholder }, ref) {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<ProductoBusqueda[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [indice, setIndice] = useState(0);
  const [cargando, setCargando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const ultimaBusqueda = useRef<{ q: string; res: ProductoBusqueda[] }>({ q: "", res: [] });

  useImperativeHandle(ref, () => ({ enfocar: () => inputRef.current?.focus() }));

  useEffect(() => {
    const texto = q.trim();
    if (!texto) {
      setResultados([]);
      setAbierto(false);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setCargando(true);
      try {
        const r = await fetch(`/api/productos/buscar?q=${encodeURIComponent(texto)}`, { signal: ctrl.signal });
        const datos = (await r.json()) as ProductoBusqueda[];
        ultimaBusqueda.current = { q: texto, res: datos };
        setResultados(datos);
        setIndice(0);
        setAbierto(true);
      } catch {
        /* búsqueda cancelada */
      } finally {
        setCargando(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  function elegir(p: ProductoBusqueda) {
    onElegir(p);
    setQ("");
    setResultados([]);
    setAbierto(false);
    inputRef.current?.focus();
  }

  async function alPresionarEnter() {
    const texto = q.trim();
    if (!texto) return;
    // Si los resultados en pantalla ya corresponden al texto, usamos el seleccionado.
    if (abierto && ultimaBusqueda.current.q === texto && resultados[indice]) {
      elegir(resultados[indice]);
      return;
    }
    // Si no (p. ej. lector de códigos que escribe y da Enter de inmediato), buscamos ya.
    const r = await fetch(`/api/productos/buscar?q=${encodeURIComponent(texto)}`);
    const datos = (await r.json()) as ProductoBusqueda[];
    const exacto = datos.find(
      (p) => p.codigo.toLowerCase() === texto.toLowerCase() || p.codigo_barras === texto,
    );
    if (exacto || datos.length === 1) elegir(exacto ?? datos[0]);
    else {
      setResultados(datos);
      setAbierto(true);
      setIndice(0);
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => resultados.length && setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIndice((i) => Math.min(i + 1, resultados.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIndice((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            void alPresionarEnter();
          } else if (e.key === "Escape") {
            setAbierto(false);
          }
        }}
        placeholder={placeholder ?? "Buscar producto por nombre, código o escanear…"}
        className={`${inputCls} !py-2.5 !text-base`}
        role="combobox"
        aria-expanded={abierto}
        aria-controls="resultados-busqueda"
        autoComplete="off"
      />
      {cargando && <span className="absolute right-3 top-3 text-xs text-zinc-400">Buscando…</span>}

      {abierto && (
        <ul
          id="resultados-busqueda"
          role="listbox"
          className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
        >
          {resultados.length === 0 ? (
            <li className="px-3 py-3 text-sm text-zinc-500">Sin resultados para “{q}”.</li>
          ) : (
            resultados.map((p, i) => (
              <li
                key={p.id}
                role="option"
                aria-selected={i === indice}
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(p);
                }}
                onMouseEnter={() => setIndice(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ${
                  i === indice ? "bg-teal-50" : ""
                }`}
              >
                <Miniatura imagen={p.imagen} alt="" tam={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-900">{p.nombre}</p>
                  <p className="truncate text-xs text-zinc-500">
                    <span className="font-mono">{p.codigo}</span>
                    {[p.marca, p.modelo].filter(Boolean).length > 0 && ` · ${[p.marca, p.modelo].filter(Boolean).join(" · ")}`}
                  </p>
                </div>
                <div className="tabular shrink-0 text-right">
                  <p className="font-medium">{dinero(precio === "venta" ? p.precio_venta : p.precio_costo)}</p>
                  <p className={`text-xs ${p.stock <= 0 ? "text-red-600" : "text-zinc-500"}`}>
                    {p.stock <= 0 ? "Agotado" : `${cantidad(p.stock)} ${nombreUnidad(p.stock, p.unidad)}`}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
});
