"use client";

import { useRef, useState } from "react";
import { guardarAjustesRespaldoAccion, respaldarAhora } from "@/app/actions/respaldos";
import { btnChico, btnPeligro, btnPrimario, btnSecundario, inputCls } from "./estilos";
import { Aviso, Campo, Tarjeta } from "./ui";
import { useFormAccion } from "./useFormAccion";

export function BotonRespaldarAhora() {
  const { estado, onSubmit, pendiente } = useFormAccion(respaldarAhora);
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <button type="submit" disabled={pendiente} className={`${btnPrimario} w-full`}>
        {pendiente ? "Creando respaldo…" : "Respaldar ahora"}
      </button>
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
    </form>
  );
}

export function FormAjustesRespaldo({
  carpeta,
  porDefecto,
  carpetaPorDefecto,
  conservar,
  automatico,
  sugerencias,
}: {
  carpeta: string;
  porDefecto: boolean;
  carpetaPorDefecto: string;
  conservar: number;
  automatico: boolean;
  sugerencias: { nombre: string; ruta: string; detalle: string }[];
}) {
  const { estado, onSubmit, pendiente } = useFormAccion(guardarAjustesRespaldoAccion);
  const [ruta, setRuta] = useState(porDefecto ? "" : carpeta);

  return (
    <form onSubmit={onSubmit} className="space-y-4 p-4">
      <Campo
        label="Carpeta de respaldos"
        htmlFor="carpeta"
        ayuda={`Vacío = en esta computadora (${carpetaPorDefecto}).`}
      >
        <input
          id="carpeta"
          name="carpeta"
          value={ruta}
          onChange={(e) => setRuta(e.target.value)}
          placeholder={carpetaPorDefecto}
          className={`${inputCls} font-mono !text-xs`}
          spellCheck={false}
        />
      </Campo>

      {sugerencias.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-gris-600">Lugares encontrados en esta computadora:</p>
          <div className="flex flex-wrap gap-1.5">
            {sugerencias.map((s) => (
              <button
                key={s.ruta}
                type="button"
                onClick={() => setRuta(s.ruta)}
                title={s.ruta}
                className={`${btnSecundario} ${btnChico} ${ruta === s.ruta ? "!border-acento-500 !bg-acento-50 !text-acento-800" : ""}`}
              >
                {s.nombre}
                <span className="font-normal text-gris-500">· {s.detalle}</span>
              </button>
            ))}
            <button type="button" onClick={() => setRuta("")} className={`${btnSecundario} ${btnChico} ${ruta === "" ? "!border-acento-500 !bg-acento-50 !text-acento-800" : ""}`}>
              Esta computadora
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Conservar los últimos" htmlFor="conservar" ayuda="Los más antiguos se borran solos.">
          <div className="flex items-center gap-2">
            <input
              id="conservar"
              name="conservar"
              type="number"
              min={3}
              max={365}
              defaultValue={conservar}
              className={`${inputCls} tabular !w-24`}
            />
            <span className="text-sm text-gris-600">respaldos</span>
          </div>
        </Campo>
        <label className="flex items-start gap-2 pt-6 text-sm text-gris-700">
          <input type="checkbox" name="automatico" value="1" defaultChecked={automatico} className="mt-0.5 accent-acento-600" />
          <span>
            Respaldo automático diario
            <span className="block text-xs text-gris-500">Y también cada vez que se cierra la caja.</span>
          </span>
        </label>
      </div>

      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <button type="submit" disabled={pendiente} className={btnSecundario}>
        {pendiente ? "Guardando…" : "Guardar ajustes"}
      </button>
    </form>
  );
}

type Resultado = { ok: true; productos: number; ventas: number; imagenes: number } | { ok: false; error: string };

const AVISO_RESTAURAR =
  "Se reemplazarán TODOS los datos actuales (productos, ventas, caja, usuarios…) por los del respaldo.\n\n" +
  "Antes se guardará un respaldo del estado actual, por si necesitas volver atrás.\n\n" +
  "Después todos tendrán que iniciar sesión otra vez, con los usuarios y contraseñas del respaldo.\n\n¿Continuar?";

async function enviarRestauracion(fd: FormData): Promise<Resultado> {
  try {
    const r = await fetch("/api/respaldos/restaurar", { method: "POST", body: fd });
    return (await r.json()) as Resultado;
  } catch {
    return { ok: false, error: "No se pudo conectar con el sistema." };
  }
}

function Exito({ r }: { r: Extract<Resultado, { ok: true }> }) {
  return (
    <Aviso tipo="ok">
      Respaldo restaurado: {r.productos} productos, {r.ventas} ventas y {r.imagenes} fotos. Llevándote a iniciar sesión…
    </Aviso>
  );
}

function terminar() {
  setTimeout(() => (window.location.href = "/login"), 3000);
}

/** Botón «Restaurar» de un respaldo de la lista. */
export function BotonRestaurar({ archivo, fecha }: { archivo: string; fecha: string }) {
  const [enCurso, setEnCurso] = useState(false);
  const [res, setRes] = useState<Resultado | null>(null);
  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={enCurso}
        className={`${btnPeligro} ${btnChico}`}
        onClick={async () => {
          if (!window.confirm(`Restaurar el respaldo del ${fecha}.\n\n${AVISO_RESTAURAR}`)) return;
          setEnCurso(true);
          const fd = new FormData();
          fd.set("archivo", archivo);
          const r = await enviarRestauracion(fd);
          setRes(r);
          setEnCurso(false);
          if (r.ok) terminar();
        }}
      >
        {enCurso ? "Restaurando…" : "Restaurar"}
      </button>
      {res && (res.ok ? <Exito r={res} /> : <span className="max-w-64 text-right text-xs text-red-600">{res.error}</span>)}
    </div>
  );
}

/** Restaurar un respaldo traído de otro lugar (USB, descarga, otra computadora). */
export function RestaurarDesdeArchivo() {
  const input = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState<string | null>(null);
  const [enCurso, setEnCurso] = useState(false);
  const [res, setRes] = useState<Resultado | null>(null);

  return (
    <div className="space-y-3 p-4">
      <p className="text-sm text-gris-600">
        Para pasar los datos a otra computadora o recuperar un respaldo guardado en un USB o en la nube.
      </p>
      <input
        ref={input}
        type="file"
        accept=".zip,application/zip"
        className="block w-full text-sm text-gris-700 file:mr-3 file:rounded-lg file:border file:border-gris-300 file:bg-papel file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gris-800 hover:file:bg-gris-50"
        onChange={(e) => {
          setRes(null);
          setNombre(e.target.files?.[0]?.name ?? null);
        }}
      />
      <button
        type="button"
        disabled={!nombre || enCurso}
        className={btnPeligro}
        onClick={async () => {
          const f = input.current?.files?.[0];
          if (!f) return;
          if (!window.confirm(`Restaurar «${f.name}».\n\n${AVISO_RESTAURAR}`)) return;
          setEnCurso(true);
          const fd = new FormData();
          fd.set("zip", f);
          const r = await enviarRestauracion(fd);
          setRes(r);
          setEnCurso(false);
          if (r.ok) terminar();
        }}
      >
        {enCurso ? "Restaurando…" : "Restaurar este respaldo"}
      </button>
      {res && (res.ok ? <Exito r={res} /> : <Aviso tipo="error">{res.error}</Aviso>)}
    </div>
  );
}

export function TarjetaRestaurarArchivo() {
  return (
    <Tarjeta titulo="Restaurar desde un archivo">
      <RestaurarDesdeArchivo />
    </Tarjeta>
  );
}
