import { createContext, type CSSProperties, type ReactNode, useContext } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// Bloque del reel: "Y lo mejor: lo adapto a tu negocio. Ferretería, tienda de ropa,
// artículos de cocina, repuestos… lo personalizo según lo que necesites."
// Vertical 1080×1920, 30 fps, 10 s. Colores del logo de JM Soluciones.

export const DURACION = 300;

const C = {
  fondo: "#eef2f6",
  fondoAzul: "#d9e7f4",
  blanco: "#ffffff",
  marino: "#1f446b",
  noche: "#182436",
  azul: "#2f6fa3",
  azulClaro: "#4a92c8",
  celeste: "#58d2ea",
  gris: "#66768a",
  grisClaro: "#dde4ec",
  texto: "#182436",
};
const LETRA = '"Avenir Next", "Avenir", "Helvetica Neue", Helvetica, sans-serif';

// ---------- Tiempos (en cuadros) y textos ----------
// Se pueden cambiar con props: el reel los ajusta a los tiempos reales de la voz.
export type Tiempos = {
  tituloSale: number; // sale el título "lo adapto a tu negocio"
  negocios: number; // entra la tarjeta del sistema
  inicios: number[]; // cuadro en que empieza cada rubro (ferretería, ropa, cocina, repuestos)
  cierre: number; // "lo personalizo según lo que necesites"
};
export type Textos = { mejor: string; adapto: string; negocio: string; personalizo: string; segun: string };

const TIEMPOS_BASE: Tiempos = { tituloSale: 54, negocios: 60, inicios: [60, 100, 140, 180], cierre: 222 };
const TEXTOS_BASE: Textos = {
  mejor: "Y lo mejor:",
  adapto: "lo adapto a",
  negocio: "tu negocio",
  personalizo: "Lo personalizo",
  segun: "según lo que necesites",
};
const Config = createContext({ t: TIEMPOS_BASE, x: TEXTOS_BASE });
const useConfig = () => useContext(Config);

type Producto = { icono: string; nombre: string; detalle: string; precio: string; stock: string };
type Negocio = { icono: string; nombre: string; campos: string[]; productos: Producto[] };

const NEGOCIOS: Negocio[] = [
  {
    icono: "🔧",
    nombre: "Ferretería",
    campos: ["Medida", "Marca", "Venta por metro"],
    productos: [
      { icono: "🛠️", nombre: "Taladro percutor", detalle: "Medida: 13 mm", precio: "Bs 650", stock: "4 unidades" },
      { icono: "🔩", nombre: "Tornillos 1½\" ×100", detalle: "Caja de 100", precio: "Bs 25", stock: "30 cajas" },
      { icono: "🔌", nombre: "Cable N.º 12", detalle: "Se vende por metro", precio: "Bs 8", stock: "250 metros" },
    ],
  },
  {
    icono: "👕",
    nombre: "Tienda de ropa",
    campos: ["Talla", "Color", "Temporada"],
    productos: [
      { icono: "👕", nombre: "Polera básica", detalle: "Talla M · Azul", precio: "Bs 70", stock: "12 unidades" },
      { icono: "👖", nombre: "Jean slim", detalle: "Talla 32 · Celeste", precio: "Bs 180", stock: "8 unidades" },
      { icono: "🧥", nombre: "Chamarra", detalle: "Talla L · Negro", precio: "Bs 350", stock: "3 unidades" },
    ],
  },
  {
    icono: "🍳",
    nombre: "Artículos de cocina",
    campos: ["Material", "Piezas", "Color"],
    productos: [
      { icono: "🍲", nombre: "Juego de ollas", detalle: "5 piezas · Acero", precio: "Bs 420", stock: "6 juegos" },
      { icono: "☕", nombre: "Taza de cerámica", detalle: "Material: cerámica", precio: "Bs 25", stock: "40 unidades" },
      { icono: "🔪", nombre: "Tabla de picar", detalle: "Material: bambú", precio: "Bs 60", stock: "15 unidades" },
    ],
  },
  {
    icono: "⚙️",
    nombre: "Repuestos",
    campos: ["Compatible con", "Código", "Año"],
    productos: [
      { icono: "🛢️", nombre: "Filtro de aceite", detalle: "Compatible con: tu modelo", precio: "Bs 45", stock: "20 unidades" },
      { icono: "🛞", nombre: "Pastillas de freno", detalle: "Código: PF-208", precio: "Bs 160", stock: "6 juegos" },
      { icono: "⚡", nombre: "Bujía", detalle: "Año: 2015 – 2022", precio: "Bs 30", stock: "48 unidades" },
    ],
  },
];

// ---------- Utilidades de animación ----------

