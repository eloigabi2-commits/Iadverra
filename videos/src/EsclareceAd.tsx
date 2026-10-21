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
// Palavras-chave surgem no instante em que são faladas (tempos do Whisper).
// O vídeo já traz logo (canto superior esquerdo) e legendas (y ≈ 1400–1560),
// então os textos ficam entre o rosto e as legendas.

const C = {
  white: "#ffffff",
  red: "#ef233c",
  yellow: "#ffd60a",
  green: "#2ecc71",
  blue: "#2f80ff",
  gold: "#f5b700",
  wa: "#25d366",
  ink: "#0b1020",
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

// Ênfases: zoom rápido que volta devagar
const PUNCHES = [1.8, 6.02, 10.76, 14.12, 17.48, 22.94, 28.5, 33.84, 35.42, 37.22];
const SHAKE = 6.02;
const FLASHES = [6.02, 10.76];
const CTA_AT = 40.62;

const useCamera = () => {
  const frame = useCurrentFrame();
  let zoom = interpolate(frame, [0, f(8)], [1, 1.05], clamp);
  for (const p of PUNCHES) {
    const d = frame - f(p);
    if (d >= 0 && d < 30) {
      zoom +=
        d < 4
          ? interpolate(d, [0, 4], [0, 0.09])
          : interpolate(d, [4, 30], [0.09, 0], { easing: ease });
    }
  }
  const sd = frame - f(SHAKE);
  const shake = sd >= 0 && sd < 14 ? (1 - sd / 14) * 14 : 0;
  return { zoom, x: shake * Math.sin(sd * 2.3), y: shake * Math.cos(sd * 3.1) };
};

const BIG: React.CSSProperties = {
  fontFamily: SANS,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "-0.03em",
  lineHeight: 1,
  color: C.white,
  WebkitTextStroke: "14px rgba(0,0,0,.85)",
  paintOrder: "stroke fill",
  textShadow: "0 10px 30px rgba(0,0,0,.55)",
  textAlign: "center",
};
const FLAT: React.CSSProperties = { WebkitTextStroke: "0px", textShadow: "none" };

// Palavra que entra com mola no instante da fala
const Word: React.FC<{
  at: number;
  size?: number;
  color?: string;
  pill?: string;
  tilt?: number;
  children: React.ReactNode;
}> = ({ at, size = 96, color = C.white, pill, tilt = 0, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = spring({ frame: frame - f(at), fps, config: { damping: 11, stiffness: 180 } });
  if (frame < f(at)) return null;
  const text = (
    <div style={{ ...BIG, fontSize: size, color, ...(pill ? FLAT : {}) }}>{children}</div>
  );
  return (
    <div
      style={{
        transform: `scale(${0.4 + 0.6 * k}) rotate(${tilt}deg)`,
        opacity: Math.min(1, k * 2),
        marginTop: 10,
      }}
    >
      {pill ? (
        <div
          style={{
            background: pill,
            padding: "14px 30px 18px",
            borderRadius: 20,
            boxShadow: "0 16px 40px rgba(0,0,0,.45)",
          }}
        >
          {text}
        </div>
      ) : (
        text
      )}
    </div>
  );
};

// Grupo de palavras visível num intervalo, com saída rápida
const Beat: React.FC<{ from: number; to: number; top?: number; children: React.ReactNode }> = ({
  from,
  to,
  top = 1000,
  children,
}) => {
  const frame = useCurrentFrame();
  if (frame < f(from) || frame >= f(to)) return null;
  const out = interpolate(frame, [f(to) - 5, f(to)], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 40,
        right: 40,
        top,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: out,
        transform: `scale(${0.9 + 0.1 * out})`,
      }}
    >
      {children}
    </div>
  );
};

