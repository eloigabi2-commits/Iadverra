// Imagens dos sorteios: cartas de resposta, a pergunta que flutua sobre a
// cabeça e o ícone do efeito, nos tamanhos aceitos pelo Effect House.

export const CARTA = 512; // respostas: quadradas, como no exemplo oficial
export const TITULO = { w: 1024, h: 384 };
export const ICONE = { canvas: 162, seguro: 144 };

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Quebra o texto em linhas e acha o maior tamanho de fonte que cabe na caixa. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  maxW: number,
  maxH: number,
  maxSize: number,
  maxLines: number,
): { size: number; lines: string[] } {
  // Pedaços que podem ir para a linha seguinte: palavras e, dentro delas,
  // partes depois de hífen ("vale-" + "coxinha") ou antes de parêntese
  // ("Milionário" + "(a)"). glue = "" quando o pedaço continua a palavra
  // anterior, " " quando começa palavra nova.
  const pieces: { text: string; glue: string }[] = [];
  for (const word of text.split(/\s+/)) {
    word.split(/(?<=-)|(?=\()/).forEach((part, i) => pieces.push({ text: part, glue: i ? "" : " " }));
  }
  for (let size = maxSize; size > 12; size -= 2) {
    ctx.font = `800 ${size}px ${font}`;
    const lines: string[] = [];
    let line = "";
    let fits = true;
    for (const p of pieces) {
      const test = line ? line + p.glue + p.text : p.text;
      if (ctx.measureText(test).width <= maxW) line = test;
      else {
        if (!line || ctx.measureText(p.text).width > maxW) {
          fits = false;
          break;
        }
        lines.push(line);
        line = p.text;
      }
    }
    if (!fits) continue;
    lines.push(line);
    if (lines.length <= maxLines && lines.length * size * 1.05 <= maxH) return { size, lines };
  }
  return { size: 12, lines: [text] };
}

function drawLines(ctx: CanvasRenderingContext2D, lines: string[], size: number, cx: number, cy: number) {
  const lh = size * 1.05;
  const top = cy - (lines.length * lh) / 2 + lh / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((l, i) => ctx.fillText(l, cx, top + i * lh + size * 0.04));
}

export function renderResposta(texto: string, cores: [string, string], font: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = CARTA;
  const ctx = c.getContext("2d")!;
  const m = 20;
  const g = ctx.createLinearGradient(0, 0, CARTA, CARTA);
  g.addColorStop(0, cores[0]);
  g.addColorStop(1, cores[1]);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, m, m, CARTA - 2 * m, CARTA - 2 * m, 72);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = 12;
  ctx.strokeStyle = "#ffffff";
  roundRect(ctx, m + 6, m + 6, CARTA - 2 * m - 12, CARTA - 2 * m - 12, 66);
  ctx.stroke();

  // brilho no topo da carta
  const hl = ctx.createLinearGradient(0, m, 0, CARTA / 2);
  hl.addColorStop(0, "rgba(255,255,255,0.28)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  roundRect(ctx, m + 12, m + 12, CARTA - 2 * m - 24, CARTA / 2 - m, 60);
  ctx.fillStyle = hl;
  ctx.fill();

  const { size, lines } = fitText(ctx, texto, font, CARTA - 2 * m - 56, CARTA - 2 * m - 90, 104, 4);
  ctx.font = `800 ${size}px ${font}`;
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  drawLines(ctx, lines, size, CARTA / 2 + 3, CARTA / 2 + 5);
  ctx.fillStyle = "#ffffff";
  drawLines(ctx, lines, size, CARTA / 2, CARTA / 2);
  return c;
}

export function renderPergunta(texto: string, cores: [string, string], font: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = TITULO.w;
  c.height = TITULO.h;
  const ctx = c.getContext("2d")!;
  const m = 20;
  const g = ctx.createLinearGradient(0, 0, TITULO.w, 0);
  g.addColorStop(0, cores[0]);
  g.addColorStop(1, cores[1]);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, m, m, TITULO.w - 2 * m, TITULO.h - 2 * m, 64);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 14;
  ctx.strokeStyle = g;
  roundRect(ctx, m + 7, m + 7, TITULO.w - 2 * m - 14, TITULO.h - 2 * m - 14, 58);
  ctx.stroke();

  const { size, lines } = fitText(ctx, texto, font, TITULO.w - 2 * m - 120, TITULO.h - 2 * m - 70, 130, 2);
  ctx.font = `800 ${size}px ${font}`;
  ctx.fillStyle = g;
  drawLines(ctx, lines, size, TITULO.w / 2, TITULO.h / 2);
  return c;
}

export function renderIcone(texto: string, cores: [string, string], font: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = ICONE.canvas;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, ICONE.canvas, ICONE.canvas);
  g.addColorStop(0, cores[0]);
  g.addColorStop(1, cores[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ICONE.canvas, ICONE.canvas);

  // pequenas estrelas de "sorteio" nos cantos da área segura
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (const [x, y, r] of [
    [40, 42, 9],
    [124, 48, 6],
    [118, 122, 8],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  }

  const { size, lines } = fitText(ctx, texto, font, 104, 96, 96, 1);
  ctx.font = `800 ${size}px ${font}`;
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  drawLines(ctx, lines, size, ICONE.canvas / 2 + 2, ICONE.canvas / 2 + 4);
  ctx.fillStyle = "#ffffff";
  drawLines(ctx, lines, size, ICONE.canvas / 2, ICONE.canvas / 2);
  return c;
}
