import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import linea from "./linea.json";
import palabras from "./palabras.json";
import { Fondo, Personalizacion } from "./Personalizacion";

// Reel completo (vertical 1080×1920, 30 fps): tu toma editada + pantallas del sistema +
// animación de personalización + llamado a la acción + logo.
// Los tiempos salen de src/linea.json (bloques) y src/palabras.json (subtítulos).

export const FPS = 30;
const OUTRO = 3.6; // segundos del cierre con el logo de JM Soluciones
export const DURACION_REEL = Math.ceil((linea.duracion + OUTRO) * FPS);

const C = {
  marino: "#1f446b",
  noche: "#182436",
  azul: "#2f6fa3",
  celeste: "#58d2ea",
  blanco: "#ffffff",
  texto: "#182436",
  gris: "#66768a",
  rojo: "#d64545",
};
const LETRA = '"Avenir Next", "Avenir", "Helvetica Neue", Helvetica, sans-serif';

type Palabra = { t: string; a: number; b: number };
const PALABRAS = palabras as Palabra[];
const B = Object.fromEntries(linea.bloques.map((b) => [b.bloque, b])) as Record<string, (typeof linea.bloques)[number]>;
const f = (s: number) => Math.round(s * FPS);
/** Momento (s) en que empieza la primera palabra que coincide, desde `desde` segundos. */
function cuando(texto: string, desde = 0) {
  const p = PALABRAS.find((w) => w.a >= desde - 0.05 && w.t.toLowerCase().replace(/[¿?¡!.,]/g, "") === texto);
  if (!p) throw new Error(`No encontré la palabra "${texto}" desde ${desde}s`);
  return p.a;
}

// ---------- Momentos clave ----------
const PANEL_DESDE = cuando("sistema", B.solucion.desde); // entran las pantallas del sistema
const PERSONALIZA = B.adaptamos.desde; // animación de personalización
const LLAMADO = B.llamado.desde;
const CTA = cuando("escríbeme", LLAMADO) - 0.15; // aparece la tarjeta "Escríbeme al interno"
const FIN_TOMA = linea.duracion;

// ---------- Utilidades ----------
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
function resorte(frame: number, desde: number, damping = 14) {
  return spring({ frame: frame - desde, fps: FPS, config: { damping, mass: 0.6, stiffness: 150 } });
}
function suave(frame: number, desde: number, dur: number) {
  return interpolate(frame, [desde, desde + dur], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
}

// ---------- Toma de cámara ----------

/** Acercamiento por bloque: alterna entre normal y un poco más cerca para disimular los cortes. */
const ZOOM: Record<string, [number, number]> = {
  gancho: [1.0, 1.07],
  problema: [1.13, 1.16],
  solucion: [1.0, 1.03],
  llamado: [1.1, 1.14],
};

function Toma({ circulo }: { circulo?: boolean }) {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const bloque = linea.bloques.find((b) => t >= b.desde && t < b.hasta) ?? linea.bloques[linea.bloques.length - 1];
  const [z0, z1] = ZOOM[bloque.bloque] ?? [1.05, 1.05];
  const z = circulo ? 1 : interpolate(t, [bloque.desde, bloque.hasta], [z0, z1], clamp);
  return (
    <OffthreadVideo
      src={staticFile("toma.mp4")}
      muted
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: `scale(${z})`,
        transformOrigin: "50% 36%", // centrado en la cara
      }}
    />
  );
}

