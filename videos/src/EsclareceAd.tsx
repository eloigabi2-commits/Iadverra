import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/fonts";
import FACE from "./esclarece-face.json";

// Edição por cima do vídeo gravado da Esclarece Soluções (48 s, 9:16).
// Em vez de texto, elementos visuais ilustram cada fala no instante em que
// ela acontece (tempos do Whisper) e acompanham o rosto do apresentador
// (rastreado com OpenCV em scripts/track_face.py → esclarece-face.json).
// A logo (canto superior esquerdo) e as legendas gravadas (y ≈ 1400–1560)
// ficam livres.

const C = {
  white: "#ffffff",
  red: "#ef233c",
  green: "#22c55e",
  blue: "#2f80ff",
  gold: "#f5b700",
  wa: "#25d366",
  ink: "#0b1020",
  grey: "#d7dbe3",
};
const SANS = "Manrope";

loadFont({
  family: SANS,
  url: staticFile("fonts/manrope-latin-800-normal.woff2"),
  weight: "800",
});

const FPS = 30;
export const ESCLARECE_DURATION = Math.round(48.1 * FPS);
const f = (sec: number) => Math.round(sec * FPS);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);

// Momentos da fala (s)
const T = {
  reclame: 5.14,
  destruindo: 6.02,
  nao: 10.76,
  empresa: 13.16,
  privada: 14.12,
  produtos: 15.7,
  lucra: 17.48,
  exposicao: 18.32,
  marca: 20.76,
  especialistas: 24.68,
  direito: 25.76,
  judicial: 28.92,
  eliminar: 30.94,
  definitiva: 33.84,
  lei: 35.42,
  retome: 36.66,
  crescer: 38.64,
  cta: 40.62,
  esclarece: 44.68,
};

// Posição do rosto no quadro atual (px do vídeo), interpolada a 10 pontos/s
const useFace = () => {
  const t = useCurrentFrame() / FPS;
  const i = Math.min(FACE.length - 2, Math.floor(t * 10));
  const [t0, x0, y0, w0] = FACE[i];
  const [t1, x1, y1, w1] = FACE[i + 1];
  const k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, w: w0 + (w1 - w0) * k };
};

const PUNCHES = [T.destruindo, T.nao, T.lucra, T.judicial, T.definitiva, T.crescer];
const SHAKES = [T.destruindo, T.judicial];

const useCamera = () => {
  const frame = useCurrentFrame();
  let zoom = 1;
  for (const p of PUNCHES) {
    const d = frame - f(p);
    if (d >= 0 && d < 30) {
      zoom += d < 4 ? interpolate(d, [0, 4], [0, 0.08]) : interpolate(d, [4, 30], [0.08, 0], { easing: ease });
    }
  }
  let x = 0;
  let y = 0;
  for (const sh of SHAKES) {
    const d = frame - f(sh);
    if (d >= 0 && d < 14) {
      const a = (1 - d / 14) * 14;
      x += a * Math.sin(d * 2.3);
      y += a * Math.cos(d * 3.1);
    }
  }
  return { zoom, x, y };
};

// Entrada com mola (0 → 1) a partir de um instante
const useIn = (at: number, damping = 12, stiffness = 170) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - f(at), fps, config: { damping, stiffness } });
};

// Saída rápida antes de um instante (1 → 0)
const useOut = (at: number, len = 8) =>
  interpolate(useCurrentFrame(), [f(at) - len, f(at)], [1, 0], clamp);

const Visible: React.FC<{ from: number; to: number; children: React.ReactNode }> = ({
  from,
  to,
  children,
}) => {
  const frame = useCurrentFrame();
  return frame >= f(from) && frame < f(to) ? <>{children}</> : null;
};

// Posicionado em relação ao rosto (dx/dy em px, centro do elemento)
const OnFace: React.FC<{ dx: number; dy: number; children: React.ReactNode }> = ({
  dx,
  dy,
  children,
}) => {
  const face = useFace();
  return (
    <div
      style={{
        position: "absolute",
        left: face.x + dx,
        top: face.y + dy,
        transform: "translate(-50%, -50%)",
      }}
    >
      {children}
    </div>
  );
};

