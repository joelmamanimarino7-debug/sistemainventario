"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { abrirCaja, cerrarCaja, registrarMovimientoCaja } from "@/app/actions/caja";
import { DENOMINACIONES } from "@/lib/config";
import { aCentavos, centavosAInput, dinero } from "@/lib/format";
import { btnChico, btnFantasma, btnPrimario, btnSecundario, inputCls } from "./estilos";
import { Aviso, Campo } from "./ui";
import { useFormAccion } from "./useFormAccion";

export function FormAbrirCaja({ sugerido }: { sugerido?: number | null }) {
  const { estado, onSubmit, pendiente } = useFormAccion(abrirCaja);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Campo
        label="Efectivo inicial en caja"
        htmlFor="monto_inicial"
        error={estado.campos?.monto_inicial}
        ayuda="El cambio con el que empiezas el día. Escribe 0 si la caja empieza vacía."
      >
        <input
          id="monto_inicial"
          name="monto_inicial"
          inputMode="decimal"
          defaultValue={sugerido != null ? centavosAInput(sugerido) : ""}
          placeholder="0,00"
          className={`${inputCls} tabular !text-lg`}
          autoFocus
          required
        />
      </Campo>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <button type="submit" disabled={pendiente} className={`${btnPrimario} w-full !py-2.5`}>
        {pendiente ? "Abriendo…" : "Abrir caja"}
      </button>
    </form>
  );
}

