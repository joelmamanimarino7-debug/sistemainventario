# Reel de presentación (JM Soluciones)

Video vertical (1080×1920, 30 fps) para redes, hecho con [Remotion](https://www.remotion.dev/)
(video generado desde código React), con los colores del logo de JM Soluciones.

```bash
cd marketing/reel
npm install                 # solo la primera vez
npm run estudio             # vista previa en el navegador, con línea de tiempo
npm run reel                # exporta ../../video/reel-inventario.mp4
npm run personalizacion     # exporta solo la animación ../../video/personalizacion.mp4
```

## Cómo se arma

1. **Grabación** (`video/IMG_5059.MOV`, no se sube a git). Si es HDR del iPhone, primero se pasa a color normal:
   ```bash
   avconvert --source ../../video/IMG_5059.MOV --preset Preset1920x1080 --output ../../video/trabajo/grabacion_sdr.mov
   ```
2. **Cortes** (`npm run editar`): toma los tramos de `scripts/cortes.json`, pasa todo a 30 cuadros fijos
   (el iPhone graba con cuadros variables) y recién después corta, para que el audio no se desfase.
   Mejora el audio (−14 LUFS) y genera `public/toma.mp4` y `src/linea.json`.
3. **Subtítulos**: `src/palabras.json` (palabra y segundo en que se dice), sacado con whisper.cpp:
   ```bash
   whisper-cli -m ggml-large-v3-turbo-q5_0.bin -f toma16k.wav -l es -ml 1 -sow -oj -of toma_palabras
   ```
4. **Capturas del sistema** (`npm run capturas -- http://localhost:3013`): con la app corriendo sobre una
   **copia** de la demo sin usuarios, carga ventas y un cierre de caja usando la propia app y toma capturas
   en tamaño celular en `public/pantallas/`.
5. **Logo**: `public/logo.png`, recortado de `images/logo.jpg` sin la marca de agua de la esquina.

## Archivos

- `src/Reel.tsx`: el reel completo (toma, subtítulos, pantallas en el celular, animación, llamado y logo).
  Las escenas de las pantallas están en `ESCENAS` (texto de la etiqueta, captura y recuadro resaltado).
- `src/Personalizacion.tsx`: animación "lo adaptamos a tu negocio" (rubros en `NEGOCIOS`).
- `public/` y `video/` no se suben a git (videos y capturas pesan mucho); se regeneran con los pasos de arriba.

**Importante:** la toma de cámara no debe ir dentro de un `<Sequence>` (su video empezaría desde cero y se
desfasaría del audio).
