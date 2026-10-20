import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/fonts";

const C = {
  bg: "#0a0c11",
  panel: "#141821",
  line: "rgba(255,255,255,.12)",
  text: "#f4f6fb",
  muted: "rgba(244,246,251,.62)",
  accent: "#3d8bff",
  accentSoft: "#9cc3ff",
  star: "#fbbc04",
  ok: "#22c55e",
  wa: "#25d366",
};
const SANS = "Manrope";

for (const w of ["400", "600", "800"] as const) {
  loadFont({
    family: SANS,
    url: staticFile(`fonts/manrope-latin-${w}-normal.woff2`),
    weight: w,
  });
}

const FADE = 12;
// durações ajustadas ao tempo de cada fala da narração
const S1 = [0, 137] as const;
const S2 = [S1[0] + S1[1] - FADE, 154] as const;
const S3 = [S2[0] + S2[1] - FADE, 151] as const;
const S4 = [S3[0] + S3[1] - FADE, 144] as const;
const S5 = [S4[0] + S4[1] - FADE, 130] as const;
const VOICE_DELAY = 6;
export const NFC_DURATION = S5[0] + S5[1];

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const Reveal: React.FC<{
  delay: number;
  distance?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ delay, distance = 40, style, children }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame - delay, [0, 20], [0, 1], { ...clamp, easing: ease });
  return (
    <div
      style={{
        ...style,
        opacity: t,
        transform: `translateY(${(1 - t) * distance}px)`,
      }}
    >
      {children}
    </div>
  );
};

// A cena seguinte aparece por cima da anterior, que continua opaca
const Scene: React.FC<{
  at: readonly [number, number];
  children: React.ReactNode;
}> = ({ at, children }) => {
  const [from, duration] = at;
  return (
    <Sequence from={from} durationInFrames={duration}>
      <SceneFade first={from === 0}>{children}</SceneFade>
    </Sequence>
  );
};

const SceneFade: React.FC<{ first?: boolean; children: React.ReactNode }> = ({
  first,
  children,
}) => {
  const frame = useCurrentFrame();
  const opacity = first ? 1 : interpolate(frame, [0, FADE], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ opacity, background: C.bg }}>{children}</AbsoluteFill>
  );
};

const Glow: React.FC<{ x: string; y: string; size: number; color?: string }> = ({
  x,
  y,
  size,
  color = "rgba(61,139,255,.28)",
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: size,
      height: size,
      marginLeft: -size / 2,
      marginTop: -size / 2,
      borderRadius: "50%",
      background: `radial-gradient(circle, ${color} 0%, rgba(0,0,0,0) 70%)`,
    }}
  />
);

const Headline: React.FC<{
  size?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ size = 104, style, children }) => (
  <div
    style={{
      fontFamily: SANS,
      fontWeight: 800,
      fontSize: size,
      lineHeight: 1.04,
      letterSpacing: "-0.035em",
      color: C.text,
      ...style,
    }}
  >
    {children}
  </div>
);

const Accent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: C.accent }}>{children}</span>
);

// Símbolo de pagamento por aproximação (ondas)
const ContactlessIcon: React.FC<{ size: number; color?: string }> = ({
  size,
  color = "#fff",
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {[
      "M6.5 9a4.5 4.5 0 0 1 0 6",
      "M10 6.5a8.5 8.5 0 0 1 0 11",
      "M13.5 4a12.5 12.5 0 0 1 0 16",
      "M17 1.8a16 16 0 0 1 0 20.4",
    ].map((d) => (
      <path key={d} d={d} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    ))}
  </svg>
);

const Star: React.FC<{ size: number; fill: string }> = ({ size, fill }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      d="M12 2.5l2.94 6.1 6.56.86-4.8 4.6 1.2 6.54L12 17.4l-5.9 3.2 1.2-6.54-4.8-4.6 6.56-.86z"
      fill={fill}
    />
  </svg>
);

// A placa NFC
const Plate: React.FC<{ width: number; pulse?: number }> = ({
  width,
  pulse = 0,
}) => {
  const k = width / 560;
  return (
    <div
      style={{
        position: "relative",
        width,
        height: width * 1.18,
        borderRadius: 44 * k,
        background:
          "linear-gradient(145deg, #2a2f3b 0%, #11141b 45%, #07080c 100%)",
        border: "2px solid rgba(255,255,255,.14)",
        boxShadow:
          "0 50px 120px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.18)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 34 * k,
        overflow: "hidden",
      }}
    >
      {/* reflexo do acrílico */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(120deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,0) 38%)",
        }}
      />
      <div
        style={{
          width: 210 * k,
          height: 210 * k,
          borderRadius: "50%",
          background: `rgba(61,139,255,${0.16 + pulse * 0.3})`,
          border: `2px solid rgba(156,195,255,${0.35 + pulse * 0.5})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 ${80 * pulse}px rgba(61,139,255,.8)`,
        }}
      >
        <ContactlessIcon size={120 * k} />
      </div>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 54 * k,
          color: C.text,
          letterSpacing: "-0.02em",
          textAlign: "center",
          lineHeight: 1.1,
        }}
      >
        Avalie-nos
        <br />
        no Google
      </div>
      <div style={{ display: "flex", gap: 8 * k }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} size={46 * k} fill={C.star} />
        ))}
      </div>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: 24 * k,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: C.muted,
        }}
      >
        Aproxime seu celular
      </div>
    </div>
  );
};

