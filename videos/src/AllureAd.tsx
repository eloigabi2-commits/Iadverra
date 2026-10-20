import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/fonts";

// Identidade visual do site allureclinicbr.com
const C = {
  ink: "#21150f",
  muted: "#6d594a",
  paper: "#fffdfb",
  cream: "#f7eee4",
  creamDeep: "#ead7c0",
  gold: "#a77a36",
  goldLight: "#d6b883",
  dark: "#1d1510",
  wa: "#25d366",
};
const SERIF = "Cormorant Garamond";
const SANS = "Manrope";

const fonts = [
  [SERIF, "cormorant-garamond-latin-500-normal.woff2", "500", "normal"],
  [SERIF, "cormorant-garamond-latin-600-normal.woff2", "600", "normal"],
  [SERIF, "cormorant-garamond-latin-500-italic.woff2", "500", "italic"],
  [SANS, "manrope-latin-400-normal.woff2", "400", "normal"],
  [SANS, "manrope-latin-600-normal.woff2", "600", "normal"],
  [SANS, "manrope-latin-800-normal.woff2", "800", "normal"],
] as const;
for (const [family, file, weight, style] of fonts) {
  loadFont({ family, url: staticFile(`fonts/${file}`), weight, style });
}

const FADE = 14;
// Cenas: [início, duração] em frames (30 fps)
const S1 = [0, 110] as const;
const S2 = [S1[0] + S1[1] - FADE, 100] as const;
const S3 = [S2[0] + S2[1] - FADE, 135] as const;
const S4 = [S3[0] + S3[1] - FADE, 85] as const;
const S5 = [S4[0] + S4[1] - FADE, 110] as const;
export const AD_DURATION = S5[0] + S5[1];

const ease = Easing.bezier(0.22, 1, 0.36, 1);

// Entrada suave: sobe e aparece
const useReveal = (delay: number, distance = 40, length = 22) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame - delay, [0, length], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  return { opacity: t, transform: `translateY(${(1 - t) * distance}px)` };
};

const Reveal: React.FC<{
  delay: number;
  distance?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ delay, distance, style, children }) => {
  const r = useReveal(delay, distance);
  return <div style={{ ...style, ...r }}>{children}</div>;
};

// Cena com fade de entrada. A cena seguinte aparece por cima da anterior,
// que continua opaca, então a transição não escurece.
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