const Icon: React.FC<{ d: string; size?: number; color?: string; width?: number }> = ({
  d,
  size = 72,
  color = "#fff",
  width = 2.4,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const I = {
  alert: "M12 8v5M12 16.5v.1",
  store: "M3 9l2-5h14l2 5M3 9h18v11H3zM9 20v-6h6v6M3 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3",
  lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  tag: "M3 12V4h8l10 10-8 8zM7.5 8.5v.1",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  scale: "M12 3v18M7 21h10M4 7h16M4 7l-3 7a3 3 0 0 0 6 0zM20 7l-3 7a3 3 0 0 0 6 0z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  shield: "M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6zM8.5 12l2.5 2.5 4.8-5",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
};

const Star: React.FC<{ size: number; fill: number }> = ({ size, fill }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <defs>
      <linearGradient id={`g${Math.round(fill * 100)}`}>
        <stop offset={`${fill * 100}%`} stopColor={C.gold} />
        <stop offset={`${fill * 100}%`} stopColor={C.grey} />
      </linearGradient>
    </defs>
    <path
      d="M12 2.5l2.94 6.1 6.56.86-4.8 4.6 1.2 6.54L12 17.4l-5.9 3.2 1.2-6.54-4.8-4.6 6.56-.86z"
      fill={`url(#g${Math.round(fill * 100)})`}
    />
  </svg>
);

// Cartão de reputação: nota e estrelas que caem ou sobem
const ReputationCard: React.FC<{ score: number; enter: number }> = ({ score, enter }) => {
  const bad = score < 3;
  return (
    <div
      style={{
        width: 560,
        background: C.white,
        borderRadius: 34,
        padding: "26px 34px",
        boxShadow: "0 30px 70px rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "center",
        gap: 26,
        transform: `scale(${0.5 + 0.5 * enter}) rotate(${(1 - enter) * -8}deg)`,
        opacity: Math.min(1, enter * 2),
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 96,
          letterSpacing: "-0.04em",
          color: bad ? C.red : C.green,
          width: 170,
          textAlign: "center",
        }}
      >
        {score.toFixed(1).replace(".", ",")}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} size={58} fill={Math.min(1, Math.max(0, score - i))} />
          ))}
        </div>
        <div style={{ height: 16, borderRadius: 8, background: "#eef0f4", marginTop: 16, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${(score / 5) * 100}%`,
              background: bad ? C.red : C.green,
              borderRadius: 8,
            }}
          />
        </div>
      </div>
    </div>
  );
};

// Notificação de reclamação: ícone e linhas, sem texto
const Complaint: React.FC<{ at: number; gone: number; i: number }> = ({ at, gone, i }) => {
  const frame = useCurrentFrame();
  const k = useIn(at, 11, 190);
  const g = interpolate(frame, [f(gone), f(gone) + 9], [0, 1], { ...clamp, easing: ease });
  if (frame < f(at) || g >= 1) return null;
  const wobble = frame >= f(T.destruindo) && frame < f(T.destruindo) + 14 ? Math.sin(frame * 2) * 6 : 0;
  return (
    <div
      style={{
        width: 250,
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: C.white,
        borderRadius: 22,
        padding: "16px 18px",
        marginTop: i ? 14 : 0,
        borderLeft: `10px solid ${C.red}`,
        boxShadow: "0 16px 36px rgba(0,0,0,.4)",
        opacity: Math.min(1, k * 2) * (1 - g),
        transform: `translateX(${(1 - k) * 120 + g * 260 + wobble}px) rotate(${g * 20}deg) scale(${0.7 + 0.3 * k})`,
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          flexShrink: 0,
          borderRadius: "50%",
          background: C.red,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon d={I.alert} size={40} width={3.4} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ height: 12, borderRadius: 6, background: "#c9ced8", width: "90%" }} />
        <div style={{ height: 12, borderRadius: 6, background: "#e3e6ec", width: "60%", marginTop: 10 }} />
      </div>
    </div>
  );
};

// Lixeira que engole as reclamações
const Trash: React.FC = () => {
  const frame = useCurrentFrame();
  const k = useIn(T.eliminar - 0.3, 12);
  const out = useOut(33.4);
  const gulp = [T.eliminar, T.eliminar + 0.4, T.eliminar + 0.8].some((t) => frame - f(t) >= 6 && frame - f(t) < 12);
  return (
    <div
      style={{
        width: 140,
        height: 140,
        borderRadius: "50%",
        background: C.ink,
        border: "6px solid #fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 16px 40px rgba(0,0,0,.5)",
        opacity: k * out,
        transform: `scale(${k * (gulp ? 1.15 : 1)})`,
      }}
    >
      <Icon d={I.trash} size={76} />
    </div>
  );
};

// Placa "proibido"
const NoSign: React.FC = () => {
  const frame = useCurrentFrame();
  const k = useIn(T.nao, 9, 200);
  const ring = interpolate(frame - f(T.nao), [0, 20], [0, 1], clamp);
  return (
    <div style={{ position: "relative", width: 230, height: 230 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: `8px solid ${C.red}`,
          opacity: 1 - ring,
          transform: `scale(${1 + ring * 0.6})`,
        }}
      />
      <svg width="230" height="230" viewBox="0 0 100 100" style={{ transform: `scale(${k}) rotate(${(1 - k) * 120}deg)` }}>
        <circle cx="50" cy="50" r="42" fill="rgba(255,255,255,.92)" stroke={C.red} strokeWidth="11" />
        <line x1="22" y1="22" x2="78" y2="78" stroke={C.red} strokeWidth="11" strokeLinecap="round" />
      </svg>
    </div>
  );
};

const Bubble: React.FC<{ at: number; bg: string; icon: string; size?: number }> = ({
  at,
  bg,
  icon,
  size = 150,
}) => {
  const k = useIn(at, 10, 180);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        border: "6px solid #fff",
        boxShadow: "0 18px 40px rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${k}) rotate(${(1 - k) * -90}deg)`,
      }}
    >
      <Icon d={icon} size={size * 0.52} />
    </div>
  );
};