// 1. Gancho: o problema
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const strike = interpolate(frame, [78, 92], [0, 1], { ...clamp, easing: ease });
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 90px" }}>
      <Glow x="80%" y="25%" size={900} />
      {/* já visível no primeiro quadro, que vira a miniatura */}
      <Reveal delay={-20} distance={30}>
        <Headline size={112}>Seu cliente amou o atendimento.</Headline>
      </Reveal>
      <Reveal delay={48} distance={30} style={{ marginTop: 60 }}>
        <Headline size={112} style={{ color: C.muted }}>
          Mas quantos deixam{" "}
          <span style={{ position: "relative", color: C.text }}>
            avaliação
            <span
              style={{
                position: "absolute",
                left: 0,
                bottom: 6,
                height: 12,
                width: `${strike * 100}%`,
                background: C.accent,
                borderRadius: 6,
              }}
            />
          </span>
          ?
        </Headline>
      </Reveal>
    </AbsoluteFill>
  );
};

// Tela do celular: bloqueada, depois página de avaliação
const PhoneScreen: React.FC<{ on: number; starsFrom: number }> = ({
  on,
  starsFrom,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#fff",
        opacity: on,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "100px 30px 0",
        fontFamily: SANS,
        color: "#1f2328",
      }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: 30,
          background: "linear-gradient(145deg, #3d8bff, #1b5fd1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: 800,
          fontSize: 54,
        }}
      >
        SE
      </div>
      <div style={{ fontWeight: 800, fontSize: 40, marginTop: 28 }}>
        Sua Empresa
      </div>
      <div style={{ fontSize: 26, color: "#5f6670", marginTop: 6 }}>
        Deixe sua avaliação
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 50 }}>
        {[0, 1, 2, 3, 4].map((i) => {
          const s = spring({
            frame: frame - starsFrom - i * 5,
            fps: 30,
            config: { damping: 10, stiffness: 160 },
          });
          return (
            <div key={i} style={{ position: "relative", width: 52, height: 52 }}>
              <div style={{ position: "absolute" }}>
                <Star size={52} fill="#dfe3e8" />
              </div>
              <div
                style={{
                  position: "absolute",
                  transform: `scale(${s})`,
                  opacity: Math.min(1, s * 2),
                }}
              >
                <Star size={52} fill={C.star} />
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 50,
          width: "100%",
          height: 150,
          borderRadius: 20,
          border: "2px solid #e3e6ea",
          padding: 22,
          fontSize: 26,
          color: "#3a4048",
          textAlign: "left",
          opacity: interpolate(frame, [starsFrom + 30, starsFrom + 40], [0, 1], clamp),
        }}
      >
        Atendimento impecável! Recomendo muito.
      </div>
      <div
        style={{
          marginTop: 30,
          width: "100%",
          padding: "24px 0",
          borderRadius: 999,
          background: C.accent,
          color: "#fff",
          fontWeight: 800,
          fontSize: 30,
          textAlign: "center",
          opacity: interpolate(frame, [starsFrom + 36, starsFrom + 46], [0, 1], clamp),
        }}
      >
        Publicar
      </div>
    </div>
  );
};

