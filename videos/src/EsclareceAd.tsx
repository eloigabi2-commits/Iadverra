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

// Edição por cima do vídeo gravado da Esclarece Soluções (48 s, 9:16).
// O vídeo já traz logo (canto superior esquerdo) e legendas (faixa de
// y ≈ 1400–1560), então os elementos ficam no topo e na altura do peito.

const C = {
  navy: "#0f1c3f",
  white: "#ffffff",
  red: "#ef4444",
  green: "#22c55e",
  blue: "#3b82f6",
  wa: "#25d366",
};
const SANS = "Manrope";

for (const w of ["600", "800"] as const) {
  loadFont({
    family: SANS,
    url: staticFile(`fonts/manrope-latin-${w}-normal.woff2`),
    weight: w,
  });
}

const FPS = 30;
export const ESCLARECE_DURATION = Math.round(48.1 * FPS);
const s = (sec: number) => Math.round(sec * FPS);

// Trocas de assunto na fala (segundos), usadas para os zooms e os whooshes
const CUTS = [8.0, 13.0, 20.5, 26.1, 36.6, 40.6];

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

// Zoom em degraus: alterna enquadramento aberto e fechado a cada troca.
// Ancorado perto da logo para ela não sair do quadro.
const ZOOM = 1.07;
const useZoom = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const idx = CUTS.filter((c) => t >= c).length;
  const target = idx % 2 === 0 ? 1 : ZOOM;
  const prev = idx === 0 ? 1 : (idx - 1) % 2 === 0 ? 1 : ZOOM;
  const since = idx === 0 ? t : t - CUTS[idx - 1];
  const k = interpolate(since, [0, 0.35], [0, 1], { ...clamp, easing: ease });
  // leve aproximação contínua no gancho
  const drift = idx === 0 ? interpolate(t, [0, 8], [1.0, 1.04]) : 1;
  return (prev + (target - prev) * k) * drift;
};