/** Tu cara en un círculo mientras se ven las pantallas o la animación. */
function Burbuja({ desde, hasta, top = 1135, tam = 290 }: { desde: number; hasta: number; top?: number; tam?: number }) {
  const frame = useCurrentFrame();
  const entra = resorte(frame, f(desde) + 6, 13);
  const sale = interpolate(frame, [f(hasta) - 6, f(hasta)], [1, 0], clamp);
  const p = Math.min(entra, sale);
  if (frame < f(desde) || frame > f(hasta)) return null;
  // La toma mide 1080×1920; la cabeza va de y≈500 (pelo) a y≈1090 (barbilla), centro cerca de (540, 800).
  // Se escala para que entre la cabeza completa, con la barbilla y un poco de margen.
  const escala = 0.36;
  return (
    <div
      style={{
        position: "absolute",
        left: 36,
        top,
        width: tam,
        height: tam,
        borderRadius: "50%",
        overflow: "hidden",
        border: `7px solid ${C.blanco}`,
        boxShadow: "0 18px 40px -12px rgba(24,36,54,0.55)",
        transform: `scale(${0.5 + p * 0.5})`,
        opacity: p,
        background: C.noche,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 1080,
          height: 1920,
          left: tam / 2 - 540 * escala,
          top: tam / 2 - 800 * escala,
          transform: `scale(${escala})`,
          transformOrigin: "0 0",
        }}
      >
        <Toma circulo />
      </div>
    </div>
  );
}

// ---------- Subtítulos ----------

type Grupo = { palabras: Palabra[]; a: number; b: number };
const GRUPOS: Grupo[] = (() => {
  const grupos: Grupo[] = [];
  let actual: Palabra[] = [];
  const cerrar = () => {
    if (actual.length) grupos.push({ palabras: actual, a: actual[0].a, b: actual[actual.length - 1].b });
    actual = [];
  };
  for (const w of PALABRAS) {
    const largo = actual.map((x) => x.t).join(" ").length + w.t.length;
    if (actual.length >= 3 || largo > 18) cerrar();
    actual.push(w);
    if (/[.,?!]$/.test(w.t)) cerrar();
  }
  cerrar();
  // Cada grupo queda en pantalla hasta que empieza el siguiente (o un poco después de su última palabra).
  grupos.forEach((g, i) => {
    const sig = grupos[i + 1];
    g.b = sig ? Math.min(sig.a, g.b + 0.6) : g.b + 0.5;
  });
  return grupos;
})();

function Subtitulos({ ocultar }: { ocultar: [number, number][] }) {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (ocultar.some(([a, b]) => t >= a && t < b)) return null;
  const g = GRUPOS.find((x) => t >= x.a - 0.05 && t < x.b);
  if (!g) return null;
  const entra = resorte(frame, f(g.a - 0.05), 16);
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 1440, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          fontFamily: LETRA,
          fontSize: 62,
          fontWeight: 800,
          lineHeight: 1.15,
          textAlign: "center",
          padding: "16px 30px 18px",
          borderRadius: 24,
          background: "rgba(24,36,54,0.9)",
          color: C.blanco,
          boxShadow: "0 14px 34px -14px rgba(0,0,0,0.6)",
          transform: `scale(${0.85 + entra * 0.15})`,
          opacity: entra,
        }}
      >
        {g.palabras.map((w, i) => {
          const sig = g.palabras[i + 1];
          const activa = t >= w.a - 0.03 && (sig ? t < sig.a - 0.03 : t < g.b);
          return (
            <span key={i} style={{ color: activa ? C.celeste : C.blanco, marginRight: i < g.palabras.length - 1 ? 16 : 0 }}>
              {w.t.replace(/[,.]$/, "")}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Bloque "problema": cuaderno y Excel tachados ----------

function Tachado({ desde, emoji, texto }: { desde: number; emoji: string; texto: string }) {
  const frame = useCurrentFrame();
  const p = resorte(frame, f(desde), 11);
  const raya = interpolate(frame, [f(desde) + 8, f(desde) + 16], [0, 1], clamp);
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 28px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.95)",
        boxShadow: "0 14px 34px -14px rgba(0,0,0,0.5)",
        fontFamily: LETRA,
        fontSize: 50,
        fontWeight: 800,
        color: C.texto,
        opacity: p,
        transform: `scale(${0.6 + p * 0.4}) rotate(${(1 - p) * -8}deg)`,
      }}
    >
      <span>{emoji}</span>
      <span>{texto}</span>
      <span style={{ color: C.rojo, fontSize: 54, opacity: raya }}>✗</span>
      <div
        style={{
          position: "absolute",
          left: 22,
          top: "50%",
          height: 7,
          width: `calc(${raya * 100}% - 44px)`,
          background: C.rojo,
          borderRadius: 4,
          transform: "rotate(-4deg)",
        }}
      />
    </div>
  );
}