// Loja que solta moedas quando "lucra"
const MoneyStore: React.FC = () => {
  const frame = useCurrentFrame();
  const d = frame - f(T.lucra);
  return (
    <div style={{ position: "relative", width: 230, height: 230 }}>
      <Bubble at={T.empresa} bg={C.blue} icon={I.store} size={170} />
      <div style={{ position: "absolute", right: -10, top: -10 }}>
        <Bubble at={T.privada} bg={C.ink} icon={I.lock} size={80} />
      </div>
      <div style={{ position: "absolute", left: -20, top: -10 }}>
        <Bubble at={T.produtos} bg={C.gold} icon={I.tag} size={80} />
      </div>
      {d >= 0 &&
        Array.from({ length: 9 }).map((_, i) => {
          const t = d - i * 3;
          if (t < 0) return null;
          const p = Math.min(1, t / 40);
          const x = Math.sin(i * 2.1) * 140 * p;
          const y = -260 * p + 300 * p * p;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 85 + x,
                top: 60 + y,
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: `radial-gradient(circle at 35% 35%, #ffe680, ${C.gold})`,
                border: "4px solid #c78f00",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: SANS,
                fontWeight: 800,
                fontSize: 30,
                color: "#7a5600",
                opacity: 1 - Math.max(0, (p - 0.75) * 4),
                transform: `rotateY(${t * 18}deg)`,
              }}
            >
              $
            </div>
          );
        })}
    </div>
  );
};

