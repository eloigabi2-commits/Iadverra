import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/fonts";
import CAPTIONS from "./legenda-captions.json";
import FACE from "./legenda-face.json";

// Vídeo da Esclarece (Black Friday) com a logo como marca d'água no canto
// superior direito, legendas palavra a palavra embaixo, zooms e ícones
// pontuais presos ao rosto e um bloco de destaque na fala da Black Friday.
// Tempos: transcrição do Whisper (scripts/captions.py → legenda-captions.json).
// Rosto: scripts/track_face.py → legenda-face.json.

const FPS = 30;
export const LEGENDA_DURATION = Math.round(57.4 * FPS);
const SANS = "Manrope";
const f = (sec: number) => Math.round(sec * FPS);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);

loadFont({
  family: SANS,
  url: staticFile("fonts/manrope-latin-800-normal.woff2"),
  weight: "800",
});

const C = {
  red: "#ef233c",
  green: "#22c55e",
  blue: "#2b35a8",
  gold: "#f5b700",
  yellow: "#ffd60a",
  ink: "#0b1020",
};

// Bloco da Black Friday (s)
const BF = { start: 46.4, friday: 46.66, off: 47.68, desconto: 49.02, novembro: 51.0, end: 51.8 };

// Zooms rápidos nas palavras de impacto
const PUNCHES = [2.3, 21.94, 25.04, 47.68, 51.82];
const SHAKES = [BF.start];

const useCamera = () => {
  const frame = useCurrentFrame();
  let zoom = 1;
  for (const p of PUNCHES) {
    const d = frame - f(p);
    if (d >= 0 && d < 26) {
      zoom += d < 3 ? interpolate(d, [0, 3], [0, 0.07]) : interpolate(d, [3, 26], [0.07, 0], { easing: ease });
    }
  }
  let x = 0;
  let y = 0;
  for (const s of SHAKES) {
    const d = frame - f(s);
    if (d >= 0 && d < 16) {
      const a = (1 - d / 16) * 18;
      x += a * Math.sin(d * 2.4);
      y += a * Math.cos(d * 3.3);
    }
  }
  return { zoom, x, y };
};

// Posição do rosto (px do quadro 1080×1920), interpolada a 10 pontos/s
const useFace = () => {
  const t = useCurrentFrame() / FPS;
  const i = Math.min(FACE.length - 2, Math.floor(t * 10));
  const [t0, x0, y0] = FACE[i];
  const [t1, x1, y1] = FACE[i + 1];
  const k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k };
};

const Icon: React.FC<{ d: string; size: number; color?: string; width?: number }> = ({
  d,
  size,
  color = "#fff",
  width = 2.4,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const I = {
  alert: "M12 7v6M12 16.8v.1",
  check: "M5 12.5l4.5 4.5L19 7.5",
  tag: "M3 12V4h8l10 10-8 8zM7.5 8.5v.1",
  shield: "M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6zM8.5 12l2.5 2.5 4.8-5",
  down: "M12 4v15M5 12l7 7 7-7",
};

type Pop = { from: number; to: number; side: -1 | 1; bg: string; icon?: string; label?: string; dy?: number };

// Ícones que entram ao lado da cabeça, no momento da fala
const POPS: Pop[] = [
  { from: 2.3, to: 4.6, side: -1, bg: C.red, icon: I.alert },
  { from: 21.94, to: 23.9, side: -1, bg: C.green, icon: I.check },
  { from: 24.22, to: 26.6, side: 1, bg: C.gold, icon: I.tag },
  { from: 27.32, to: 29.6, side: -1, bg: C.blue, label: "30" },
  { from: 31.98, to: 34.3, side: 1, bg: C.green, icon: I.shield },
];

const PopIcon: React.FC<{ p: Pop }> = ({ p }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const face = useFace();
  const k = spring({ frame: frame - f(p.from), fps, config: { damping: 10, stiffness: 190 } });
  const out = interpolate(frame, [f(p.to) - 6, f(p.to)], [1, 0], clamp);
  if (frame < f(p.from) || frame >= f(p.to)) return null;
  const size = 170;
  // leve flutuação para não ficar estático
  const bob = Math.sin((frame - f(p.from)) / 9) * 6;
  return (
    <div
      style={{
        position: "absolute",
        left: face.x + p.side * 350 - size / 2,
        top: face.y - 40 + (p.dy ?? 0) - size / 2 + bob,
        width: size,
        height: size,
        borderRadius: "50%",
        background: p.bg,
        border: "6px solid #fff",
        boxShadow: "0 16px 40px rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: out,
        transform: `scale(${k * (0.8 + 0.2 * out)}) rotate(${(1 - k) * p.side * 80}deg)`,
      }}
    >
      {p.icon ? (
        <Icon d={p.icon} size={92} width={p.icon === I.alert ? 3.6 : 2.4} />
      ) : (
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 70, color: "#fff", letterSpacing: "-0.04em" }}>
          {p.label}
          <div style={{ fontSize: 22, marginTop: -8, textAlign: "center", letterSpacing: "0.1em" }}>DIAS</div>
        </div>
      )}
    </div>
  );
};