const SceneFade: React.FC<{
  first?: boolean;
  children: React.ReactNode;
}> = ({ first, children }) => {
  const frame = useCurrentFrame();
  // A primeira cena começa visível para a miniatura não ficar preta
  const opacity = first
    ? 1
    : interpolate(frame, [0, FADE], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

const Eyebrow: React.FC<{ color?: string; children: React.ReactNode }> = ({
  color = C.gold,
  children,
}) => (
  <div
    style={{
      fontFamily: SANS,
      fontWeight: 800,
      fontSize: 30,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color,
    }}
  >
    {children}
  </div>
);

const GoldRule: React.FC<{ delay: number; width?: number }> = ({
  delay,
  width = 160,
}) => {
  const frame = useCurrentFrame();
  const w = interpolate(frame - delay, [0, 26], [0, width], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  return <div style={{ width: w, height: 3, background: C.gold }} />;
};

// 1. Gancho: foto da Dra. Jéssica
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, S1[1]], [1.14, 1.04], {
    easing: Easing.out(Easing.quad),
  });
  const words = ["Seu", "rosto", "mudou", "com", "o", "tempo."];
  return (
    <AbsoluteFill style={{ background: C.dark }}>
      <Img
        src={staticFile("hero-dra.jpg")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "50% 30%",
          transform: `scale(${scale})`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(29,21,16,0) 38%, rgba(29,21,16,.72) 64%, rgba(29,21,16,.94) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          padding: "0 90px 430px",
          gap: 34,
        }}
      >
        <Reveal delay={8} distance={20}>
          <Eyebrow color={C.goldLight}>Full Face · Moema</Eyebrow>
        </Reveal>
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 500,
            fontSize: 136,
            lineHeight: 0.98,
            letterSpacing: "-0.02em",
            color: C.paper,
            display: "flex",
            flexWrap: "wrap",
            columnGap: 30,
          }}
        >
          {words.map((w, i) => (
            <Reveal key={w} delay={16 + i * 5} distance={50}>
              {w}
            </Reveal>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 2. Promessa da marca
const BrandPromise: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 40%, ${C.paper} 0%, ${C.cream} 70%)`,
        justifyContent: "center",
        padding: "0 100px",
        gap: 50,
      }}
    >
      <GoldRule delay={6} />
      <Reveal
        delay={10}
        style={{
          fontFamily: SERIF,
          fontWeight: 500,
          fontSize: 112,
          lineHeight: 1.02,
          letterSpacing: "-0.02em",
          color: C.ink,
        }}
      >
        Você não precisa mudar quem você é
      </Reveal>
      <Reveal
        delay={26}
        style={{
          fontFamily: SERIF,
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: 112,
          lineHeight: 1.02,
          color: C.gold,
        }}
      >
        para rejuvenescê-lo.
      </Reveal>
      <Reveal
        delay={42}
        style={{
          fontFamily: SANS,
          fontSize: 38,
          lineHeight: 1.5,
          color: C.muted,
          maxWidth: 820,
        }}
      >
        Contorno, leveza e aparência descansada, preservando suas
        características naturais.
      </Reveal>
    </AbsoluteFill>
  );
};

// 3. Método Allure
const Method: React.FC = () => {
  const steps = [
    ["01", "Entender", "Queixa, histórico, objetivos e receios."],
    ["02", "Priorizar", "O que realmente merece atenção agora."],
    ["03", "Planejar", "Possibilidades, etapas e acompanhamento."],
  ];
  return (
    <AbsoluteFill
      style={{
        background: C.dark,
        justifyContent: "center",
        padding: "0 90px",
      }}
    >
      <Reveal delay={4} distance={20}>
        <Eyebrow color={C.goldLight}>Método Allure</Eyebrow>
      </Reveal>
      <Reveal
        delay={10}
        style={{
          fontFamily: SERIF,
          fontWeight: 500,
          fontSize: 100,
          lineHeight: 1.02,
          letterSpacing: "-0.02em",
          color: C.paper,
          marginTop: 30,
          marginBottom: 80,
        }}
      >
        Procedimento avulso <span style={{ fontStyle: "italic", color: C.goldLight }}>não é plano.</span>
      </Reveal>
      {steps.map(([n, title, desc], i) => (
        <Reveal
          key={n}
          delay={34 + i * 16}
          distance={30}
          style={{
            display: "flex",
            gap: 40,
            alignItems: "baseline",
            padding: "38px 0",
            borderTop: "1px solid rgba(255,255,255,.16)",
          }}
        >
          <div
            style={{
              fontFamily: SERIF,
              fontWeight: 600,
              fontSize: 64,
              color: C.gold,
              width: 90,
            }}
          >
            {n}
          </div>
          <div>
            <div
              style={{
                fontFamily: SERIF,
                fontWeight: 500,
                fontSize: 72,
                color: C.paper,
                lineHeight: 1.05,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontFamily: SANS,
                fontSize: 34,
                color: "rgba(255,255,255,.66)",
                marginTop: 10,
              }}
            >
              {desc}
            </div>
          </div>
        </Reveal>
      ))}
    </AbsoluteFill>
  );
};

// 4. A clínica
const PhotoCard: React.FC<{
  src: string;
  delay: number;
  rotate: number;
  style: React.CSSProperties;
}> = ({ src, delay, rotate, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const zoom = interpolate(frame, [0, S4[1]], [1, 1.08]);
  return (
    <div
      style={{
        position: "absolute",
        width: 900,
        height: 506,
        borderRadius: 28,
        overflow: "hidden",
        boxShadow: "0 40px 90px rgba(54,37,25,.28)",
        border: `6px solid ${C.paper}`,
        opacity: s,
        transform: `translateY(${(1 - s) * 80}px) rotate(${rotate}deg)`,
        ...style,
      }}
    >
      <Img
        src={staticFile(src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${zoom})`,
        }}
      />
    </div>
  );
};

