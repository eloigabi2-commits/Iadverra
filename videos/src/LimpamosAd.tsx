import React from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";

// Vídeo do escritório da Esclarece com o layout da arte de referência:
// texto fixo embaixo e logo fixa no canto superior esquerdo, em azul.
// O vídeo já traz a logo branca gravada; logo-azul.png foi recriada no mesmo
// lugar e formato (scripts/logo_do_video.py) para cobri-la.

const FPS = 30;
export const LIMPAMOS_DURATION = Math.round(15.3 * FPS);
const SANS = "Manrope";
const BLUE = "#2d34a8";

for (const w of ["400", "800"] as const) {
  loadFont({ family: SANS, url: staticFile(`fonts/manrope-latin-${w}-normal.woff2`), weight: w });
}

const line: React.CSSProperties = {
  fontFamily: SANS,
  color: "#fff",
  letterSpacing: "-0.01em",
  textShadow: "0 2px 10px rgba(0,0,0,.35)",
};

export const LimpamosAd: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <OffthreadVideo
      src={staticFile("limpamos/original.mov")}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
    {/* escurece a parte de baixo para o texto ler bem */}
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, rgba(0,0,0,0) 52%, rgba(0,0,0,.35) 64%, rgba(0,0,0,.62) 100%)",
      }}
    />
    <Img
      src={staticFile("limpamos/logo-azul.png")}
      style={{ position: "absolute", left: 0, top: 0 }}
    />
    <div style={{ position: "absolute", left: 66, right: 50, top: 1255 }}>
      <div style={{ ...line, fontWeight: 400, fontSize: 66, lineHeight: 1.15 }}>
        Nós da{" "}
        <span
          style={{
            fontWeight: 800,
            background: "rgba(84,118,150,.82)",
            padding: "0 14px 4px",
            borderRadius: 4,
            boxDecorationBreak: "clone",
            WebkitBoxDecorationBreak: "clone",
          }}
        >
          Esclarece Soluções
        </span>
      </div>
      <div style={{ ...line, fontWeight: 800, fontSize: 76, lineHeight: 1.12, marginTop: 10 }}>
        limpamos seu nome
        <br />
        de verdade!
      </div>
      <div style={{ ...line, fontWeight: 400, fontSize: 38, marginTop: 26 }}>
        Recupere seu crédito e sua tranquilidade.
      </div>
    </div>
    {/* trilha bem baixinha, por baixo da fala */}
    <Audio src={staticFile("limpamos/musica.wav")} volume={0.15} />
  </AbsoluteFill>
);
