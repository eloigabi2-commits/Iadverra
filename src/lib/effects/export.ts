import JSZip from "jszip";
import { type ColorParams, renderLut } from "./color";
import { type Sticker, renderSticker } from "./stickers";

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar PNG"))), "image/png"),
  );
}

export function slug(nome: string): string {
  return (
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "efeito"
  );
}

function leiame(nome: string, filtroAtivo: boolean, stickers: Sticker[]): string {
  const adesivos = stickers
    .map((s) => `- \`adesivos/${s.id}.png\` (${s.nome}): ${s.dica}`)
    .join("\n");

  return `# ${nome}: montagem no Effect House

Pacote gerado pelo Estúdio de Efeitos do Iadverra. Os filtros de câmera do
TikTok só podem ser publicados pelo **Effect House** (programa gratuito do
TikTok para Windows e Mac: https://effecthouse.tiktok.com). Este pacote traz
as texturas prontas; a montagem leva poucos minutos.

> Os nomes dos menus abaixo podem mudar um pouco entre versões do Effect House.

## 1. Criar o projeto

1. Abra o Effect House e crie um projeto em branco (*Blank*).
2. Arraste a pasta deste pacote para o painel **Assets**.

${
  filtroAtivo
    ? `## 2. Filtro de cor (LUT)

1. Em **Add object**, adicione o efeito de pós-processamento de filtro de
   cor (*Post Effect → Filter / Color Lookup*).
2. No campo da textura LUT, escolha \`filtro/lut-512.png\`.
   - Se o Effect House pedir LUT em tira (16 níveis), use
     \`filtro/lut-256x16.png\`.
3. Ajuste a intensidade (*Intensity*) se quiser um efeito mais suave.

Nas duas texturas, cada bloco é uma fatia de azul, o vermelho cresce para a
direita e o verde para baixo (preto no canto superior esquerdo). Se as cores
saírem trocadas, a versão do Effect House espera a LUT invertida na vertical.
`
    : ""
}
${
  stickers.length
    ? `## ${filtroAtivo ? 3 : 2}. Adesivos no rosto

1. Em **Add object → AR Tracking**, adicione um **Head Tracker**.
2. Dentro dele, adicione uma imagem 2D (*2D → Image*) para cada adesivo e
   escolha a textura correspondente:

${adesivos}

3. Ajuste posição e escala na prévia do Effect House até ficar como no
   estúdio. Mantenha as imagens como filhas do Head Tracker para que
   acompanhem a cabeça.
`
    : ""
}
## Publicar

1. Teste no celular com **Preview on device** (QR code no app do TikTok).
2. Clique em **Submit**, preencha nome, ícone e vídeo de demonstração.
   A revisão do TikTok costuma levar alguns dias.

O arquivo \`efeito.json\` guarda as configurações usadas, para recriar o
efeito no estúdio depois.
`;
}

export async function buildBundle(
  nome: string,
  params: ColorParams,
  filtroAtivo: boolean,
  stickers: Sticker[],
): Promise<Blob> {
  const zip = new JSZip();
  const base = zip.folder(slug(nome))!;

  if (filtroAtivo) {
    base.file("filtro/lut-512.png", await canvasToBlob(renderLut(params, "512")));
    base.file("filtro/lut-256x16.png", await canvasToBlob(renderLut(params, "256x16")));
  }
  for (const s of stickers) {
    base.file(`adesivos/${s.id}.png`, await canvasToBlob(renderSticker(s)));
  }
  base.file(
    "efeito.json",
    JSON.stringify(
      {
        nome,
        filtro: filtroAtivo ? params : null,
        adesivos: stickers.map((s) => ({ id: s.id, nome: s.nome, ancoras: s.anchors })),
      },
      null,
      2,
    ),
  );
  base.file("LEIAME.md", leiame(nome, filtroAtivo, stickers));

  return zip.generateAsync({ type: "blob" });
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