// Escudo da marca com anéis de brilho
const BrandShield: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const k = useIn(at, 11, 160);
  const d = frame - f(at);
  return (
    <div style={{ position: "relative", width: 260, height: 260 }}>
      {[0, 1].map((r) => {
        const p = ((d + r * 20) % 40) / 40;
        return (
          <div
            key={r}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "5px solid rgba(255,255,255,.8)",
              opacity: d > 0 ? 1 - p : 0,
              transform: `scale(${0.8 + p * 0.7})`,
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          inset: 20,
          borderRadius: "50%",
          background: `radial-gradient(circle at 40% 35%, #3b8bff, #12357a)`,
          boxShadow: "0 0 60px rgba(47,128,255,.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${k})`,
        }}
      >
        <svg width="130" height="130" viewBox="0 0 24 24" fill="none">
          <path d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z" fill="#fff" />
          <path d="M8 12.5l2.6 2.6 5.6-6.2M14 8.9h2.2v2.2" stroke="#12357a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};

// Martelo de juiz batendo num processo, depois carimbo verde
const GavelScene: React.FC = () => {
  const frame = useCurrentFrame();
  const k = useIn(T.judicial - 0.6, 13);
  const hit = frame - f(T.judicial);
  const angle = hit < 0 ? interpolate(hit, [-12, 0], [-10, -55], clamp) : interpolate(hit, [0, 3, 14], [-55, 15, 0], clamp);
  const ring = interpolate(hit, [0, 16], [0, 1], clamp);
  const stamp = useIn(T.definitiva, 13, 240);
  return (
    <div style={{ position: "relative", width: 520, height: 360, opacity: Math.min(1, k * 2), transform: `scale(${0.6 + 0.4 * k})` }}>
      {/* processo */}
      <div
        style={{
          position: "absolute",
          left: 40,
          top: 70,
          width: 300,
          height: 270,
          background: C.white,
          borderRadius: 18,
          boxShadow: "0 20px 50px rgba(0,0,0,.45)",
          padding: 26,
          transform: "rotate(-4deg)",
        }}
      >
        <Icon d={I.scale} size={64} color={C.ink} width={1.8} />
        {[0.95, 0.8, 0.9, 0.6].map((w, i) => (
          <div key={i} style={{ height: 12, borderRadius: 6, background: "#d5d9e1", width: `${w * 100}%`, marginTop: 16 }} />
        ))}
        {frame >= f(T.definitiva) && (
          <div
            style={{
              position: "absolute",
              right: -30,
              bottom: -20,
              width: 130,
              height: 130,
              borderRadius: "50%",
              border: `8px solid ${C.green}`,
              background: "rgba(34,197,94,.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${2.2 - 1.2 * stamp}) rotate(-14deg)`,
              opacity: Math.min(1, stamp * 3),
            }}
          >
            <Icon d={I.check} size={80} color={C.green} width={3.4} />
          </div>
        )}
      </div>
      {/* onda de impacto */}
      <div
        style={{
          position: "absolute",
          left: 250,
          top: 200,
          width: 200,
          height: 200,
          marginLeft: -100,
          marginTop: -100,
          borderRadius: "50%",
          border: "6px solid #fff",
          opacity: hit >= 0 ? 1 - ring : 0,
          transform: `scale(${0.3 + ring * 1.4})`,
        }}
      />
      {/* martelo */}
      <svg
        width="260"
        height="260"
        viewBox="0 0 100 100"
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          transformOrigin: "85% 85%",
          transform: `rotate(${angle}deg)`,
          filter: "drop-shadow(0 12px 18px rgba(0,0,0,.5))",
        }}
      >
        <rect x="47" y="40" width="10" height="55" rx="4" fill="#8a5a2b" transform="rotate(-45 52 67)" />
        <rect x="18" y="18" width="46" height="24" rx="6" fill="#6b3f17" transform="rotate(-45 41 30)" />
        <rect x="14" y="22" width="8" height="16" rx="2" fill="#c99a5b" transform="rotate(-45 41 30)" />
        <rect x="60" y="22" width="8" height="16" rx="2" fill="#c99a5b" transform="rotate(-45 41 30)" />
      </svg>
    </div>
  );
};

// Gráfico que sobe
const GrowthChart: React.FC = () => {
  const frame = useCurrentFrame();
  const k = useIn(T.crescer - 0.2, 14);
  const p = interpolate(frame - f(T.crescer), [0, 24], [0, 1], { ...clamp, easing: ease });
  const len = 300;
  return (
    <div
      style={{
        width: 250,
        height: 200,
        background: C.white,
        borderRadius: 26,
        boxShadow: "0 18px 40px rgba(0,0,0,.45)",
        padding: 18,
        opacity: k,
        transform: `scale(${0.6 + 0.4 * k})`,
      }}
    >
      <svg width="214" height="164" viewBox="0 0 214 164">
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={14 + i * 50} y={130 - i * 30} width="30" height={i * 30 + 20} rx="5" fill="#e6f8ee" />
        ))}
        <polyline
          points="10,140 60,110 105,120 150,60 204,18"
          fill="none"
          stroke={C.green}
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - p)}
        />
      </svg>
    </div>
  );
};

