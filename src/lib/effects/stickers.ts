// Adesivos 2D presos ao rosto. Cada adesivo se desenha numa caixa centrada na
// origem; a prévia posiciona a caixa pelos pontos do rosto (MediaPipe Face
// Landmarker) e a exportação desenha a mesma caixa num PNG transparente.

export interface Point {
  x: number;
  y: number;
}

export interface Anchor {
  landmark: number; // índice do ponto no Face Landmarker (malha de 478 pontos)
  largura: number; // largura do adesivo em fração da largura do rosto
  subir: number; // deslocamento para cima em fração da altura do rosto
}

export interface Sticker {
  id: string;
  nome: string;
  proporcao: number; // altura / largura
  anchors: Anchor[];
  dica: string; // onde posicionar no Head Tracker do Effect House
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

// Pontos usados da malha do rosto.
export const LM = {
  testa: 10,
  queixo: 152,
  bordaEsq: 234,
  bordaDir: 454,
  olhoEsq: 33,
  olhoDir: 263,
  entreOlhos: 168,
  nariz: 1,
  bochechaEsq: 50,
  bochechaDir: 280,
  temporaEsq: 54,
  temporaDir: 284,
} as const;

function heart(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.35);
  ctx.bezierCurveTo(cx - s * 0.55, cy - s * 0.05, cx - s * 0.35, cy - s * 0.5, cx, cy - s * 0.2);
  ctx.bezierCurveTo(cx + s * 0.35, cy - s * 0.5, cx + s * 0.55, cy - s * 0.05, cx, cy + s * 0.35);
  ctx.closePath();
}

function sparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const k = r * 0.18;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx + k, cy - k, cx + r, cy);
  ctx.quadraticCurveTo(cx + k, cy + k, cx, cy + r);
  ctx.quadraticCurveTo(cx - k, cy + k, cx - r, cy);
  ctx.quadraticCurveTo(cx - k, cy - k, cx, cy - r);
  ctx.closePath();
}

export const STICKERS: Sticker[] = [
  {
    id: "blush",
    nome: "Blush",
    proporcao: 0.6,
    anchors: [
      { landmark: LM.bochechaEsq, largura: 0.3, subir: 0 },
      { landmark: LM.bochechaDir, largura: 0.3, subir: 0 },
    ],
    dica: "Duas cópias, uma em cada bochecha, logo abaixo dos olhos.",
    draw(ctx, w, h) {
      ctx.save();
      ctx.scale(1, h / w);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2);
      g.addColorStop(0, "rgba(255, 105, 150, 0.55)");
      g.addColorStop(0.6, "rgba(255, 120, 160, 0.25)");
      g.addColorStop(1, "rgba(255, 140, 170, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(-w / 2, -w / 2, w, w);
      ctx.restore();
    },
  },
  {
    id: "oculos-coracao",
    nome: "Óculos de coração",
    proporcao: 0.45,
    anchors: [{ landmark: LM.entreOlhos, largura: 1.0, subir: 0 }],
    dica: "Centralizado entre os olhos, na altura das pupilas.",
    draw(ctx, w, h) {
      const s = w * 0.44;
      for (const cx of [-w * 0.25, w * 0.25]) {
        heart(ctx, cx, h * 0.08, s);
        ctx.fillStyle = "#ff2d7a";
        ctx.fill();
        heart(ctx, cx, h * 0.06, s * 0.74);
        ctx.fillStyle = "rgba(255, 190, 215, 0.6)";
        ctx.fill();
      }
      ctx.strokeStyle = "#ff2d7a";
      ctx.lineWidth = h * 0.08;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-w * 0.07, -h * 0.12);
      ctx.quadraticCurveTo(0, -h * 0.2, w * 0.07, -h * 0.12);
      ctx.stroke();
    },
  },
  {
    id: "coroa",
    nome: "Coroa",
    proporcao: 0.55,
    anchors: [{ landmark: LM.testa, largura: 0.7, subir: 0.3 }],
    dica: "Acima da testa, apoiada no topo da cabeça.",
    draw(ctx, w, h) {
      const p = (x: number, y: number): [number, number] => [x * w, y * h];
      const pts = [p(-0.44, 0.46), p(-0.44, -0.2), p(-0.22, 0.08), p(0, -0.36), p(0.22, 0.08), p(0.44, -0.2), p(0.44, 0.46)];
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      g.addColorStop(0, "#fff1a8");
      g.addColorStop(0.5, "#f5c542");
      g.addColorStop(1, "#c8901a");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = w * 0.02;
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#a8740f";
      ctx.stroke();
      const gems: [number, number, string][] = [
        [-0.44, -0.2, "#ff4f9a"],
        [0, -0.36, "#4fd1ff"],
        [0.44, -0.2, "#ff4f9a"],
        [-0.23, 0.3, "#7c5cff"],
        [0, 0.3, "#ff4f9a"],
        [0.23, 0.3, "#7c5cff"],
      ];
      for (const [x, y, c] of gems) {
        ctx.beginPath();
        ctx.arc(x * w, y * h, w * 0.04, 0, Math.PI * 2);
        ctx.fillStyle = c;
        ctx.fill();
        ctx.lineWidth = w * 0.01;
        ctx.strokeStyle = "#fff";
        ctx.stroke();
      }
    },
  },
  {
    id: "brilhos",
    nome: "Brilhos",
    proporcao: 1,
    anchors: [
      { landmark: LM.temporaEsq, largura: 0.38, subir: 0.12 },
      { landmark: LM.temporaDir, largura: 0.38, subir: 0.12 },
    ],
    dica: "Duas cópias, nas laterais da testa, um pouco acima das sobrancelhas.",
    draw(ctx, w) {
      const stars: [number, number, number][] = [
        [0, 0, 0.32],
        [-0.3, -0.26, 0.15],
        [0.3, 0.22, 0.13],
        [0.28, -0.3, 0.1],
        [-0.26, 0.3, 0.09],
      ];
      ctx.save();
      ctx.shadowColor = "rgba(255, 230, 150, 0.9)";
      ctx.shadowBlur = w * 0.06;
      for (const [x, y, r] of stars) {
        sparkle(ctx, x * w, y * w, r * w * 0.5);
        ctx.fillStyle = "#fffbe6";
        ctx.fill();
      }
      ctx.restore();
    },
  },
];

