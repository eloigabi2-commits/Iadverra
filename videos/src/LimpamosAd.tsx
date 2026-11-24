import React from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";

// Vídeo do escritório da Esclarece com o layout da arte de referência:
// texto fixo embaixo e logo fixa no canto superior esquerdo. O vídeo já traz
// a logo branca da Esclarece Soluções gravada; cada versão a cobre:
// - Soluções: logo-azul.png recriada no mesmo lugar e formato
//   (scripts/logo_do_video.py);
// - Mamãe e Assessoria: a logo gravada é apagada antes
//   (scripts/apagar_logo.py → limpamos/sem-logo.mp4) e a logo da marca entra
//   só na cor dela, sem fundo.

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

const MARCAS = {
  mamae: {
    nome: "Esclarece Mamãe",
    logo: "mamae/logo-mamae-rosa.png",
    destaque: "rgba(232,120,166,.9)",
    sombra: "drop-shadow(0 2px 8px rgba(0,0,0,.25))",
  },
  assessoria: {
    nome: "Esclarece Assessoria",
    logo: "assessoria/logo-assessoria.png",
    destaque: "rgba(123,28,42,.9)",
    // halo claro: o vinho some no teto escuro sem ele
    sombra: "drop-shadow(0 0 6px rgba(255,255,255,.55)) drop-shadow(0 2px 6px rgba(0,0,0,.2))",
  },
};

const MarcaText: React.FC<{ marca: keyof typeof MARCAS }> = ({ marca }) => (
  <div style={{ position: "absolute", left: 66, right: 50, top: 1400 }}>
    <div style={{ ...line, fontWeight: 400, fontSize: 62, lineHeight: 1.2 }}>
      Nós e nossos Advogados
      <br />
      aqui da <Highlight color={MARCAS[marca].destaque}>{MARCAS[marca].nome}</Highlight>
    </div>
    <div style={{ ...line, fontWeight: 800, fontSize: 70, lineHeight: 1.12, marginTop: 14 }}>
      estamos preparados pra
      <br />
      te ajudar agora mesmo.
    </div>
  </div>
);

export type LimpamosProps = { versao: "solucoes" | keyof typeof MARCAS };

export const LimpamosAd: React.FC<LimpamosProps> = ({ versao }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <OffthreadVideo
      src={staticFile(versao === "solucoes" ? "limpamos/original.mov" : "limpamos/sem-logo.mp4")}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
    {/* escurece a parte de baixo para o texto ler bem */}
    <AbsoluteFill
      style={{
        background:
          versao !== "solucoes"
            ? "linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,.35) 72%, rgba(0,0,0,.65) 100%)"
            : "linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,.35) 62%, rgba(0,0,0,.62) 100%)",
      }}
    />
    {versao === "solucoes" ? (
      <>
        <Img src={staticFile("limpamos/logo-azul.png")} style={{ position: "absolute", left: 0, top: 0 }} />
        <SolucoesText />
      </>
    ) : (
      <>
        <Img
          src={staticFile(MARCAS[versao].logo)}
          style={{
            position: "absolute",
            left: 40,
            top: 55,
            width: 380,
            filter: MARCAS[versao].sombra,
          }}
        />
        <MarcaText marca={versao} />
      </>
    )}
    {/* trilha bem baixinha, por baixo da fala */}
    <Audio src={staticFile("limpamos/musica.wav")} volume={0.15} />
  </AbsoluteFill>
);
