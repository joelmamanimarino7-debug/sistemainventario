/* eslint-disable @next/next/no-img-element */

export function urlImagen(id: string, mini = false) {
  return `/api/imagenes/${id}${mini ? "-mini" : ""}.webp`;
}

/** Miniatura cuadrada del producto (o un recuadro gris si no tiene foto). */
export function Miniatura({
  imagen,
  alt,
  tam = 40,
  className = "",
}: {
  imagen: string | null | undefined;
  alt: string;
  tam?: number;
  className?: string;
}) {
  const estilo = { width: tam, height: tam };
  if (!imagen) {
    return (
      <span
        style={estilo}
        className={`grid shrink-0 place-items-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-300 ${className}`}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: tam * 0.5, height: tam * 0.5 }}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="2" />
          <path d="m4 18 5-5 4 4 3-3 4 4" />
        </svg>
      </span>
    );
  }
  return (
    <img
      src={urlImagen(imagen, true)}
      alt={alt}
      style={estilo}
      loading="lazy"
      className={`shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 object-contain ${className}`}
    />
  );
}
