import { Composition } from "remotion";
import { DURACION, Personalizacion } from "./Personalizacion";
import { DURACION_REEL, FPS, Reel } from "./Reel";

export const Raiz = () => (
  <>
    <Composition id="Reel" component={Reel} durationInFrames={DURACION_REEL} fps={FPS} width={1080} height={1920} />
    <Composition
      id="Personalizacion"
      component={Personalizacion}
      durationInFrames={DURACION}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
