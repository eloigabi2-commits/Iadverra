import React from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";

// Vídeo do escritório da Esclarece com o layout da arte de referência:
// texto fixo embaixo e logo fixa no canto superior esquerdo. O vídeo já traz
// a logo branca da Esclarece Soluções gravada; cada versão a cobre:
// - Soluções: logo-azul.png recriada no mesmo lugar e formato
//   (scripts/logo_do_video.py);
// - Mamãe: selo rosa com a logo da Esclarece Mamãe, maior que a logo gravada.

const FPS = 30;
export const LIMPAMOS_DURATION = Math.round(15.3 * FPS);
const SANS = "Manrope";

for (const w of ["400", "800"] as const) {
  loadFont({ family: SANS, url: staticFile(`fonts/manrope-latin-${w}-normal.woff2`), weight: w });
}

const line: React.CSSProperties = {
  fontFamily: SANS,
  color: "#fff",
  letterSpacing: "-0.01em",
  textShadow: "0 2px 10px rgba(0,0,0,.35)",
};

const Highlight: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <span
    style={{
      fontWeight: 800,
      background: color,
      padding: "0 14px 4px",
      borderRadius: 4,
      boxDecorationBreak: "clone",
      WebkitBoxDecorationBreak: "clone",
    }}
  >
    {children}
  </span>
);

const SolucoesText: React.FC = () => (
  <div style={{ position: "absolute", left: 66, right: 50, top: 1255 }}>
    <div style={{ ...line, fontWeight: 400, fontSize: 66, lineHeight: 1.15 }}>
      Nós da <Highlight color="rgba(84,118,150,.82)">Esclarece Soluções</Highlight>
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
);

const MamaeText: React.FC = () => (
  <div style={{ position: "absolute", left: 66, right: 50, top: 1170 }}>
    <div style={{ ...line, fontWeight: 400, fontSize: 62, lineHeight: 1.2 }}>
      Nós e nossos Advogados
      <br />
      aqui da <Highlight color="rgba(232,120,166,.9)">Esclarece Mamãe</Highlight>
    </div>
    <div style={{ ...line, fontWeight: 800, fontSize: 70, lineHeight: 1.12, marginTop: 14 }}>
      estamos preparados pra
      <br />
      te ajudar agora mesmo.
    </div>
  </div>
);

export type LimpamosProps = { versao: "solucoes" | "mamae" };

export const LimpamosAd: React.FC<LimpamosProps> = ({ versao }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <OffthreadVideo
      src={staticFile("limpamos/original.mov")}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
    {/* escurece a parte de baixo para o texto ler bem */}
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,.35) 62%, rgba(0,0,0,.62) 100%)",
      }}
    />
    {versao === "solucoes" ? (
      <>
        <Img src={staticFile("limpamos/logo-azul.png")} style={{ position: "absolute", left: 0, top: 0 }} />
        <SolucoesText />
      </>
    ) : (
      <>
        {/* cobre a logo gravada (x 54–322, y 79–296) */}
        <Img
          src={staticFile("mamae/selo-mamae.png")}
          style={{
            position: "absolute",
            left: 38,
            top: 70,
            width: 330,
            filter: "drop-shadow(0 6px 16px rgba(0,0,0,.25))",
          }}
        />
        <MamaeText />
      </>
    )}
    {/* trilha bem baixinha, por baixo da fala */}
    <Audio src={staticFile("limpamos/musica.wav")} volume={0.15} />
  </AbsoluteFill>
);
