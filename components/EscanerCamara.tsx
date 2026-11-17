"use client";

import { useEffect, useRef, useState } from "react";

// Escáner de códigos de barras con la cámara del celular o de la computadora.
// En Android/Chrome usa el lector que trae el navegador (BarcodeDetector); en iPhone y donde no exista,
// usa la librería ZXing (se carga solo cuando se abre el escáner).

type Resultado = { ok: boolean; mensaje: string };

type DetectorNativo = { detect: (fuente: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type ClaseDetector = {
  new (opciones: { formats: string[] }): DetectorNativo;
  getSupportedFormats: () => Promise<string[]>;
};

const FORMATOS = ["code_128", "ean_13", "ean_8", "upc_a", "upc_e", "code_39", "itf"];
const ESPERA_REPETIDO = 2000; // ms antes de aceptar otra vez el mismo código

/** Pitido corto para confirmar la lectura (también funciona en iPhone). */
function pitido(bien: boolean) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.frequency.value = bien ? 1200 : 300;
    vol.gain.value = 0.15;
    osc.connect(vol).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (bien ? 0.09 : 0.25));
    osc.onended = () => ctx.close();
  } catch {
    /* sin audio */
  }
  navigator.vibrate?.(bien ? 60 : [80, 60, 80]);
}

export function EscanerCamara({
  onCodigo,
  onCerrar,
}: {
  /** Se llama con cada código leído; lo que devuelve se muestra abajo de la imagen. */
  onCodigo: (codigo: string) => Promise<Resultado>;
  onCerrar: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Resultado | null>(null);
  const [linterna, setLinterna] = useState<{ disponible: boolean; encendida: boolean }>({ disponible: false, encendida: false });
  const pista = useRef<MediaStreamTrack | null>(null);
  const onCodigoRef = useRef(onCodigo);
  onCodigoRef.current = onCodigo;

  useEffect(() => {
    let cancelado = false;
    let flujo: MediaStream | null = null;
    let intervalo: ReturnType<typeof setInterval> | null = null;
    let detenerZxing: (() => void) | null = null;
    let ultimo = { codigo: "", hora: 0 };
    let ocupado = false;

    async function alLeer(codigo: string) {
      const ahora = Date.now();
      if (ocupado || (codigo === ultimo.codigo && ahora - ultimo.hora < ESPERA_REPETIDO)) return;
      ultimo = { codigo, hora: ahora };
      ocupado = true;
      try {
        const r = await onCodigoRef.current(codigo);
        pitido(r.ok);
        setAviso(r);
      } finally {
        ultimo.hora = Date.now();
        ocupado = false;
      }
    }

    async function iniciar() {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError(
          "La cámara solo funciona en una conexión segura. En el celular entra por la dirección https que muestra «npm run movil».",
        );
        return;
      }
      try {
        flujo = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch (e) {
        const nombre = (e as Error).name;
        setError(
          nombre === "NotAllowedError"
            ? "No se dio permiso para usar la cámara. Actívalo en los ajustes del navegador para este sitio y vuelve a intentar."
            : "No se pudo abrir la cámara. ¿La está usando otra aplicación?",
        );
        return;
      }
      if (cancelado || !video.current) return flujo.getTracks().forEach((t) => t.stop());
      const v = video.current;
      v.srcObject = flujo;
      await v.play().catch(() => undefined);

      pista.current = flujo.getVideoTracks()[0] ?? null;
      const capacidades = (pista.current?.getCapabilities?.() ?? {}) as { torch?: boolean };
      if (capacidades.torch) setLinterna({ disponible: true, encendida: false });

      // 1) Lector del navegador, si lee Code 128.
      const BD = (window as unknown as { BarcodeDetector?: ClaseDetector }).BarcodeDetector;
      const soportados = BD ? await BD.getSupportedFormats().catch(() => [] as string[]) : [];
      if (BD && soportados.includes("code_128")) {
        const detector = new BD({ formats: FORMATOS.filter((f) => soportados.includes(f)) });
        intervalo = setInterval(async () => {
          if (ocupado || v.readyState < 2) return;
          const r = await detector.detect(v).catch(() => []);
          if (r[0]?.rawValue) void alLeer(r[0].rawValue);
        }, 200);
        return;
      }

      // 2) ZXing (iPhone y navegadores sin lector propio).
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
        import("@zxing/browser"),
        import("@zxing/library"),
      ]);
      if (cancelado) return;
      const pistas = new Map();
      pistas.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_39,
        BarcodeFormat.ITF,
      ]);
      const lector = new BrowserMultiFormatReader(pistas, { delayBetweenScanAttempts: 150 });
      const controles = await lector.decodeFromVideoElement(v, (resultado) => {
        if (resultado) void alLeer(resultado.getText());
      });
      detenerZxing = () => controles.stop();
      if (cancelado) detenerZxing();
    }

    void iniciar();
    return () => {
      cancelado = true;
      if (intervalo) clearInterval(intervalo);
      detenerZxing?.();
      flujo?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Cerrar con Escape.
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onCerrar]);

  async function cambiarLinterna() {
    const encender = !linterna.encendida;
    try {
      await pista.current?.applyConstraints({ advanced: [{ torch: encender } as MediaTrackConstraintSet] });
      setLinterna({ disponible: true, encendida: encender });
    } catch {
      setLinterna({ disponible: false, encendida: false });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="Escanear código de barras">
      <div className="flex items-center justify-between gap-2 px-4 py-3 text-white">
        <p className="text-sm font-medium">Apunta al código de barras</p>
        <div className="flex gap-2">
          {linterna.disponible && (
            <button onClick={cambiarLinterna} className="rounded-lg bg-white/15 px-3 py-1.5 text-sm" aria-pressed={linterna.encendida}>
              {linterna.encendida ? "Apagar luz" : "Luz"}
            </button>
          )}
          <button onClick={onCerrar} className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-tierra-900">
            Listo
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {error ? (
          <p className="mx-auto mt-20 max-w-sm px-6 text-center text-sm text-white">{error}</p>
        ) : (
          <>
            {/* playsInline es obligatorio en iPhone para que el video no se abra a pantalla completa */}
            <video ref={video} className="h-full w-full object-cover" muted playsInline autoPlay />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-32 w-4/5 max-w-md rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                <div className="mx-3 mt-[62px] h-0.5 bg-red-500/80" />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="min-h-16 px-4 py-3 text-center text-sm" aria-live="polite">
        {aviso ? (
          <p className={`rounded-lg px-3 py-2 font-medium ${aviso.ok ? "bg-oliva-600 text-white" : "bg-red-500 text-white"}`}>{aviso.mensaje}</p>
        ) : (
          !error && <p className="text-white/70">Se agregan solos al leerlos. Toca «Listo» al terminar.</p>
        )}
      </div>
    </div>
  );
}