/** 0 → 1 con resorte, empezando en el cuadro `desde`. */
function useEntrada(desde: number, amortiguacion = 14) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - desde, fps, config: { damping: amortiguacion, mass: 0.6, stiffness: 140 } });
}

/** 1 → 0 entre `desde` y `desde + duracion`. */
function salida(frame: number, desde: number, duracion = 8) {
  return interpolate(frame, [desde, desde + duracion], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
}

// ---------- Fondo ----------

export function Fondo() {
  const frame = useCurrentFrame();
  const a = Math.sin(frame / 45) * 30;
  const b = Math.cos(frame / 60) * 40;
  return (
    <AbsoluteFill style={{ background: C.fondo, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 1100,
          height: 1100,
          left: -380 + a,
          top: -420 + b,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.fondoAzul} 0%, rgba(217,231,244,0) 65%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1200,
          height: 1200,
          right: -520 - a,
          bottom: -420 - b,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.fondoAzul} 0%, rgba(217,231,244,0) 60%)`,
        }}
      />
      {/* Trazo diagonal, como la línea del logo */}
      <div
        style={{
          position: "absolute",
          width: 1600,
          height: 6,
          left: -260,
          top: 1500,
          transform: `rotate(-24deg) translateX(${interpolate(frame, [0, DURACION], [-60, 60])}px)`,
          background: `linear-gradient(90deg, rgba(88,210,234,0) 0%, ${C.celeste} 45%, rgba(47,111,163,0) 100%)`,
          opacity: 0.35,
          borderRadius: 3,
        }}
      />
    </AbsoluteFill>
  );
}

// ---------- Escena 1: "Y lo mejor: lo adapto a tu negocio" ----------

function Titulo() {
  const frame = useCurrentFrame();
  const { t, x } = useConfig();
  const p1 = useEntrada(2);
  const p2 = useEntrada(10);
  const p3 = useEntrada(18, 11);
  const raya = interpolate(frame, [26, 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const fuera = salida(frame, t.tituloSale);
  if (frame > t.tituloSale + 10) return null;

  const linea = (p: number, extra: CSSProperties = {}): CSSProperties => ({
    opacity: p,
    transform: `translateY(${(1 - p) * 60}px)`,
    ...extra,
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        fontFamily: LETRA,
        opacity: fuera,
        transform: `translateY(${(1 - fuera) * -80}px) scale(${0.96 + fuera * 0.04})`,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={linea(p1, { fontSize: 58, fontWeight: 600, color: C.azul, letterSpacing: 1 })}>{x.mejor}</div>
        <div style={linea(p2, { fontSize: 96, fontWeight: 700, color: C.texto, marginTop: 26, lineHeight: 1.05 })}>
          {x.adapto}
        </div>
        <div style={{ position: "relative", display: "inline-block", marginTop: 6 }}>
          <div
            style={linea(p3, {
              fontSize: 132,
              fontWeight: 800,
              color: C.marino,
              lineHeight: 1.1,
              transform: `translateY(${(1 - p3) * 60}px) scale(${0.85 + p3 * 0.15})`,
            })}
          >
            {x.negocio}
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: -14,
              height: 16,
              width: `${raya * 100}%`,
              borderRadius: 8,
              background: `linear-gradient(90deg, ${C.celeste}, ${C.azul})`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ---------- Escena 2: el sistema cambia según el rubro ----------

function Chip({ children, oscuro }: { children: ReactNode; oscuro?: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "10px 22px",
        borderRadius: 999,
        fontSize: 30,
        fontWeight: 600,
        background: oscuro ? C.marino : "#e8f0f8",
        color: oscuro ? C.blanco : C.marino,
        border: oscuro ? "none" : `2px solid #c9dbee`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function FilaProducto({ p, opacidad, x }: { p: Producto; opacidad: number; x: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 28,
        padding: "26px 34px",
        borderTop: `2px solid ${C.grisClaro}`,
        opacity: opacidad,
        transform: `translateX(${x}px)`,
      }}
    >
      <div
        style={{
          width: 104,
          height: 104,
          borderRadius: 24,
          background: "#e8f0f8",
          display: "grid",
          placeItems: "center",
          fontSize: 58,
          flexShrink: 0,
        }}
      >
        {p.icono}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 40, fontWeight: 700, color: C.texto, whiteSpace: "nowrap" }}>{p.nombre}</div>
        <div style={{ fontSize: 30, fontWeight: 600, color: C.azul, marginTop: 6, whiteSpace: "nowrap" }}>{p.detalle}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 42, fontWeight: 800, color: C.marino }}>{p.precio}</div>
        <div style={{ fontSize: 26, fontWeight: 500, color: C.gris, marginTop: 4 }}>{p.stock}</div>
      </div>
    </div>
  );
}