export function FormMovimientoCaja() {
  const { estado, onSubmit, pendiente } = useFormAccion(registrarMovimientoCaja);
  const form = useRef<HTMLFormElement>(null);
  const [tipo, setTipo] = useState<"retiro" | "ingreso">("retiro");
  useEffect(() => {
    if (estado.ok) form.current?.reset();
  }, [estado]);

  return (
    <form ref={form} onSubmit={onSubmit} className="space-y-3 p-4">
      <input type="hidden" name="tipo" value={tipo} />
      <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Tipo">
        {(
          [
            ["retiro", "Sale efectivo", "Pago a proveedor, gastos, retiro"],
            ["ingreso", "Entra efectivo", "Más cambio, otro ingreso"],
          ] as const
        ).map(([valor, texto, ayuda]) => (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={tipo === valor}
            onClick={() => setTipo(valor)}
            className={`rounded-lg border px-3 py-2 text-left text-sm ${
              tipo === valor ? "border-acento-500 bg-acento-50 text-acento-900" : "border-gris-200 text-gris-700 hover:bg-gris-50"
            }`}
          >
            <span className="block font-medium">{texto}</span>
            <span className="block text-xs text-gris-500">{ayuda}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
        <Campo label="Monto" htmlFor="monto_mov" error={estado.campos?.monto}>
          <input id="monto_mov" name="monto" inputMode="decimal" placeholder="0,00" className={`${inputCls} tabular`} required />
        </Campo>
        <Campo label="Motivo" htmlFor="motivo_mov" error={estado.campos?.motivo}>
          <input
            id="motivo_mov"
            name="motivo"
            maxLength={200}
            placeholder={tipo === "retiro" ? "Ej.: pago de pasaje, compra de bolsas" : "Ej.: cambio adicional"}
            className={inputCls}
            required
          />
        </Campo>
      </div>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
      <button type="submit" disabled={pendiente} className={btnSecundario}>
        {pendiente ? "Guardando…" : tipo === "retiro" ? "Registrar salida" : "Registrar entrada"}
      </button>
    </form>
  );
}

/**
 * Cierre de caja. El administrador ve cuánto efectivo debería haber; el vendedor cuenta "a ciegas"
 * (no ve el esperado antes de cerrar), que es lo recomendado para controlar faltantes.
 */
export function FormCerrarCaja({ cajaId, esperado }: { cajaId: number; esperado: number | null }) {
  const { estado, onSubmit, pendiente } = useFormAccion(cerrarCaja);
  const [porBilletes, setPorBilletes] = useState(false);
  const [total, setTotal] = useState("");
  const [cantidades, setCantidades] = useState<Record<number, string>>({});

  const contadoBilletes = DENOMINACIONES.reduce((s, d) => s + d.valor * (Number(cantidades[d.valor]) || 0), 0);
  const contado = porBilletes ? contadoBilletes : aCentavos(total);
  const diferencia = esperado != null && contado != null ? contado - esperado : null;

  function enviar(e: FormEvent<HTMLFormElement>) {
    if (contado == null) {
      e.preventDefault();
      return;
    }
    if (!window.confirm(`¿Cerrar la caja con ${dinero(contado)} contados?\n\nDespués no se podrá vender hasta abrir una caja nueva.`)) {
      e.preventDefault();
      return;
    }
    onSubmit(e);
  }

  return (
    <form onSubmit={enviar} className="space-y-4 p-4">
      <input type="hidden" name="caja_id" value={cajaId} />
      <input type="hidden" name="efectivo_contado" value={contado != null ? centavosAInput(contado) : ""} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-gris-800">¿Cuánto efectivo hay en la caja?</p>
        <button type="button" onClick={() => setPorBilletes((v) => !v)} className={`${btnFantasma} ${btnChico}`}>
          {porBilletes ? "Escribir el total" : "Contar por billetes y monedas"}
        </button>
      </div>

      {porBilletes ? (
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {DENOMINACIONES.map((d) => {
            const n = Number(cantidades[d.valor]) || 0;
            return (
              <label key={d.valor} className="flex items-center gap-2 text-sm">
                <span
                  className={`w-16 shrink-0 rounded-md px-2 py-1 text-center text-xs font-semibold ${
                    d.tipo === "billete" ? "bg-oliva-50 text-oliva-700" : "bg-gris-100 text-gris-700"
                  }`}
                >
                  Bs {d.texto}
                </span>
                <span className="text-gris-400">×</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={cantidades[d.valor] ?? ""}
                  onChange={(e) => setCantidades((c) => ({ ...c, [d.valor]: e.target.value }))}
                  className={`${inputCls} tabular !w-16 !px-2 !py-1 text-center`}
                  aria-label={`Cantidad de ${d.tipo === "billete" ? "billetes" : "monedas"} de ${d.texto} bolivianos`}
                />
                {n > 0 && <span className="tabular whitespace-nowrap text-xs text-gris-500">{dinero(n * d.valor)}</span>}
              </label>
            );
          })}
        </div>
      ) : (
        <input
          inputMode="decimal"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          placeholder="0,00"
          className={`${inputCls} tabular !text-lg`}
          aria-label="Efectivo contado"
        />
      )}

      <div className="space-y-1 rounded-lg bg-gris-50 px-4 py-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gris-600">Contado</span>
          <span className="tabular font-semibold">{contado != null ? dinero(contado) : "—"}</span>
        </div>
        {esperado != null && (
          <>
            <div className="flex justify-between">
              <span className="text-gris-600">Debería haber</span>
              <span className="tabular">{dinero(esperado)}</span>
            </div>
            {diferencia != null && (
              <div className="flex justify-between border-t border-gris-200 pt-1">
                <span className="text-gris-600">Diferencia</span>
                <EtiquetaDiferencia diferencia={diferencia} />
              </div>
            )}
          </>
        )}
      </div>

      <Campo label="Nota del cierre" htmlFor="nota_cierre" ayuda="Opcional. Ej.: explicación de una diferencia.">
        <textarea id="nota_cierre" name="nota_cierre" rows={2} maxLength={300} className={inputCls} />
      </Campo>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <button type="submit" disabled={pendiente || contado == null} className={`${btnPrimario} w-full !py-2.5`}>
        {pendiente ? "Cerrando…" : "Cerrar caja"}
      </button>
    </form>
  );
}

export function EtiquetaDiferencia({ diferencia }: { diferencia: number }) {
  if (diferencia === 0) return <span className="tabular font-semibold text-oliva-700">Cuadra exacto</span>;
  if (diferencia > 0) return <span className="tabular font-semibold text-amber-700">Sobran {dinero(diferencia)}</span>;
  return <span className="tabular font-semibold text-red-700">Faltan {dinero(-diferencia)}</span>;
}