// 2. Demonstração: celular encosta na placa
const Demo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const TAP = 50;
  const enter = spring({ frame: frame - (TAP - 28), fps, config: { damping: 18, mass: 0.9 } });
  // depois da leitura o celular recua e a placa aparece inteira
  const back = spring({ frame: frame - TAP - 10, fps, config: { damping: 20 } });
  const phoneY = interpolate(enter, [0, 1], [1300, -200]) + back * 240;
  const tilt = interpolate(enter, [0, 1], [14, -6]);
  // leve vibração no momento da leitura
  const buzz =
    frame > TAP && frame < TAP + 10 ? Math.sin((frame - TAP) * 2.6) * 4 : 0;
  const pulse = interpolate(frame, [TAP - 4, TAP + 6, TAP + 40], [0, 1, 0.35], clamp);
  const screenOn = interpolate(frame, [TAP + 4, TAP + 12], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Glow x="50%" y="36%" size={1100} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 230 }}>
        <Reveal delay={2} distance={20}>
          <Headline size={84} style={{ textAlign: "center" }}>
            Aproximou. <Accent>Avaliou.</Accent>
          </Headline>
        </Reveal>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 320, top: 390 }}>
        <Plate width={440} pulse={pulse} />
      </div>
      {/* ondas de leitura NFC */}
      {[0, 1, 2].map((i) => {
        const t = interpolate(frame - TAP - i * 8, [0, 34], [0, 1], clamp);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 540,
              top: 570,
              width: 900,
              height: 900,
              marginLeft: -450,
              marginTop: -450,
              borderRadius: "50%",
              border: `4px solid ${C.accentSoft}`,
              transform: `scale(${0.15 + t})`,
              opacity: t > 0 && t < 1 ? 1 - t : 0,
            }}
          />
        );
      })}
      {/* celular */}
      <div
        style={{
          position: "absolute",
          left: 360,
          top: 900,
          width: 400,
          height: 820,
          borderRadius: 70,
          background: "#05060a",
          border: "3px solid #3a3f4b",
          padding: 16,
          boxShadow: "0 60px 140px rgba(0,0,0,.7)",
          transform: `translate(${buzz}px, ${phoneY}px) rotate(${tilt}deg)`,
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: 56,
            overflow: "hidden",
            background: "linear-gradient(160deg, #1b2233, #0b0e15)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 140,
              width: "100%",
              textAlign: "center",
              fontFamily: SANS,
              fontWeight: 600,
              fontSize: 110,
              color: "rgba(255,255,255,.9)",
              letterSpacing: "-0.03em",
            }}
          >
            9:41
          </div>
          <PhoneScreen on={screenOn} starsFrom={TAP + 14} />
          <div
            style={{
              position: "absolute",
              top: 18,
              left: "50%",
              width: 130,
              height: 36,
              marginLeft: -65,
              borderRadius: 20,
              background: "#05060a",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 3. Usos da placa
const USES: [string, React.ReactNode][] = [
  ["Avaliações no Google", <Star key="s" size={64} fill={C.star} />],
  [
    "Instagram",
    <svg key="i" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="1" fill="#fff" stroke="none" />
    </svg>,
  ],
  [
    "WhatsApp",
    <svg key="w" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={C.wa} strokeWidth="1.8" strokeLinejoin="round">
      <path d="M4 20l1.3-3.8A8 8 0 1 1 8 19z" />
    </svg>,
  ],
  [
    "Pix",
    <svg key="p" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#32bcad" strokeWidth="1.8">
      <rect x="6" y="6" width="12" height="12" rx="2.5" transform="rotate(45 12 12)" />
    </svg>,
  ],
  [
    "Wi-Fi sem senha",
    <svg key="f" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={C.accentSoft} strokeWidth="1.8" strokeLinecap="round">
      <path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0" />
      <circle cx="12" cy="19.2" r="1.1" fill={C.accentSoft} stroke="none" />
    </svg>,
  ],
  [
    "Cardápio digital",
    <svg key="c" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </svg>,
  ],
];

const Uses: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ padding: "250px 80px 0" }}>
      <Glow x="20%" y="70%" size={1000} />
      <Reveal delay={0} distance={20}>
        <Headline size={96}>
          Uma placa,
          <br />
          <Accent>vários usos.</Accent>
        </Headline>
      </Reveal>
      <div
        style={{
          marginTop: 70,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 28,
        }}
      >
        {USES.map(([label, icon], i) => {
          const s = spring({
            frame: frame - 20 - i * 12,
            fps,
            config: { damping: 15 },
          });
          return (
            <div
              key={label}
              style={{
                height: 250,
                borderRadius: 34,
                background: C.panel,
                border: `2px solid ${C.line}`,
                padding: "40px 36px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                opacity: Math.min(1, s * 1.5),
                transform: `scale(${0.85 + 0.15 * s}) translateY(${(1 - s) * 40}px)`,
              }}
            >
              {icon}
              <div
                style={{
                  fontFamily: SANS,
                  fontWeight: 800,
                  fontSize: 40,
                  lineHeight: 1.1,
                  color: C.text,
                  letterSpacing: "-0.02em",
                }}
              >
                {label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// 4. Vantagens
const Benefits: React.FC = () => {
  const items = [
    "Sem aplicativo",
    "Abre na hora, sem QR code",
    "Funciona em iPhone e Android",
    "Personalizada com a sua marca",
  ];
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 90px", gap: 44 }}>
      <Glow x="85%" y="30%" size={900} />
      {items.map((t, i) => (
        <Reveal
          key={t}
          delay={[6, 30, 54, 84][i]}
          distance={30}
          style={{ display: "flex", alignItems: "center", gap: 34 }}
        >
          <div
            style={{
              width: 86,
              height: 86,
              flexShrink: 0,
              borderRadius: "50%",
              background: "rgba(34,197,94,.16)",
              border: `2px solid ${C.ok}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={C.ok} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          <Headline size={62} style={{ letterSpacing: "-0.025em" }}>
            {t}
          </Headline>
        </Reveal>
      ))}
    </AbsoluteFill>
  );
};

// 5. Chamada para ação
const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const plate = spring({ frame: frame - 2, fps, config: { damping: 16 } });
  const btn = spring({ frame: frame - 30, fps, config: { damping: 13 } });
  const pulse = 0.5 + 0.5 * Math.sin(frame / 7);
  const bob = Math.sin(frame / 14) * 8;
  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}
    >
      <Glow x="50%" y="34%" size={1100} color="rgba(61,139,255,.35)" />
      <div
        style={{
          opacity: plate,
          transform: `translateY(${(1 - plate) * 60 + bob}px) scale(${0.85 + 0.15 * plate})`,
        }}
      >
        <Plate width={400} pulse={pulse * 0.6} />
      </div>
      <Reveal delay={14} distance={30} style={{ marginTop: 80, padding: "0 80px" }}>
        <Headline size={92}>
          Peça a sua <Accent>placa NFC</Accent>
        </Headline>
      </Reveal>
      <div
        style={{
          marginTop: 60,
          display: "flex",
          alignItems: "center",
          gap: 20,
          background: C.wa,
          color: "#fff",
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 46,
          padding: "32px 62px",
          borderRadius: 999,
          boxShadow: "0 24px 60px rgba(37,211,102,.35)",
          opacity: btn,
          transform: `scale(${btn * (1 + 0.025 * Math.sin(Math.max(0, frame - 50) / 6))})`,
        }}
      >
        Chame no WhatsApp
      </div>
    </AbsoluteFill>
  );
};

const sound = (f: string) => staticFile(`nfc-audio/${f}`);

// Narração (Kokoro, voz pf_dora), trilha e efeitos gerados localmente
const Soundtrack: React.FC = () => {
  const tap = S2[0] + 50;
  return (
    <>
      <Audio src={sound("musica.wav")} volume={0.22} />
      {[S1, S2, S3, S4, S5].map((sc, i) => (
        <Sequence key={i} from={sc[0] + VOICE_DELAY}>
          <Audio src={sound(`voz${i + 1}.wav`)} />
        </Sequence>
      ))}
      {[S2, S3, S4, S5].map((sc, i) => (
        <Sequence key={`w${i}`} from={sc[0] - 6}>
          <Audio src={sound("whoosh.wav")} volume={0.35} />
        </Sequence>
      ))}
      <Sequence from={tap}>
        <Audio src={sound("bip.wav")} volume={0.6} />
      </Sequence>
      {[0, 1, 2, 3, 4].map((i) => (
        <Sequence key={`p${i}`} from={tap + 14 + i * 5}>
          <Audio src={sound("pop.wav")} volume={0.35} />
        </Sequence>
      ))}
    </>
  );
};

export const NfcAd: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Scene at={S1}>
        <Hook />
      </Scene>
      <Scene at={S2}>
        <Demo />
      </Scene>
      <Scene at={S3}>
        <Uses />
      </Scene>
      <Scene at={S4}>
        <Benefits />
      </Scene>
      <Scene at={S5}>
        <Cta />
      </Scene>
      <Soundtrack />
    </AbsoluteFill>
  );
};