const DUR_CAMBIO = 11; // cuadros que dura el "empujón" de un rubro al siguiente

/** Avance 0 → 1 (sin rebote) de una transición que empieza en el cuadro `desde`. */
function avance(frame: number, desde: number) {
  return interpolate(frame, [desde, desde + DUR_CAMBIO], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
}

/**
 * Posición del rubro i como carrusel: 1 = esperando a la derecha/abajo, 0 = en su lugar,
 * -1 = ya salió. El rubro que sale y el que entra usan el mismo avance, así van pegados
 * y nunca se tapan. `retraso` escalona filas y etiquetas.
 */
function posicion(frame: number, t: Tiempos, i: number, retraso = 0) {
  const entra = i === 0 ? 1 : avance(frame, t.inicios[i] + retraso);
  const sale = i === NEGOCIOS.length - 1 ? 0 : avance(frame, t.inicios[i + 1] + retraso);
  return 1 - entra - sale;
}

const capa: CSSProperties = { position: "absolute", inset: 0 };

function Negocios() {
  const frame = useCurrentFrame();
  const { t } = useConfig();
  const tarjeta = useEntrada(t.negocios, 15);
  const fuera = salida(frame, t.cierre, 10);
  if (frame < t.negocios - 2 || frame > t.cierre + 12) return null;

  // Solo se dibujan los rubros que están (o pasan) por la vista.
  const enVista = (pos: number) => pos > -1 && pos < 1;
  const rubros = NEGOCIOS.map((n, i) => ({ n, i }));
  let idx = 0;
  t.inicios.forEach((ini, k) => {
    if (frame >= ini + DUR_CAMBIO / 2) idx = k;
  });

  return (
    <AbsoluteFill style={{ fontFamily: LETRA, opacity: fuera, transform: `translateY(${(1 - fuera) * 120}px)` }}>
      {/* Rubro en grande (pasa de abajo hacia arriba) */}
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 8, color: C.gris, opacity: tarjeta }}>PARA</div>
        <div style={{ position: "relative", height: 150, marginTop: 4, overflow: "hidden", opacity: tarjeta }}>
          {rubros.map(({ n, i }) => {
            const pos = posicion(frame, t, i);
            if (!enVista(pos)) return null;
            const tam = Math.min(104, Math.floor(820 / (n.nombre.length * 0.58)));
            return (
              <div
                key={n.nombre}
                style={{
                  ...capa,
                  fontSize: tam,
                  fontWeight: 800,
                  color: C.marino,
                  lineHeight: "150px",
                  whiteSpace: "nowrap",
                  transform: `translateY(${pos * 100}%)`,
                }}
              >
                <span style={{ marginRight: 22 }}>{n.icono}</span>
                {n.nombre}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tarjeta del sistema */}
      <div
        style={{
          position: "absolute",
          top: 560,
          left: 70,
          right: 70,
          borderRadius: 40,
          background: C.blanco,
          boxShadow: "0 30px 80px -30px rgba(24,36,54,0.45), 0 4px 14px rgba(24,36,54,0.08)",
          overflow: "hidden",
          opacity: tarjeta,
          transform: `translateY(${(1 - tarjeta) * 140}px) scale(${0.92 + tarjeta * 0.08})`,
        }}
      >
        {/* Barra superior como el menú del sistema */}
        <div style={{ background: C.noche, padding: "30px 34px", display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              position: "relative",
              width: 64,
              height: 64,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${C.azulClaro}, ${C.azul})`,
              fontSize: 36,
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {rubros.map(({ n, i }) => {
              const pos = posicion(frame, t, i);
              return enVista(pos) ? (
                <span key={n.nombre} style={{ ...capa, display: "grid", placeItems: "center", transform: `translateY(${pos * 100}%)` }}>
                  {n.icono}
                </span>
              ) : null;
            })}
          </div>
          <div style={{ color: C.blanco, flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: 4, color: "#95a3b4" }}>INVENTARIO</div>
            <div style={{ position: "relative", height: 48, overflow: "hidden" }}>
              {rubros.map(({ n, i }) => {
                const pos = posicion(frame, t, i);
                return enVista(pos) ? (
                  <div key={n.nombre} style={{ ...capa, fontSize: 36, fontWeight: 700, whiteSpace: "nowrap", transform: `translateY(${pos * 100}%)` }}>
                    {n.nombre}
                  </div>
                ) : null;
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {[0, 1, 2].map((k) => (
              <span key={k} style={{ width: 14, height: 14, borderRadius: 7, background: k === 0 ? C.celeste : "#384657" }} />
            ))}
          </div>
        </div>

        {/* Productos (pasan de derecha a izquierda, fila por fila) */}
        <div style={{ padding: "8px 0 4px" }}>
          <div style={{ padding: "22px 34px 18px", fontSize: 26, fontWeight: 700, letterSpacing: 3, color: C.gris }}>PRODUCTOS</div>
          {[0, 1, 2].map((fila) => (
            <div key={fila} style={{ position: "relative", height: 158, overflow: "hidden" }}>
              {rubros.map(({ n, i }) => {
                const pos = posicion(frame, t, i, fila * 2);
                return enVista(pos) ? (
                  <div key={n.nombre} style={{ ...capa, transform: `translateX(${pos * 100}%)` }}>
                    <FilaProducto p={n.productos[fila]} opacidad={1} x={0} />
                  </div>
                ) : null;
              })}
            </div>
          ))}
        </div>

        {/* Campos propios del rubro: esto es la personalización */}
        <div style={{ borderTop: `2px solid ${C.grisClaro}`, background: "#f5f7fa", padding: "28px 34px 34px" }}>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 3, color: C.gris, marginBottom: 18 }}>CAMPOS DE TU NEGOCIO</div>
          <div style={{ position: "relative", height: 62, overflow: "hidden" }}>
            {rubros.map(({ n, i }) => {
              const pos = posicion(frame, t, i, 6);
              return enVista(pos) ? (
                <div key={n.nombre} style={{ ...capa, display: "flex", gap: 14, transform: `translateX(${pos * 100}%)` }}>
                  {n.campos.map((c, k) => (
                    <Chip key={c} oscuro={k === 0}>
                      {c}
                    </Chip>
                  ))}
                </div>
              ) : null;
            })}
          </div>
        </div>
      </div>

      {/* Progreso de rubros */}
      <div style={{ position: "absolute", top: 1560, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 16, opacity: tarjeta }}>
        {NEGOCIOS.map((x, i) => (
          <span
            key={x.nombre}
            style={{
              width: i === idx ? 64 : 18,
              height: 18,
              borderRadius: 9,
              background: i <= idx ? C.marino : "#c4cfdb",
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
}

// ---------- Escena 3: "lo personalizo según lo que necesites" ----------

function Check() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="32" fill={C.marino} />
      <path d="M18 33 l9 9 l19 -20" stroke={C.celeste} strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Cierre() {
  const frame = useCurrentFrame();
  const { t, x } = useConfig();
  const a = useEntrada(t.cierre + 8);
  const b = useEntrada(t.cierre + 16);
  const items = ["Tus productos y campos", "Tu logo y tus colores", "Los reportes que necesitas"];
  const sello = useEntrada(t.cierre + 56, 10);
  if (frame < t.cierre) return null;

  return (
    <AbsoluteFill style={{ fontFamily: LETRA, alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", marginTop: -120 }}>
        <div style={{ fontSize: Math.min(112, Math.floor(1700 / x.personalizo.length)), fontWeight: 800, color: C.marino, opacity: a, transform: `translateY(${(1 - a) * 60}px)`, whiteSpace: "nowrap" }}>
          {x.personalizo}
        </div>
        <div style={{ fontSize: 60, fontWeight: 600, color: C.azul, marginTop: 10, opacity: b, transform: `translateY(${(1 - b) * 60}px)` }}>
          {x.segun}
        </div>
      </div>
      <div style={{ marginTop: 90, display: "flex", flexDirection: "column", gap: 34 }}>
        {items.map((item, i) => {
          const p = spring({ frame: frame - (t.cierre + 26 + i * 8), fps: 30, config: { damping: 13, mass: 0.6, stiffness: 160 } });
          return (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 28, opacity: p, transform: `translateX(${(1 - p) * -80}px)` }}>
              <span style={{ transform: `scale(${0.4 + p * 0.6})`, display: "inline-flex" }}>
                <Check />
              </span>
              <span style={{ fontSize: 50, fontWeight: 600, color: C.texto }}>{item}</span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 100,
          padding: "26px 60px",
          borderRadius: 999,
          background: C.marino,
          color: C.blanco,
          fontSize: 54,
          fontWeight: 700,
          boxShadow: "0 20px 50px -18px rgba(31,68,107,0.7)",
          opacity: sello,
          transform: `scale(${0.7 + sello * 0.3})`,
        }}
      >
        Hecho a tu medida
      </div>
    </AbsoluteFill>
  );
}

export const Personalizacion = ({
  tiempos = TIEMPOS_BASE,
  textos = TEXTOS_BASE,
  conFondo = true,
}: {
  tiempos?: Tiempos;
  textos?: Textos;
  conFondo?: boolean;
}) => (
  <Config.Provider value={{ t: tiempos, x: textos }}>
    <AbsoluteFill>
      {conFondo && <Fondo />}
      <Titulo />
      <Negocios />
      <Cierre />
    </AbsoluteFill>
  </Config.Provider>
);