// Reputação: cai no começo e se recupera no fim
const ReputationScene: React.FC<{ phase: "cai" | "sobe" }> = ({ phase }) => {
  const frame = useCurrentFrame();
  const at = phase === "cai" ? T.reclame - 0.3 : T.retome;
  const enter = useIn(at, 12);
  const out = useOut(phase === "cai" ? 8.2 : 40.5);
  const score =
    phase === "cai"
      ? interpolate(frame, [f(T.destruindo) - 4, f(T.destruindo) + 20], [4.8, 1.2], { ...clamp, easing: ease })
      : interpolate(frame, [f(T.retome) + 10, f(38.2)], [1.2, 4.9], { ...clamp, easing: ease });
  return (
    <div style={{ opacity: out }}>
      <ReputationCard score={score} enter={enter} />
    </div>
  );
};

// Elementos presos ao rosto (ficam na mesma camada do vídeo, com o zoom)
const Tracked: React.FC = () => (
  <>
    {/* reputação abaixo do rosto */}
    <Visible from={T.reclame - 0.3} to={8.2}>
      <OnFace dx={0} dy={470}>
        <ReputationScene phase="cai" />
      </OnFace>
    </Visible>
    {/* reclamações à direita da cabeça, até serem eliminadas */}
    <Visible from={T.reclame} to={32.2}>
      <OnFace dx={330} dy={-30}>
        <div style={{ position: "relative" }}>
          {[T.reclame, T.reclame + 0.35, T.reclame + 0.7].map((at, i) => (
            <Complaint key={i} at={at} gone={T.eliminar + i * 0.4} i={i} />
          ))}
          {/* destaque de "exposição" */}
          <ExposureGlow />
        </div>
      </OnFace>
    </Visible>
    <Visible from={T.nao} to={12.9}>
      <OnFace dx={-330} dy={10}>
        <NoSign />
      </OnFace>
    </Visible>
    <Visible from={T.empresa} to={20.3}>
      <OnFace dx={-330} dy={20}>
        <MoneyStoreFade />
      </OnFace>
    </Visible>
    <Visible from={T.marca} to={24.4}>
      <OnFace dx={0} dy={500}>
        <FadeOut at={24.4}>
          <BrandShield at={T.marca} />
        </FadeOut>
      </OnFace>
    </Visible>
    <Visible from={T.especialistas} to={27.6}>
      <OnFace dx={-330} dy={20}>
        <FadeOut at={27.6}>
          <Bubble at={T.especialistas} bg={C.blue} icon={I.scale} size={180} />
        </FadeOut>
      </OnFace>
    </Visible>
    <Visible from={T.judicial - 0.6} to={36.4}>
      <OnFace dx={0} dy={500}>
        <FadeOut at={36.4}>
          <GavelScene />
        </FadeOut>
      </OnFace>
    </Visible>
    <Visible from={T.eliminar - 0.3} to={33.4}>
      <OnFace dx={360} dy={260}>
        <Trash />
      </OnFace>
    </Visible>
    <Visible from={T.lei} to={36.6}>
      <OnFace dx={-330} dy={20}>
        <FadeOut at={36.6}>
          <Bubble at={T.lei} bg={C.green} icon={I.shield} size={180} />
        </FadeOut>
      </OnFace>
    </Visible>
    <Visible from={T.retome} to={40.5}>
      <OnFace dx={0} dy={470}>
        <ReputationScene phase="sobe" />
      </OnFace>
    </Visible>
    <Visible from={T.crescer - 0.2} to={40.5}>
      <OnFace dx={340} dy={0}>
        <FadeOut at={40.5}>
          <GrowthChart />
        </FadeOut>
      </OnFace>
    </Visible>
  </>
);

const FadeOut: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const o = useOut(at);
  return <div style={{ opacity: o, transform: `scale(${0.8 + 0.2 * o})` }}>{children}</div>;
};

const MoneyStoreFade: React.FC = () => (
  <FadeOut at={20.3}>
    <MoneyStore />
  </FadeOut>
);

const ExposureGlow: React.FC = () => {
  const frame = useCurrentFrame();
  const k = useIn(T.exposicao, 10);
  const d = frame - f(T.exposicao);
  if (d < 0 || d > 50) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: -50,
        top: -60,
        transform: `scale(${k})`,
        opacity: 1 - Math.max(0, (d - 35) / 15),
      }}
    >
      <Bubble at={T.exposicao} bg={C.gold} icon={I.eye} size={100} />
    </div>
  );
};

