import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/fonts";
import CAPTIONS from "./legenda-captions.json";

// Vídeo da Esclarece (Black Friday) com a logo como marca d'água no canto
// superior direito e legendas embaixo, palavra a palavra. Os blocos vêm da
// transcrição do Whisper (scripts/captions.py → legenda-captions.json).

const FPS = 30;
export const LEGENDA_DURATION = Math.round(57.4 * FPS);
const SANS = "Manrope";

loadFont({
  family: SANS,
  url: staticFile("fonts/manrope-latin-800-normal.woff2"),
  weight: "800",
});

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
        top: 1480,
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

export const LegendaAd: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <OffthreadVideo
      src={staticFile("legenda/original.mp4")}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
    {/* marca d'água: pequena, discreta, canto superior direito */}
    <Img
      src={staticFile("legenda/logo-esclarece.png")}
      style={{
        position: "absolute",
        top: 70,
        right: 50,
        width: 130,
        opacity: 0.85,
        filter: "drop-shadow(0 4px 10px rgba(0,0,0,.45))",
      }}
    />
    <Caption />
  </AbsoluteFill>
);
