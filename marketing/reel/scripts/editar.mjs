// Arma la toma editada (solo tus partes habladas, sin pausas largas ni tropiezos):
//   - corta los tramos de scripts/cortes.json con un pequeño margen,
//   - pasa a 1080×1920 a 30 fps,
//   - audio: quita graves (zumbidos), comprime suave y normaliza a -14 LUFS (estándar de redes),
//   - guarda public/toma.mp4 y src/linea.json (dónde cae cada bloque en el video editado).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..");
const cfg = JSON.parse(fs.readFileSync(path.join(raiz, "scripts/cortes.json"), "utf8"));
const fuente = path.resolve(raiz, cfg.fuente);
const salida = path.join(raiz, "public/toma.mp4");
const FPS = 30;
const redondear = (s) => Math.round(s * FPS) / FPS; // cortes en cuadros exactos

const tramos = cfg.tramos.map((t) => ({
  ...t,
  a: redondear(Math.max(0, t.desde - cfg.margenAntes)),
  b: redondear(t.hasta + cfg.margenDespues),
}));

const filtros = [];
// El iPhone graba con cuadros por segundo variables (59,98 en promedio). Primero se pasa todo a
// 30 cuadros fijos y recién después se corta: así cada tramo de video dura exactamente lo mismo
// que su tramo de audio y no se acumula desfase entre cortes.
const n = tramos.length;
filtros.push(`[0:v]fps=${FPS},split=${n}${tramos.map((_, i) => `[s${i}]`).join("")}`);
filtros.push(`[0:a]asplit=${n}${tramos.map((_, i) => `[r${i}]`).join("")}`);
tramos.forEach((t, i) => {
  const dur = (t.b - t.a).toFixed(3);
  filtros.push(`[s${i}]trim=start=${t.a}:end=${t.b},setpts=PTS-STARTPTS[v${i}]`);
  // Fundido de 12 ms en cada borde para que no haya "clics" en los cortes.
  filtros.push(
    `[r${i}]atrim=start=${t.a}:end=${t.b},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st=${(dur - 0.012).toFixed(3)}:d=0.012[a${i}]`,
  );
});
filtros.push(`${tramos.map((_, i) => `[v${i}][a${i}]`).join("")}concat=n=${tramos.length}:v=1:a=1[vc][ac]`);
filtros.push(`[ac]highpass=f=80,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120,loudnorm=I=-14:TP=-1.5:LRA=9[af]`);

execFileSync(
  "ffmpeg",
  [
    "-y", "-loglevel", "error", "-i", fuente,
    "-filter_complex", filtros.join(";"),
    "-map", "[vc]", "-map", "[af]",
    "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p",
    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart",
    salida,
  ],
  { stdio: "inherit" },
);

// Línea de tiempo del video editado
let t = 0;
const linea = tramos.map((x) => {
  const dur = x.b - x.a;
  const r = { bloque: x.bloque, texto: x.texto, desde: +t.toFixed(3), hasta: +(t + dur).toFixed(3), fuenteDesde: x.a };
  t += dur;
  return r;
});
fs.writeFileSync(path.join(raiz, "src/linea.json"), JSON.stringify({ duracion: +t.toFixed(3), bloques: linea }, null, 2));
console.log(`Toma editada: ${t.toFixed(2)} s → ${path.relative(raiz, salida)}`);
for (const b of linea) console.log(`  ${b.desde.toFixed(2).padStart(6)} – ${b.hasta.toFixed(2).padStart(6)}  ${b.bloque}`);