function Problema() {
  const frame = useCurrentFrame();
  const a = cuando("cuaderno", B.problema.desde);
  const b = cuando("excel", B.problema.desde);
  const fuera = interpolate(frame, [f(B.problema.hasta) - 6, f(B.problema.hasta)], [1, 0], clamp);
  if (frame < f(a) - 2 || frame > f(B.problema.hasta)) return null;
  return (
    <div style={{ position: "absolute", top: 250, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 26, opacity: fuera }}>
      <Tachado desde={a} emoji="📒" texto="Cuaderno" />
      {frame >= f(b) - 2 && <Tachado desde={b} emoji="📊" texto="Excel" />}
    </div>
  );
}

// ---------- Pantallas del sistema ----------

type Caja = { x: number; y: number; w: number; h: number }; // en fracciones de la captura
type Escena = {
  desde: number;
  etiqueta: string;
  imagen?: string;
  resalte?: Caja;
  escaneo?: boolean;
  comparar?: { izq: string; der: string };
};

const ESCENAS: Escena[] = [
  { desde: PANEL_DESDE, etiqueta: "📊 Tu sistema de inventario y ventas", imagen: "inicio" },
  {
    desde: B.productos.desde,
    etiqueta: "📦 Productos con foto, precio y stock",
    imagen: "productos",
    resalte: { x: 0.2, y: 0.52, w: 0.62, h: 0.33 },
  },
  {
    desde: B.vender.desde,
    etiqueta: "📷 Vende escaneando con tu celular",
    imagen: "venta_carrito",
    resalte: { x: 0.81, y: 0.225, w: 0.155, h: 0.065 },
    escaneo: true,
  },
  {
    desde: B.cobrar.desde,
    etiqueta: "💳 Efectivo o QR · el stock baja solo",
    imagen: "venta_cobro",
    resalte: { x: 0.035, y: 0.511, w: 0.47, h: 0.054 },
  },
  {
    desde: B.alertas.desde,
    etiqueta: "🔔 Te avisa cuando algo se acaba",
    imagen: "reabastecer",
    resalte: { x: 0.52, y: 0.215, w: 0.24, h: 0.26 },
  },
  {
    desde: B.caja.desde,
    etiqueta: "🧾 Cierre de caja: ¿cuadra o falta?",
    imagen: "cierre_caja",
    resalte: { x: 0.035, y: 0.405, w: 0.93, h: 0.105 },
  },
  {
    desde: B.vendedores.desde,
    etiqueta: "👥 Tus vendedores no ven tus ganancias",
    comparar: { izq: "producto_admin", der: "producto_vendedora" },
  },
  {
    desde: B.ganancias.desde,
    etiqueta: "📈 Solo tú ves cuánto ganas",
    imagen: "reportes",
    resalte: { x: 0.515, y: 0.47, w: 0.455, h: 0.2 },
  },
  {
    desde: cuando("información", B.ganancias.desde) - 0.3,
    etiqueta: "☁️ Tu información se respalda sola",
    imagen: "respaldos",
    resalte: { x: 0.035, y: 0.24, w: 0.93, h: 0.13 },
  },
];
const DUR_EMPUJE = 12;

/** Posición de la escena k como carrusel: 1 = a la derecha, 0 = en pantalla, -1 = ya salió. */
function posicionEscena(frame: number, k: number) {
  const entra = k === 0 ? 1 : suave(frame, f(ESCENAS[k].desde) - 4, DUR_EMPUJE);
  const sale = k === ESCENAS.length - 1 ? 0 : suave(frame, f(ESCENAS[k + 1].desde) - 4, DUR_EMPUJE);
  return 1 - entra - sale;
}

