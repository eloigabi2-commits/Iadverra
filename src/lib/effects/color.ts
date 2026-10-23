// Gradação de cor dos filtros. A mesma função alimenta a prévia ao vivo e as
// texturas LUT exportadas para o Effect House, então o que se vê na prévia é
// o que o filtro faz no TikTok.

export interface ColorParams {
  brilho: number; // -1..1
  contraste: number; // -1..1
  saturacao: number; // -1..1 (-1 = preto e branco)
  temperatura: number; // -1..1 (frio → quente)
  matiz: number; // -1..1 (verde → magenta)
  desbotado: number; // 0..1 (levanta os pretos)
}

export const NEUTRO: ColorParams = {
  brilho: 0,
  contraste: 0,
  saturacao: 0,
  temperatura: 0,
  matiz: 0,
  desbotado: 0,
};

export const PRESETS: { id: string; nome: string; params: ColorParams }[] = [
  { id: "natural", nome: "Natural", params: NEUTRO },
  {
    id: "glow",
    nome: "Glow",
    params: { brilho: 0.12, contraste: -0.1, saturacao: 0.1, temperatura: 0.35, matiz: 0.1, desbotado: 0.15 },
  },
  {
    id: "rose",
    nome: "Rosé",
    params: { brilho: 0.08, contraste: 0, saturacao: -0.05, temperatura: 0.15, matiz: 0.45, desbotado: 0.2 },
  },
  {
    id: "clean",
    nome: "Clínica Clean",
    params: { brilho: 0.15, contraste: 0.1, saturacao: -0.15, temperatura: -0.25, matiz: 0, desbotado: 0 },
  },
  {
    id: "vintage",
    nome: "Vintage",
    params: { brilho: 0, contraste: -0.2, saturacao: -0.35, temperatura: 0.45, matiz: -0.1, desbotado: 0.6 },
  },
  {
    id: "pb",
    nome: "P&B Dramático",
    params: { brilho: -0.05, contraste: 0.45, saturacao: -1, temperatura: 0, matiz: 0, desbotado: 0 },
  },
];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Aplica a gradação a uma cor em 0..1. */
export function grade(r: number, g: number, b: number, p: ColorParams): [number, number, number] {
  r += p.brilho * 0.25;
  g += p.brilho * 0.25;
  b += p.brilho * 0.25;

  const k = 1 + p.contraste;
  r = (r - 0.5) * k + 0.5;
  g = (g - 0.5) * k + 0.5;
  b = (b - 0.5) * k + 0.5;

  r += p.temperatura * 0.08;
  b -= p.temperatura * 0.08;
  g -= p.matiz * 0.06;
  r += p.matiz * 0.03;
  b += p.matiz * 0.03;

  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const s = 1 + p.saturacao;
  r = luma + (r - luma) * s;
  g = luma + (g - luma) * s;
  b = luma + (b - luma) * s;

  const f = p.desbotado * 0.18;
  r = f + clamp01(r) * (1 - f);
  g = f + clamp01(g) * (1 - f);
  b = f + clamp01(b) * (1 - f);

  return [r, g, b];
}

/**
 * Tabela 64×64×64 para aplicar o filtro em tempo real: índice
 * ((r >> 2) * 64 + (g >> 2)) * 64 + (b >> 2), três bytes por entrada.
 */
export function buildPreviewTable(p: ColorParams): Uint8Array {
  const table = new Uint8Array(64 * 64 * 64 * 3);
  let i = 0;
  for (let r = 0; r < 64; r++) {
    for (let g = 0; g < 64; g++) {
      for (let b = 0; b < 64; b++) {
        const [nr, ng, nb] = grade(r / 63, g / 63, b / 63, p);
        table[i++] = Math.round(nr * 255);
        table[i++] = Math.round(ng * 255);
        table[i++] = Math.round(nb * 255);
      }
    }
  }
  return table;
}

export function applyTable(data: Uint8ClampedArray, table: Uint8Array) {
  for (let i = 0; i < data.length; i += 4) {
    const t = (((data[i] >> 2) << 12) | ((data[i + 1] >> 2) << 6) | (data[i + 2] >> 2)) * 3;
    data[i] = table[t];
    data[i + 1] = table[t + 1];
    data[i + 2] = table[t + 2];
  }
}

/**
 * Desenha a LUT como textura PNG 512×512, no formato das texturas de exemplo
 * do Effect House: 64 níveis, blocos de 64×64 em grade 8×8; cada bloco é uma
 * fatia de azul, o vermelho cresce para a direita e o verde para baixo
 * (preto no canto superior esquerdo).
 */
export function renderLut(p: ColorParams): HTMLCanvasElement {
  const n = 64;
  const perRow = 8;
  const canvas = document.createElement("canvas");
  canvas.width = n * perRow;
  canvas.height = n * (n / perRow);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(canvas.width, canvas.height);
  for (let b = 0; b < n; b++) {
    const ox = (b % perRow) * n;
    const oy = Math.floor(b / perRow) * n;
    for (let g = 0; g < n; g++) {
      for (let r = 0; r < n; r++) {
        const [nr, ng, nb] = grade(r / (n - 1), g / (n - 1), b / (n - 1), p);
        const i = ((oy + g) * canvas.width + ox + r) * 4;
        img.data[i] = Math.round(nr * 255);
        img.data[i + 1] = Math.round(ng * 255);
        img.data[i + 2] = Math.round(nb * 255);
        img.data[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
