import JSZip from "jszip";
import { type ColorParams, renderLut } from "./color";
import { type Sticker, renderSticker } from "./stickers";

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
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

## 1. Criar o projeto

1. Abra o Effect House e crie um projeto em branco (*Blank*).
2. Importe as imagens deste pacote: no painel **Assets**, clique em
   **+** → **Import** → **From Computer** (ou arraste os PNGs para o painel).

${
  filtroAtivo
    ? `## 2. Filtro de cor (LUT)

1. No painel **Hierarchy**, clique em **+** → **Post Effect** → **Filter**.
2. Selecione o objeto **Filter** e, no **Inspector**, troque a textura
   **Bright LUT Texture** por \`filtro/lut-512.png\`.
3. Ajuste **Intensity** (0 a 1) se quiser um efeito mais suave.
4. No **Inspector** da textura \`lut-512.png\`, mude **Compression Type**
   para **Manual**, **Max Resolution** 512 e **Quality** High. A compressão
   automática pode alterar as cores do filtro.

A LUT segue o formato das texturas de exemplo do próprio TikTok: 512×512,
64 blocos de 64×64; cada bloco é uma fatia de azul, o vermelho cresce para a
direita e o verde para baixo.
`
    : ""
}
${
  stickers.length
    ? `## ${filtroAtivo ? 3 : 2}. Adesivos no rosto

Para cada adesivo abaixo:

1. No painel **Hierarchy**, clique em **+** → **Face Effects** →
   **Face Sticker**.
2. No **Inspector**, troque a **Default_Texture** do componente **Image**
   pela textura do adesivo.
3. Arraste o adesivo na cena até o ponto indicado; ele se prende ao ponto
   do rosto mais próximo quando você solta. Ajuste o tamanho no **Transform**.

${adesivos}

Adesivos com duas posições (blush, brilhos) precisam de dois Face Stickers
com a mesma textura.
`
    : ""
}
## Publicar

1. Teste no celular: clique em **Preview in TikTok** e leia o QR code com o
   app do TikTok.
2. Clique em **Submit**, preencha nome, ícone e vídeo de demonstração.
   O pacote final do efeito precisa ter menos de 5 MB.

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
    base.file("filtro/lut-512.png", await canvasToBlob(renderLut(params)));
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