// Seta pulando em "clique no botão abaixo"
const DownArrow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const from = 41.14;
  const to = 44.0;
  const k = spring({ frame: frame - f(from), fps, config: { damping: 12 } });
  if (frame < f(from) || frame >= f(to)) return null;
  const out = interpolate(frame, [f(to) - 6, f(to)], [1, 0], clamp);
  const bounce = Math.abs(Math.sin((frame - f(from)) / 5)) * 26;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 1640 + bounce,
        display: "flex",
        justifyContent: "center",
        opacity: k * out,
        filter: "drop-shadow(0 8px 16px rgba(0,0,0,.6))",
      }}
    >
      <Icon d={I.down} size={150} color={C.yellow} width={3.2} />
    </div>
  );
};

// ---------- Black Friday ----------

const Confetti: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const d = frame - f(at);
  if (d < 0 || d > 60) return null;
  const colors = [C.yellow, C.red, "#fff", C.gold, "#ff8fab"];
  return (
    <>
      {Array.from({ length: 46 }).map((_, i) => {
        const ang = (i / 46) * Math.PI * 2 + i;
        const speed = 14 + ((i * 37) % 13);
        const x = Math.cos(ang) * speed * d;
        const y = Math.sin(ang) * speed * d * 0.8 + 0.45 * d * d;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 540 + x,
              top: 1150 + y,
              width: 16,
              height: i % 2 ? 26 : 16,
              borderRadius: i % 3 ? 3 : 8,
              background: colors[i % colors.length],
              transform: `rotate(${d * (10 + (i % 7) * 4)}deg)`,
              opacity: 1 - d / 60,
            }}
          />
        );
      })}
    </>
  );
};

// Título com brilho e glitch de cor nos primeiros quadros
const GlitchWord: React.FC<{ at: number; text: string; color: string; size: number }> = ({
  at,
  text,
  color,
  size,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = frame - f(at);
  if (d < 0) return null;
  const k = spring({ frame: d, fps, config: { damping: 12, stiffness: 240 } });
  const glitch = d < 10 && d % 3 !== 2 ? (d % 2 ? 10 : -10) : 0;
  const base: React.CSSProperties = {
    fontFamily: SANS,
    fontWeight: 800,
    fontSize: size,
    lineHeight: 0.95,
    letterSpacing: "-0.04em",
    textTransform: "uppercase",
  };
  return (
    <div style={{ position: "relative", transform: `scale(${3 - 2 * k})`, opacity: Math.min(1, k * 3) }}>
      {glitch !== 0 && (
        <>
          <div style={{ ...base, position: "absolute", left: glitch, top: 0, color: "rgba(255,0,80,.8)" }}>{text}</div>
          <div style={{ ...base, position: "absolute", left: -glitch, top: 0, color: "rgba(0,220,255,.8)" }}>{text}</div>
        </>
      )}
      <div
        style={{
          ...base,
          position: "relative",
          color,
          textShadow: `0 0 18px ${color}, 0 0 50px ${color}, 0 10px 30px rgba(0,0,0,.6)`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

const OffBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = frame - f(BF.off);
  if (d < 0) return null;
  const k = spring({ frame: d, fps, config: { damping: 11, stiffness: 220 } });
  // pulso em "desconto"
  const pulse = 1 + interpolate(frame - f(BF.desconto), [0, 4, 14], [0, 0.12, 0], clamp);
  const spin = d * 1.2;
  const rays = 18;
  const pts = Array.from({ length: rays * 2 }, (_, i) => {
    const r = i % 2 ? 150 : 185;
    const a = (i / (rays * 2)) * Math.PI * 2;
    return `${200 + Math.cos(a) * r},${200 + Math.sin(a) * r}`;
  }).join(" ");
  return (
    <div
      style={{
        position: "relative",
        width: 400,
        height: 400,
        transform: `scale(${(2.4 - 1.4 * k) * pulse}) rotate(${(1 - k) * -30}deg)`,
        opacity: Math.min(1, k * 3),
      }}
    >
      <svg width="400" height="400" style={{ position: "absolute", inset: 0, transform: `rotate(${spin}deg)` }}>
        <polygon points={pts} fill={C.red} stroke="#fff" strokeWidth="8" strokeLinejoin="round" />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: SANS,
          fontWeight: 800,
          color: "#fff",
          textShadow: "0 4px 12px rgba(0,0,0,.35)",
        }}
      >
        <div style={{ fontSize: 132, letterSpacing: "-0.06em", lineHeight: 0.9 }}>50%</div>
        <div style={{ fontSize: 64, letterSpacing: "0.04em" }}>OFF</div>
      </div>
    </div>
  );
};

const BlackFriday: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < f(BF.start) || frame >= f(BF.end)) return null;
  const d = frame - f(BF.start);
  const out = interpolate(frame, [f(BF.end) - 8, f(BF.end)], [1, 0], clamp);
  const dim = interpolate(d, [0, 6], [0, 0.62], clamp) * out;
  // estrobo branco curto na entrada e no "50%"
  const strobe = Math.max(
    interpolate(d, [0, 1, 4], [0, 0.85, 0], clamp),
    interpolate(frame - f(BF.off), [0, 1, 4], [0, 0.5, 0], clamp),
  );
  const tag = spring({ frame: frame - f(BF.novembro), fps, config: { damping: 12 } });
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 55%, rgba(0,0,0,${dim * 0.75}) 0%, rgba(0,0,0,${dim}) 70%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 770,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: out,
        }}
      >
        <GlitchWord at={BF.start} text="Black" color="#ffffff" size={170} />
        <GlitchWord at={BF.friday} text="Friday" color={C.yellow} size={170} />
        <div style={{ marginTop: 10 }}>
          <OffBadge />
        </div>
        {frame >= f(BF.novembro) && (
          <div
            style={{
              marginTop: -10,
              background: "#fff",
              color: C.ink,
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 46,
              letterSpacing: "0.12em",
              padding: "10px 30px",
              borderRadius: 14,
              transform: `scale(${tag}) rotate(-3deg)`,
            }}
          >
            SÓ EM NOVEMBRO
          </div>
        )}
      </div>
      <Confetti at={BF.off} />
      <AbsoluteFill style={{ background: `rgba(255,255,255,${strobe})` }} />
    </AbsoluteFill>
  );
};