const Clinic: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.cream }}>
      <AbsoluteFill style={{ padding: "330px 90px 0", gap: 24 }}>
        <Reveal delay={2} distance={20}>
          <Eyebrow>Allure Clinic Concept</Eyebrow>
        </Reveal>
        <Reveal
          delay={6}
          style={{
            fontFamily: SERIF,
            fontWeight: 500,
            fontSize: 96,
            lineHeight: 1,
            color: C.ink,
            letterSpacing: "-0.02em",
          }}
        >
          Privacidade e atendimento próximo.
        </Reveal>
      </AbsoluteFill>
      <PhotoCard
        src="clinica-sala.png"
        delay={8}
        rotate={-2.5}
        style={{ left: 60, top: 720 }}
      />
      <PhotoCard
        src="clinica-espera.png"
        delay={22}
        rotate={2}
        style={{ left: 120, top: 1110 }}
      />
    </AbsoluteFill>
  );
};

// 5. Chamada para ação
const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame: frame - 2, fps, config: { damping: 200 } });
  const btn = spring({ frame: frame - 34, fps, config: { damping: 14 } });
  const pulse = 1 + 0.025 * Math.sin(Math.max(0, frame - 55) / 6);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 35%, ${C.paper} 0%, ${C.cream} 80%)`,
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0 90px",
      }}
    >
      <Img
        src={staticFile("logo.png")}
        style={{
          width: 620,
          opacity: logo,
          transform: `scale(${0.9 + 0.1 * logo})`,
        }}
      />
      <Reveal
        delay={14}
        style={{
          fontFamily: SERIF,
          fontWeight: 500,
          fontSize: 92,
          lineHeight: 1.02,
          color: C.ink,
          marginTop: 70,
          letterSpacing: "-0.02em",
        }}
      >
        Agende sua avaliação com a{" "}
        <span style={{ fontStyle: "italic", color: C.gold }}>Dra. Jéssica</span>
      </Reveal>
      <div
        style={{
          marginTop: 70,
          display: "flex",
          alignItems: "center",
          gap: 22,
          background: C.wa,
          color: "#fff",
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 46,
          padding: "34px 64px",
          borderRadius: 999,
          boxShadow: "0 24px 60px rgba(37,211,102,.35)",
          opacity: btn,
          transform: `scale(${btn * pulse})`,
        }}
      >
        <WhatsAppIcon />
        (11) 91466-6057
      </div>
      <Reveal
        delay={48}
        distance={16}
        style={{
          marginTop: 56,
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: 30,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: C.muted,
        }}
      >
        Moema · São Paulo · Hora marcada
      </Reveal>
    </AbsoluteFill>
  );
};

const WhatsAppIcon: React.FC = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="#fff">
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43 2.52 0 4.89.98 6.67 2.77a9.36 9.36 0 0 1 2.76 6.67c0 5.2-4.24 9.43-9.45 9.43m8.03-17.46A11.27 11.27 0 0 0 12.05.71C5.79.71.7 5.8.7 12.05c0 2 .52 3.95 1.52 5.67L.6 23.6l6.02-1.58a11.33 11.33 0 0 0 5.43 1.38h.01c6.25 0 11.34-5.09 11.34-11.34 0-3.03-1.18-5.88-3.32-8.02" />
  </svg>
);

export const AllureAd: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.dark }}>
      <Scene at={S1}>
        <Hook />
      </Scene>
      <Scene at={S2}>
        <BrandPromise />
      </Scene>
      <Scene at={S3}>
        <Method />
      </Scene>
      <Scene at={S4}>
        <Clinic />
      </Scene>
      <Scene at={S5}>
        <Cta />
      </Scene>
    </AbsoluteFill>
  );
};