function Resalte({ caja, desde }: { caja: Caja; desde: number }) {
  const frame = useCurrentFrame();
  const p = resorte(frame, f(desde) + 10, 12);
  const pulso = 0.75 + 0.25 * Math.sin((frame - f(desde)) / 5);
  return (
    <div
      style={{
        position: "absolute",
        left: `${caja.x * 100}%`,
        top: `${caja.y * 100}%`,
        width: `${caja.w * 100}%`,
        height: `${caja.h * 100}%`,
        borderRadius: 16,
        border: `6px solid ${C.celeste}`,
        boxShadow: `0 0 0 6px rgba(88,210,234,0.25), 0 0 28px rgba(88,210,234,${0.5 * pulso})`,
        opacity: p,
        transform: `scale(${1.25 - p * 0.25})`,
      }}
    />
  );
}

/** Línea láser que recorre el buscador, como un escáner de código de barras. */
function Escaneo({ desde }: { desde: number }) {
  const frame = useCurrentFrame();
  const local = frame - f(desde) - 14;
  if (local < 0) return null;
  const x = (Math.sin(local / 7) + 1) / 2;
  return (
    <div style={{ position: "absolute", left: "4%", width: "92%", top: "22.6%", height: "5.6%", overflow: "hidden", borderRadius: 14 }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${x * 100}%`,
          width: 8,
          background: "#ff3b3b",
          boxShadow: "0 0 18px 6px rgba(255,59,59,0.6)",
        }}
      />
    </div>
  );
}

/** Celular con la captura completa (sin acercamientos, para que se vea que es un teléfono). */
function Telefono({ imagen, ancho, children }: { imagen: string; ancho: number; children?: ReactNode }) {
  const alto = ancho / (1170 / 2532);
  return (
    <div
      style={{
        width: ancho + 28,
        padding: 14,
        borderRadius: 64,
        background: C.noche,
        boxShadow: "0 40px 90px -30px rgba(24,36,54,0.6), inset 0 0 0 2px #384657",
      }}
    >
      <div style={{ position: "relative", width: ancho, height: alto, borderRadius: 50, overflow: "hidden", background: "#eef2f6" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <Img src={staticFile(`pantallas/${imagen}.png`)} style={{ width: "100%", height: "100%", display: "block" }} />
          {children}
        </div>
      </div>
    </div>
  );
}

function Etiqueta({ texto, desde }: { texto: string; desde: number }) {
  const frame = useCurrentFrame();
  const p = resorte(frame, f(desde) + 2, 13);
  return (
    <div
      style={{
        padding: "18px 34px",
        borderRadius: 999,
        background: C.marino,
        color: C.blanco,
        fontFamily: LETRA,
        fontSize: 44,
        fontWeight: 700,
        whiteSpace: "nowrap",
        boxShadow: "0 16px 36px -16px rgba(31,68,107,0.8)",
        opacity: p,
        transform: `translateY(${(1 - p) * -30}px) scale(${0.9 + p * 0.1})`,
      }}
    >
      {texto}
    </div>
  );
}

function Comparar({ e, hasta }: { e: Escena; hasta: number }) {
  const frame = useCurrentFrame();
  const candado = resorte(frame, f(e.desde) + 18, 11);
  const ancho = 404;
  const titulo = (texto: string, oscuro: boolean) => (
    <div
      style={{
        marginBottom: 18,
        textAlign: "center",
        fontFamily: LETRA,
        fontSize: 40,
        fontWeight: 800,
        color: oscuro ? C.marino : C.azul,
      }}
    >
      {texto}
    </div>
  );
  return (
    <div style={{ position: "absolute", top: 330, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 40 }}>
      <div>
        {titulo("Tú", true)}
        <Telefono imagen={e.comparar!.izq} ancho={ancho}>
          <Resalte caja={{ x: 0.035, y: 0.528, w: 0.93, h: 0.13 }} desde={e.desde} />
        </Telefono>
      </div>
      <div style={{ position: "relative" }}>
        {titulo("Tu vendedor", false)}
        <Telefono imagen={e.comparar!.der} ancho={ancho} />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 560,
            transform: `translateX(-50%) scale(${0.5 + candado * 0.5})`,
            opacity: candado,
            padding: "16px 26px",
            borderRadius: 24,
            background: C.noche,
            color: C.blanco,
            fontFamily: LETRA,
            fontSize: 34,
            fontWeight: 700,
            textAlign: "center",
            whiteSpace: "nowrap",
            boxShadow: "0 20px 40px -14px rgba(0,0,0,0.55)",
          }}
        >
          🔒 Sin costos
          <br />
          ni ganancias
        </div>
      </div>
    </div>
  );
}

function PanelPantallas() {
  const frame = useCurrentFrame();
  const entra = suave(frame, f(PANEL_DESDE) - 2, 14);
  if (frame < f(PANEL_DESDE) - 2 || frame > f(PERSONALIZA) + 2) return null;
  const actual = ESCENAS.reduce((k, e, i) => (frame >= f(e.desde) ? i : k), 0);
  return (
    <AbsoluteFill style={{ transform: `translateY(${(1 - entra) * 100}%)` }}>
      <Fondo />
      {/* Etiqueta de la escena */}
      <div style={{ position: "absolute", top: 205, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Etiqueta key={actual} texto={ESCENAS[actual].etiqueta} desde={ESCENAS[actual].desde} />
      </div>
      {/* Escenas como carrusel */}
      {ESCENAS.map((e, k) => {
        const pos = posicionEscena(frame, k);
        if (pos <= -1 || pos >= 1) return null;
        const hasta = ESCENAS[k + 1]?.desde ?? PERSONALIZA;
        return (
          <AbsoluteFill key={k} style={{ transform: `translateX(${pos * 100}%)` }}>
            {e.comparar ? (
              <Comparar e={e} hasta={hasta} />
            ) : (
              <div style={{ position: "absolute", top: 320, left: 0, right: 0, paddingLeft: 110, display: "flex", justifyContent: "center" }}>
                <Telefono imagen={e.imagen!} ancho={496}>
                  {e.resalte && <Resalte caja={e.resalte} desde={e.desde} />}
                  {e.escaneo && <Escaneo desde={e.desde} />}
                </Telefono>
              </div>
            )}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
}

// ---------- Personalización (sincronizada con la voz) ----------

function PersonalizacionSincronizada() {
  const rel = (s: number) => Math.round((s - PERSONALIZA) * FPS);
  const ferre = cuando("ferretería", PERSONALIZA);
  const ropa = cuando("tienda", PERSONALIZA);
  const cocina = cuando("artículos", PERSONALIZA);
  const perso = cuando("lo", B.personalizamos.desde - 0.2);
  const tiempos = {
    tituloSale: rel(ferre) - 12,
    negocios: rel(ferre) - 10,
    // Cada rubro entra un poco antes de nombrarlo; "repuestos" se muestra al pasar, como un rubro más.
    inicios: [rel(ferre) - 10, rel(ropa) - 7, rel(cocina) - 7, rel(cocina) + Math.round((perso - cocina) * FPS * 0.55)],
    cierre: rel(perso) - 5,
  };
  return (
    <Sequence from={f(PERSONALIZA)} durationInFrames={f(LLAMADO) - f(PERSONALIZA)}>
      <Personalizacion
        tiempos={tiempos}
        textos={{
          mejor: "Lo mejor de todo:",
          adapto: "lo adaptamos para",
          negocio: "tu negocio",
          personalizo: "Lo personalizamos",
          segun: "según lo que necesites",
        }}
      />
    </Sequence>
  );
}

// ---------- Llamado a la acción y cierre ----------

function TarjetaCTA() {
  const frame = useCurrentFrame();
  const p = resorte(frame, f(CTA), 13);
  const fuera = interpolate(frame, [f(FIN_TOMA) - 4, f(FIN_TOMA) + 2], [1, 0], clamp);
  if (frame < f(CTA)) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: 1235,
        padding: "34px 36px",
        borderRadius: 40,
        background: "rgba(255,255,255,0.97)",
        boxShadow: "0 30px 70px -24px rgba(0,0,0,0.6)",
        fontFamily: LETRA,
        textAlign: "center",
        opacity: Math.min(p, fuera),
        transform: `translateY(${(1 - p) * 120}px)`,
      }}
    >
      <div style={{ fontSize: 66, fontWeight: 800, color: C.marino }}>📩 Escríbeme al interno</div>
      <div style={{ fontSize: 42, fontWeight: 600, color: C.azul, marginTop: 10 }}>Te envío el catálogo con precios</div>
    </div>
  );
}

function Cierre() {
  const frame = useCurrentFrame();
  const entra = suave(frame, f(FIN_TOMA) - 3, 10);
  const logo = resorte(frame, f(FIN_TOMA) + 4, 12);
  const texto = resorte(frame, f(FIN_TOMA) + 14, 14);
  if (frame < f(FIN_TOMA) - 3) return null;
  return (
    <AbsoluteFill style={{ opacity: entra, fontFamily: LETRA, alignItems: "center", justifyContent: "center" }}>
      <Fondo />
      <div
        style={{
          width: 940,
          borderRadius: 52,
          overflow: "hidden",
          boxShadow: "0 40px 90px -30px rgba(24,36,54,0.5)",
          transform: `scale(${0.8 + logo * 0.2})`,
          opacity: logo,
          marginTop: -140,
        }}
      >
        <Img src={staticFile("logo.png")} style={{ width: "100%", display: "block" }} />
      </div>
      <div style={{ marginTop: 60, textAlign: "center", opacity: texto, transform: `translateY(${(1 - texto) * 40}px)` }}>
        <div style={{ fontSize: 52, fontWeight: 700, color: C.texto }}>Sistema de inventario y ventas</div>
        <div
          style={{
            display: "inline-block",
            marginTop: 30,
            padding: "20px 44px",
            borderRadius: 999,
            background: C.marino,
            color: C.blanco,
            fontSize: 46,
            fontWeight: 700,
          }}
        >
          📩 Escríbeme al interno
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ---------- Reel ----------

const capaCompleta: CSSProperties = { position: "absolute", inset: 0 };

/**
 * Tu toma a pantalla completa, solo cuando se ve (ahorra trabajo al exportar).
 * Importante: NO va dentro de un <Sequence>, porque el video empezaría desde cero en cada bloque
 * y se desfasaría del audio. Así el cuadro del video siempre corresponde al mismo instante del audio.
 */
function TomaCompleta() {
  const frame = useCurrentFrame();
  const visible = frame < f(PANEL_DESDE) + 16 || (frame >= f(LLAMADO) - 2 && frame < f(FIN_TOMA) + 8);
  if (!visible) return null;
  return (
    <div style={capaCompleta}>
      <Toma />
    </div>
  );
}

export const Reel = () => {
  return (
    <AbsoluteFill style={{ background: C.noche }}>
      <Audio src={staticFile("toma.mp4")} />
      <TomaCompleta />

      <Problema />
      <PanelPantallas />
      <PersonalizacionSincronizada />
      <Burbuja desde={PANEL_DESDE} hasta={PERSONALIZA} />
      <Subtitulos ocultar={[[PERSONALIZA, LLAMADO], [CTA, 999]]} />
      <TarjetaCTA />
      <Cierre />
    </AbsoluteFill>
  );
};