// Flash vermelho nas bordas no momento do alerta
const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  const a = Math.max(...[T.destruindo, T.nao].map((t) => interpolate(frame - f(t), [0, 3, 18], [0, 0.5, 0], clamp)));
  return (
    <AbsoluteFill
      style={{ background: `radial-gradient(circle at 50% 45%, rgba(239,35,60,0) 40%, rgba(239,35,60,${a}) 100%)` }}
    />
  );
};

const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < f(T.cta)) return null;
  const d = frame - f(T.cta);
  const dim = interpolate(d, [0, 12], [0, 0.45], clamp);
  const btn = spring({ frame: d, fps, config: { damping: 10, stiffness: 150 } });
  const tap = (d % 36) / 36;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `rgba(5,8,18,${dim})` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 960, display: "flex", justifyContent: "center" }}>
        <div style={{ position: "relative", transform: `scale(${btn * (1 + 0.04 * Math.sin(d / 5))})` }}>
          <div
            style={{
              position: "absolute",
              inset: -20,
              borderRadius: 999,
              border: `6px solid ${C.wa}`,
              opacity: 1 - tap,
              transform: `scale(${1 + tap * 0.25})`,
            }}
          />
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 82,
              textTransform: "uppercase",
              letterSpacing: "-0.03em",
              color: C.white,
              background: C.wa,
              padding: "34px 70px 40px",
              borderRadius: 999,
              boxShadow: "0 24px 60px rgba(37,211,102,.5)",
            }}
          >
            Saiba mais
          </div>
          <svg
            width="120"
            height="120"
            viewBox="0 0 24 24"
            style={{
              position: "absolute",
              right: -40,
              bottom: -80,
              transform: `translateY(${Math.sin(d / 5) * 10}px)`,
              filter: "drop-shadow(0 8px 14px rgba(0,0,0,.6))",
            }}
          >
            <path
              d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-.5a1.5 1.5 0 0 1 3 0V11m0-.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.2a6 6 0 0 1-4.6-2.2L3.5 16a1.6 1.6 0 0 1 2.4-2.1L9 16"
              fill="#fff"
              stroke="#111"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      {frame >= f(T.esclarece) && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 560, display: "flex", justifyContent: "center" }}>
          <BrandShield at={T.esclarece} />
        </div>
      )}
    </AbsoluteFill>
  );
};

const sfx = (name: string) => staticFile(`esclarece/${name}`);

const SOUNDS: [string, number[], number][] = [
  ["pop.wav", [T.reclame, T.reclame + 0.35, T.reclame + 0.7, T.empresa, T.privada, T.produtos, T.exposicao, T.especialistas, T.lei], 0.45],
  ["whoosh.wav", [T.reclame - 0.3, T.nao - 0.15, T.marca - 0.15, T.judicial - 0.7, T.retome - 0.15, T.cta - 0.15], 0.3],
  ["thud.wav", [T.destruindo, T.judicial, T.definitiva], 0.7],
  ["coin.wav", [T.lucra, T.lucra + 0.2, T.lucra + 0.45], 0.35],
  ["whoosh.wav", [T.eliminar, T.eliminar + 0.4, T.eliminar + 0.8], 0.25],
  ["up.wav", [T.retome + 0.3, T.crescer], 0.5],
  ["bip.wav", [T.marca, T.cta, T.esclarece], 0.4],
];

const Soundtrack: React.FC = () => (
  <>
    <Audio src={sfx("musica.wav")} volume={0.1} />
    {SOUNDS.flatMap(([file, times, volume]) =>
      times.map((t) => (
        <Sequence key={`${file}${t}`} from={Math.max(0, f(t))}>
          <Audio src={sfx(file)} volume={volume} />
        </Sequence>
      )),
    )}
  </>
);

export const EsclareceAd: React.FC = () => {
  const cam = useCamera();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})`,
          // ancorado perto da logo para ela não sair do quadro
          transformOrigin: "12% 4%",
        }}
      >
        <OffthreadVideo src={staticFile("esclarece/original.mp4")} style={{ filter: "contrast(1.06) saturate(1.1)" }} />
        <Tracked />
      </AbsoluteFill>
      <Flash />
      <Cta />
      <Soundtrack />
    </AbsoluteFill>
  );
};