// ---------- Legendas ----------

const Caption: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / FPS;
  // durante a Black Friday o destaque gráfico substitui a legenda
  if (t >= BF.start && t < BF.end) return null;
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
              color: active ? C.yellow : "#ffffff",
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

// Marca d'água: pequena, discreta; pulsa quando a marca é falada
const Watermark: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = Math.max(
    ...[11.54, 51.82].map((t) => interpolate(frame - f(t), [0, 5, 20], [0, 0.25, 0], clamp)),
  );
  return (
    <Img
      src={staticFile("legenda/logo-esclarece.png")}
      style={{
        position: "absolute",
        top: 70,
        right: 50,
        width: 130,
        opacity: 0.85 + pulse * 0.6,
        transform: `scale(${1 + pulse})`,
        transformOrigin: "100% 0%",
        filter: "drop-shadow(0 4px 10px rgba(0,0,0,.45))",
      }}
    />
  );
};

// ---------- Som ----------

const sfx = (name: string) => staticFile(`esclarece/${name}`);

const SOUNDS: [string, number[], number][] = [
  ["pop.wav", POPS.map((p) => p.from), 0.4],
  ["whoosh.wav", [BF.start - 0.2, 41.0], 0.35],
  ["thud.wav", [BF.start, BF.off], 0.75],
  ["coin.wav", [BF.off + 0.15, BF.off + 0.35], 0.4],
  ["up.wav", [BF.desconto], 0.45],
  ["bip.wav", [BF.novembro, 11.54, 51.82], 0.35],
];

const Soundtrack: React.FC = () => (
  <>
    {SOUNDS.flatMap(([file, times, volume]) =>
      times.map((t) => (
        <Sequence key={`${file}${t}`} from={Math.max(0, f(t))}>
          <Audio src={sfx(file)} volume={volume} />
        </Sequence>
      )),
    )}
  </>
);

export const LegendaAd: React.FC = () => {
  const cam = useCamera();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})`,
          transformOrigin: "50% 30%",
        }}
      >
        <OffthreadVideo
          src={staticFile("legenda/original.mp4")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {POPS.map((p) => (
          <PopIcon key={p.from} p={p} />
        ))}
      </AbsoluteFill>
      <BlackFriday />
      <DownArrow />
      <Caption />
      <Watermark />
      <Soundtrack />
    </AbsoluteFill>
  );
};