const Pop: React.FC<{
  from: number;
  to: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ from, to, style, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inS = spring({ frame: frame - s(from), fps, config: { damping: 14 } });
  const out = interpolate(frame, [s(to) - 6, s(to)], [1, 0], clamp);
  if (frame < s(from) || frame > s(to)) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: Math.min(1, inS * 1.4) * out,
        transform: `scale(${0.8 + 0.2 * inS}) translateY(${(1 - inS) * 30}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Card: React.FC<{
  bg?: string;
  color?: string;
  size?: number;
  children: React.ReactNode;
}> = ({ bg = C.white, color = C.navy, size = 62, children }) => (
  <div
    style={{
      maxWidth: 920,
      background: bg,
      color,
      fontFamily: SANS,
      fontWeight: 800,
      fontSize: size,
      lineHeight: 1.12,
      letterSpacing: "-0.02em",
      textAlign: "center",
      padding: "26px 40px",
      borderRadius: 28,
      boxShadow: "0 24px 60px rgba(0,0,0,.35)",
    }}
  >
    {children}
  </div>
);

const Mark: React.FC<{ color: string; children: React.ReactNode }> = ({
  color,
  children,
}) => <span style={{ color }}>{children}</span>;

// Entre o rosto e as legendas gravadas (o topo é ocupado pela cabeça e pela logo)
const CHEST = { top: 1040 };

const Check: React.FC<{ from: number; label: string; i: number }> = ({
  from,
  label,
  i,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = spring({ frame: frame - s(from), fps, config: { damping: 15 } });
  if (frame < s(from)) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 22,
        background: "rgba(15,28,63,.92)",
        borderRadius: 22,
        padding: "18px 30px",
        marginTop: i ? 16 : 0,
        opacity: k,
        transform: `translateX(${(1 - k) * -80}px)`,
        boxShadow: "0 18px 40px rgba(0,0,0,.35)",
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: "50%",
          background: C.green,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 50,
          color: C.white,
          letterSpacing: "-0.02em",
        }}
      >
        {label}
      </div>
    </div>
  );
};

// Tela final: faixa de chamada para ação com seta pulsando
const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = spring({ frame: frame - s(40.6), fps, config: { damping: 13 } });
  if (frame < s(40.6)) return null;
  const bounce = Math.sin((frame - s(40.6)) / 5) * 10;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: Math.min(1, k * 1.4),
        transform: `scale(${0.85 + 0.15 * k})`,
      }}
    >
      <div
        style={{
          background: C.wa,
          color: C.white,
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 60,
          padding: "30px 60px",
          borderRadius: 999,
          boxShadow: "0 24px 60px rgba(37,211,102,.45)",
          transform: `scale(${1 + 0.03 * Math.sin((frame - s(40.6)) / 6)})`,
        }}
      >
        Clique em Saiba Mais
      </div>
      <svg
        width="90"
        height="90"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          marginTop: 18,
          transform: `translateY(${bounce}px)`,
          filter: "drop-shadow(0 6px 12px rgba(0,0,0,.5))",
        }}
      >
        <path d="M12 4v15M5 12l7 7 7-7" />
      </svg>
    </div>
  );
};

const Overlays: React.FC = () => {
  const frame = useCurrentFrame();
  return (
  <>
    {/* gancho */}
    <Pop from={0.15} to={7.6} style={CHEST}>
      <Card size={66}>
        O Reclame Aqui está <Mark color={C.red}>destruindo</Mark> sua
        reputação?
      </Card>
    </Pop>
    <Pop from={8.2} to={12.6} style={CHEST}>
      <Card bg={C.navy} color={C.white} size={64}>
        Você <Mark color={C.red}>NÃO</Mark> é obrigado a aceitar isso
      </Card>
    </Pop>
    <Pop from={13.2} to={16.4} style={CHEST}>
      <Card size={62}>
        Reclame Aqui = <Mark color={C.blue}>empresa privada</Mark>
      </Card>
    </Pop>
    <Pop from={16.4} to={20.2} style={CHEST}>
      <Card size={58}>
        Que <Mark color={C.red}>lucra</Mark> com a exposição do seu negócio
      </Card>
    </Pop>
    <Pop from={20.7} to={26.0} style={CHEST}>
      <Card bg={C.navy} color={C.white} size={56}>
        Especialistas em
        <br />
        <Mark color={C.green}>Direito do Consumidor</Mark>
      </Card>
    </Pop>
    <div
      style={{
        position: "absolute",
        left: 80,
        top: 1000,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {[
        [26.5, "Processo judicial seguro"],
        [30.5, "Definitivo"],
        [33.0, "Dentro da lei"],
      ].map(([from, label], i) =>
        frame < s(36.3) ? (
          <Check key={label} from={from as number} label={label as string} i={i} />
        ) : null,
      )}
    </div>
    <Pop from={36.8} to={40.3} style={CHEST}>
      <Card size={64}>
        Retome o <Mark color={C.green}>controle</Mark> da sua marca
      </Card>
    </Pop>
    <Cta />
  </>
  );
};

const sfx = (f: string) => staticFile(`esclarece/${f}`);

const Soundtrack: React.FC = () => (
  <>
    <Audio src={sfx("musica.wav")} volume={0.1} />
    {[0.15, ...CUTS, 16.4].map((t) => (
      <Sequence key={t} from={Math.max(0, s(t) - 4)}>
        <Audio src={sfx("whoosh.wav")} volume={0.25} />
      </Sequence>
    ))}
    {[26.5, 30.5, 33.0].map((t) => (
      <Sequence key={`p${t}`} from={s(t)}>
        <Audio src={sfx("pop.wav")} volume={0.35} />
      </Sequence>
    ))}
    <Sequence from={s(40.6)}>
      <Audio src={sfx("bip.wav")} volume={0.4} />
    </Sequence>
  </>
);

export const EsclareceAd: React.FC = () => {
  const zoom = useZoom();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "12% 4%" }}>
        <OffthreadVideo src={staticFile("esclarece/original.mp4")} />
      </AbsoluteFill>
      <Overlays />
      <Soundtrack />
    </AbsoluteFill>
  );
};
