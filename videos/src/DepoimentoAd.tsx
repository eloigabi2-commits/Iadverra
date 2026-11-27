import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/fonts";
import CAPTIONS from "./video5-captions.json";

// Depoimento de cliente (João, cozinheiro): legendas palavra a palavra,
// logo azul da Esclarece Soluções no canto e trilha bem baixinha.
// Legendas: scripts/transcrever.py + scripts/captions.py → video5-captions.json
// (com "enrolei" e "Esclarece Soluções" corrigidos à mão na transcrição).

const FPS = 30;
export const DEPOIMENTO_DURATION = Math.round(34.9 * FPS);
const SANS = "Manrope";

loadFont({ family: SANS, url: staticFile("fonts/manrope-latin-800-normal.woff2"), weight: "800" });

const Caption: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / FPS;
  const chunk = CAPTIONS.find((c) => t >= c.start && t < c.end);
  if (!chunk) return null;
  const pop = spring({ frame: frame - Math.round(chunk.start * FPS), fps, config: { damping: 14, stiffness: 220 } });
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: 1440,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        columnGap: 22,
        transform: `scale(${0.85 + 0.15 * pop})`,
        opacity: Math.min(1, pop * 2),
      }}
    >
      {chunk.words.map((w, i) => {
        // palavra sendo falada agora fica em amarelo
        const active = t >= w.s && (i === chunk.words.length - 1 || t < chunk.words[i + 1].s);
        return (
          <span
            key={i}
            style={{
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 78,
              lineHeight: 1.15,
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
              color: active ? "#ffd60a" : "#ffffff",
              WebkitTextStroke: "12px rgba(0,0,0,.9)",
              paintOrder: "stroke fill",
              textShadow: "0 8px 24px rgba(0,0,0,.5)",
            }}
          >
            {w.t}
          </span>
        );
      })}
    </div>
  );
};

export const DepoimentoAd: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <OffthreadVideo
      src={staticFile("video5/original.mp4")}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
    <Img
      src={staticFile("video5/logo-esclarece-azul.png")}
      style={{
        position: "absolute",
        top: 60,
        left: 50,
        width: 170,
        filter: "drop-shadow(0 0 6px rgba(255,255,255,.7))",
      }}
    />
    <Caption />
    {/* trilha bem baixinha, por baixo da fala */}
    <Audio src={staticFile("video5/musica.wav")} volume={0.03} />
  </AbsoluteFill>
);