const Icon: React.FC<{ d: string; size?: number }> = ({ d, size = 72 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const I = {
  alert: "M12 3l10 18H2zM12 10v5M12 18.2v.1",
  x: "M6 6l12 12M18 6L6 18",
  coin: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM14.8 9.2c-.5-.9-1.6-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2s1.2 1.6 2.8 2 2.8.9 2.8 2.1-1.2 2-2.8 2c-1.3 0-2.4-.6-2.9-1.5M12 6.3v1.5M12 16.2v1.5",
  shield: "M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6zM8.5 12l2.5 2.5 4.8-5",
  gavel: "M14 3l7 7M12.5 4.5l7 7M9 8l7 7M11 6l5 5-3 3-5-5zM3 21l7.5-7.5",
  check: "M5 12.5l4.5 4.5L19 7.5",
  up: "M3 17l6-6 4 4 8-8M15 7h6v6",
};

// Ícone circular que gira ao entrar
const Badge: React.FC<{ at: number; bg: string; icon: string }> = ({ at, bg, icon }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = spring({ frame: frame - f(at), fps, config: { damping: 9, stiffness: 160 } });
  if (frame < f(at)) return null;
  return (
    <div
      style={{
        width: 130,
        height: 130,
        borderRadius: "50%",
        background: bg,
        border: "6px solid #fff",
        boxShadow: "0 16px 40px rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
        transform: `scale(${k}) rotate(${(1 - k) * -90}deg)`,
      }}
    >
      <Icon d={icon} />
    </div>
  );
};

// Selo que cai com impacto
const Stamp: React.FC<{ at: number; color: string; icon: string; children: React.ReactNode }> = ({
  at,
  color,
  icon,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = spring({ frame: frame - f(at), fps, config: { damping: 13, stiffness: 220 } });
  if (frame < f(at)) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        background: C.white,
        borderRadius: 26,
        padding: "22px 38px",
        border: `8px solid ${color}`,
        boxShadow: "0 20px 50px rgba(0,0,0,.5)",
        transform: `scale(${2.2 - 1.2 * k}) rotate(${-4 * k}deg)`,
        opacity: Math.min(1, k * 3),
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon d={icon} size={60} />
      </div>
      <div style={{ ...BIG, ...FLAT, fontSize: 70, color: C.ink }}>{children}</div>
    </div>
  );
};

// Borda vermelha que pisca nos momentos de alerta
const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  const a = Math.max(...FLASHES.map((t) => interpolate(frame - f(t), [0, 3, 18], [0, 0.55, 0], clamp)));
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 45%, rgba(239,35,60,0) 35%, rgba(239,35,60,${a}) 100%)`,
      }}
    />
  );
};

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        height: 10,
        width: `${(frame / ESCLARECE_DURATION) * 100}%`,
        background: `linear-gradient(90deg, ${C.blue}, ${C.green})`,
        boxShadow: "0 0 12px rgba(47,128,255,.8)",
      }}
    />
  );
};

const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < f(CTA_AT)) return null;
  const d = frame - f(CTA_AT);
  const dim = interpolate(d, [0, 12], [0, 0.5], clamp);
  const btn = spring({ frame: d, fps, config: { damping: 10, stiffness: 150 } });
  const brand = spring({ frame: frame - f(44.68), fps, config: { damping: 14 } });
  const tap = (d % 36) / 36;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `rgba(5,8,18,${dim})` }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 820,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ ...BIG, fontSize: 64, opacity: btn, marginBottom: 34 }}>
          Fale com um especialista
        </div>
        <div style={{ position: "relative", transform: `scale(${btn * (1 + 0.04 * Math.sin(d / 5))})` }}>
          {/* ondas de clique */}
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
              ...BIG,
              ...FLAT,
              fontSize: 82,
              background: C.wa,
              padding: "34px 70px 40px",
              borderRadius: 999,
              boxShadow: "0 24px 60px rgba(37,211,102,.5)",
            }}
          >
            Saiba mais
          </div>
          {/* mão tocando o botão */}
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
        <div
          style={{
            ...BIG,
            fontSize: 54,
            color: C.yellow,
            marginTop: 120,
            opacity: brand,
            transform: `translateY(${(1 - brand) * 30}px)`,
          }}
        >
          Volte ao jogo
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Overlays: React.FC = () => (
  <>
    <Beat from={0} to={4.6}>
      <Word at={-1}>Você trabalha</Word>
      <Word at={1.8} pill={C.yellow} color={C.ink} tilt={-3} size={110}>
        duro
      </Word>
    </Beat>
    <Beat from={5.1} to={7.9}>
      <Badge at={5.1} bg={C.red} icon={I.alert} />
      <Word at={5.14}>Reclame Aqui</Word>
      <Word at={6.02} pill={C.red} tilt={-3} size={104}>
        destruindo
      </Word>
      <Word at={6.88} size={72}>
        sua reputação
      </Word>
    </Beat>
    <Beat from={10.76} to={12.9}>
      <Badge at={10.76} bg={C.red} icon={I.x} />
      <Word at={10.76} size={110} color={C.red}>
        Não
      </Word>
      <Word at={11.16} size={88}>
        é obrigado
      </Word>
    </Beat>
    <Beat from={13.1} to={15.6}>
      <Word at={13.16} size={80}>
        Reclame Aqui
      </Word>
      <Word at={14.12} pill={C.blue} tilt={2} size={92}>
        empresa privada
      </Word>
    </Beat>
    <Beat from={17.4} to={20.3}>
      <Badge at={17.4} bg={C.gold} icon={I.coin} />
      <Word at={17.48} pill={C.gold} color={C.ink} tilt={-2} size={110}>
        lucra
      </Word>
      <Word at={18.32} size={72}>
        com a sua exposição
      </Word>
    </Beat>
    <Beat from={21.6} to={24.2}>
      <Badge at={21.6} bg={C.blue} icon={I.shield} />
      <Word at={21.62} size={84}>
        Sabe como
      </Word>
      <Word at={22.94} pill={C.green} tilt={-2} size={96}>
        reverter
      </Word>
    </Beat>
    <Beat from={24.6} to={27.4}>
      <Word at={24.68} size={84}>
        Especialistas
      </Word>
      <Word at={25.76} size={64} color={C.green}>
        Direito do Consumidor
      </Word>
    </Beat>
    <Beat from={28.4} to={33.7}>
      <Stamp at={28.5} color={C.blue} icon={I.gavel}>
        Processo judicial
      </Stamp>
    </Beat>
    <Beat from={33.8} to={35.35}>
      <Stamp at={33.84} color={C.green} icon={I.check}>
        Definitivo
      </Stamp>
    </Beat>
    <Beat from={35.4} to={36.6}>
      <Stamp at={35.42} color={C.green} icon={I.shield}>
        Dentro da lei
      </Stamp>
    </Beat>
    <Beat from={36.66} to={40.5} top={930}>
      <Badge at={38.6} bg={C.green} icon={I.up} />
      <Word at={36.66} size={80}>
        Retome o
      </Word>
      <Word at={37.22} pill={C.green} tilt={-2} size={100}>
        controle
      </Word>
      <Word at={38.64} size={72}>
        e volte a crescer
      </Word>
    </Beat>
    <Cta />
  </>
);

const sfx = (name: string) => staticFile(`esclarece/${name}`);

// Efeitos nas entradas das palavras-chave
const WHOOSH = [5.1, 10.76, 13.1, 17.4, 21.6, 24.6, 36.66, CTA_AT];
const POPS = [1.8, 6.02, 14.12, 17.48, 22.94, 28.5, 33.84, 35.42, 37.22];

const Soundtrack: React.FC = () => (
  <>
    <Audio src={sfx("musica.wav")} volume={0.12} />
    {WHOOSH.map((t) => (
      <Sequence key={`w${t}`} from={Math.max(0, f(t) - 5)}>
        <Audio src={sfx("whoosh.wav")} volume={0.3} />
      </Sequence>
    ))}
    {POPS.map((t) => (
      <Sequence key={`p${t}`} from={f(t)}>
        <Audio src={sfx("pop.wav")} volume={0.45} />
      </Sequence>
    ))}
    <Sequence from={f(CTA_AT)}>
      <Audio src={sfx("bip.wav")} volume={0.45} />
    </Sequence>
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
          filter: "contrast(1.08) saturate(1.12)",
        }}
      >
        <OffthreadVideo src={staticFile("esclarece/original.mp4")} />
      </AbsoluteFill>
      <Flash />
      <Overlays />
      <ProgressBar />
      <Soundtrack />
    </AbsoluteFill>
  );
};
