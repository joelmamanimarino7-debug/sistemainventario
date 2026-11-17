"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { ProductoBusqueda } from "@/lib/data/productos";
import { cantidad, dinero, nombreUnidad } from "@/lib/format";
import { EscanerCamara } from "./EscanerCamara";
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
    /** Muestra el botón para escanear con la cámara (por defecto sí). */
    camara?: boolean;
  }
>(function BuscadorProductos({ onElegir, precio, placeholder, camara = true }, ref) {
  const [escaneando, setEscaneando] = useState(false);
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

  /** Código leído con la cámara: agrega el producto si el código coincide exactamente. */
  const alEscanear = useCallback(
    async (codigo: string) => {
      const texto = codigo.trim();
      try {
        const r = await fetch(`/api/productos/buscar?q=${encodeURIComponent(texto)}`);
        if (r.status === 401) return { ok: false, mensaje: "Tu sesión terminó. Vuelve a iniciar sesión." };
        const datos = (await r.json()) as ProductoBusqueda[];
        const p = datos.find((x) => x.codigo.toLowerCase() === texto.toLowerCase() || x.codigo_barras === texto);
        if (!p) return { ok: false, mensaje: `No hay ningún producto con el código ${texto}` };
        onElegir(p);
        return { ok: true, mensaje: `✓ ${p.nombre}` };
      } catch {
        return { ok: false, mensaje: "Sin conexión con el sistema. Revisa el wifi." };
      }
    },
    [onElegir],
  );

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
        className={`${inputCls} !py-2.5 !text-base ${camara ? "!pr-14" : ""}`}
        role="combobox"
        aria-expanded={abierto}
        aria-controls="resultados-busqueda"
        autoComplete="off"
      />
      {cargando && <span className={`absolute top-3 text-xs text-tierra-400 ${camara ? "right-14" : "right-3"}`}>Buscando…</span>}
      {camara && (
        <button
          type="button"
          onClick={() => setEscaneando(true)}
          className="absolute right-1.5 top-1.5 grid h-9 w-11 place-items-center rounded-md bg-acento-700 text-white hover:bg-acento-800"
          aria-label="Escanear código de barras con la cámara"
          title="Escanear con la cámara"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden>
            <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
            <path d="M7 8v8M10 8v8M13 8v8M16 8v8" />
          </svg>
        </button>
      )}
      {escaneando && <EscanerCamara onCodigo={alEscanear} onCerrar={() => setEscaneando(false)} />}

      {abierto && (
        <ul
          id="resultados-busqueda"
          role="listbox"
          className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-tierra-200 bg-papel py-1 shadow-lg"
        >
          {resultados.length === 0 ? (
            <li className="px-3 py-3 text-sm text-tierra-500">Sin resultados para “{q}”.</li>
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
                  i === indice ? "bg-acento-50" : ""
                }`}
              >
                <Miniatura imagen={p.imagen} alt="" tam={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-tierra-900">{p.nombre}</p>
                  <p className="truncate text-xs text-tierra-500">
                    <span className="font-mono">{p.codigo}</span>
                    {[p.marca, p.modelo].filter(Boolean).length > 0 && ` · ${[p.marca, p.modelo].filter(Boolean).join(" · ")}`}
                  </p>
                </div>
                <div className="tabular shrink-0 text-right">
                  <p className="font-medium">{dinero(precio === "venta" ? p.precio_venta : p.precio_costo)}</p>
                  <p className={`text-xs ${p.stock <= 0 ? "text-red-600" : "text-tierra-500"}`}>
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
