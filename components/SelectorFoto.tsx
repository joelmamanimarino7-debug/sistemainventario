"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { btnChico, btnFantasma, btnSecundario } from "./estilos";
import { urlImagen } from "./Foto";

const MAX_MB = 20;

/**
 * Campo de foto con vista previa. Envía el archivo como "imagen" y, si el usuario quita
 * la foto existente, envía "quitar_imagen=1".
 */
export function SelectorFoto({ actual, error }: { actual?: string | null; error?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(actual ? urlImagen(actual) : null);
  const [quitar, setQuitar] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);

  // Liberar la URL temporal de la vista previa
  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function usarArchivo(f: File | undefined) {
    setAviso(null);
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setAviso("Elige un archivo de imagen.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setAviso(`La foto pesa más de ${MAX_MB} MB.`);
      if (input.current) input.current.value = "";
      return;
    }
    setPreview(URL.createObjectURL(f));
    setQuitar(false);
  }

  function quitarFoto() {
    if (input.current) input.current.value = "";
    setPreview(null);
    setQuitar(!!actual);
  }

  return (
    <div>
      <input
        ref={input}
        type="file"
        name="imagen"
        accept="image/*"
        className="sr-only"
        id="imagen"
        onChange={(e) => usarArchivo(e.target.files?.[0])}
      />
      {quitar && <input type="hidden" name="quitar_imagen" value="1" />}

      <label
        htmlFor="imagen"
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          const f = e.dataTransfer.files?.[0];
          if (f && input.current) {
            // Pasamos el archivo soltado al input para que viaje con el formulario.
            const dt = new DataTransfer();
            dt.items.add(f);
            input.current.files = dt.files;
            usarArchivo(f);
          }
        }}
        className={`group relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
          arrastrando ? "border-acento-600 bg-acento-50" : preview ? "border-transparent bg-tierra-50" : "border-tierra-300 bg-tierra-50 hover:border-acento-600"
        }`}
      >
        {preview ? (
          <>
            <img src={preview} alt="Foto del producto" className="h-full w-full object-contain" />
            <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1.5 text-center text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              Cambiar foto
            </span>
          </>
        ) : (
          <span className="px-4 text-center text-sm text-tierra-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 h-8 w-8 text-tierra-400" aria-hidden>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="9" cy="10" r="2" />
              <path d="m4 18 5-5 4 4 3-3 4 4" />
            </svg>
            <span className="font-medium text-acento-700">Subir foto</span>
            <span className="block text-xs">o arrástrala aquí</span>
          </span>
        )}
      </label>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <label htmlFor="imagen" className={`${btnSecundario} ${btnChico} cursor-pointer`}>
          {preview ? "Cambiar" : "Elegir archivo"}
        </label>
        {preview && (
          <button type="button" onClick={quitarFoto} className={`${btnFantasma} ${btnChico}`}>
            Quitar
          </button>
        )}
      </div>
      {(aviso || error) && <p className="mt-1 text-xs text-red-600">{aviso || error}</p>}
      {!aviso && !error && (
        <p className="mt-1 text-xs text-tierra-500">JPG, PNG o WebP. Los bordes negros se recortan solos.</p>
      )}
    </div>
  );
}