export const ANCHOR_OPTIONS: { id: string; nome: string; anchor: Omit<Anchor, "largura"> }[] = [
  { id: "topo", nome: "Topo da cabeça", anchor: { landmark: LM.testa, subir: 0.3 } },
  { id: "testa", nome: "Testa", anchor: { landmark: LM.testa, subir: -0.08 } },
  { id: "olhos", nome: "Olhos", anchor: { landmark: LM.entreOlhos, subir: 0 } },
  { id: "nariz", nome: "Nariz", anchor: { landmark: LM.nariz, subir: 0 } },
  { id: "queixo", nome: "Abaixo do queixo", anchor: { landmark: LM.queixo, subir: -0.15 } },
];

/** Adesivo feito a partir de uma imagem enviada (ex.: logo da clínica). */
export function imageSticker(img: HTMLImageElement, anchorId: string, largura: number): Sticker {
  const opt = ANCHOR_OPTIONS.find((o) => o.id === anchorId) ?? ANCHOR_OPTIONS[0];
  return {
    id: "meu-adesivo",
    nome: "Meu adesivo",
    proporcao: img.naturalHeight / img.naturalWidth,
    anchors: [{ ...opt.anchor, largura }],
    dica: `Posicione em: ${opt.nome.toLowerCase()}.`,
    draw(ctx, w, h) {
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
    },
  };
}

export interface FaceFrame {
  point: (i: number) => Point;
  largura: number;
  altura: number;
  angulo: number;
}

/** Converte os pontos normalizados do MediaPipe para pixels do canvas. */
export function faceFrame(landmarks: Point[], width: number, height: number): FaceFrame {
  const point = (i: number) => ({ x: landmarks[i].x * width, y: landmarks[i].y * height });
  const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
  const e = point(LM.olhoEsq);
  const d = point(LM.olhoDir);
  return {
    point,
    largura: dist(point(LM.bordaEsq), point(LM.bordaDir)),
    altura: dist(point(LM.testa), point(LM.queixo)),
    angulo: Math.atan2(d.y - e.y, d.x - e.x),
  };
}

export function drawStickerOnFace(ctx: CanvasRenderingContext2D, sticker: Sticker, face: FaceFrame) {
  const up = { x: Math.sin(face.angulo), y: -Math.cos(face.angulo) };
  for (const a of sticker.anchors) {
    const p = face.point(a.landmark);
    const w = a.largura * face.largura;
    ctx.save();
    ctx.translate(p.x + up.x * a.subir * face.altura, p.y + up.y * a.subir * face.altura);
    ctx.rotate(face.angulo);
    sticker.draw(ctx, w, w * sticker.proporcao);
    ctx.restore();
  }
}

/** PNG transparente do adesivo, para importar como textura no Effect House. */
export function renderSticker(sticker: Sticker, largura = 1024): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = Math.round(largura * sticker.proporcao);
  const ctx = canvas.getContext("2d")!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  sticker.draw(ctx, canvas.width, canvas.height);
  return canvas;
}
