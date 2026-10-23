import JSZip from "jszip";
import { canvasToBlob, slug } from "./export";
import { renderIcone, renderPergunta, renderResposta } from "./cards";
import type { Sorteio } from "./sorteios";

function leiame(s: Sorteio): string {
  return `# ${s.nome}

Sorteio para o modelo oficial **Randomizer 2D** do Effect House: a pergunta
aparece sobre a cabeça e depois as respostas giram até parar numa delas.
${s.sazonal ? `\n> ${s.sazonal}\n` : ""}
## Montar (uns 5 minutos)

1. Abra o Effect House, vá em **Templates** e escolha **Randomizer 2D**.
   Salve o projeto numa pasta.
2. No painel **Assets**, clique em **+** → **Import** → **Texture Sequence** e
   selecione todos os arquivos da pasta \`respostas/\` de uma vez.
3. Ainda em **Assets**, clique em **+** → **Import** → **From Computer** e
   escolha \`pergunta.png\`.
4. No painel **Hierarchy**, selecione **Title** e, no **Inspector**, troque a
   textura do componente **Image** por \`pergunta.png\`. A pergunta é mais
   larga que a do modelo: ajuste **Size** no **2D Transform** (proporção
   1024×384) ou estique na cena.
5. Selecione **RandomAnimationSequence** e, no componente **Animation
   Sequence**, troque a **Texture Sequence** pela sequência importada.
6. No painel **Visual Scripting**, desmarque **TapToSpin** para o sorteio
   girar sozinho quando a pessoa começa a gravar.
7. Confira no **Preview** se a pergunta aparece e as respostas giram.

## Enviar

Clique em **Submit** e preencha:

- **Effect name:** ${s.nome}
- **Hint:** Show face
- **Category:** a de jogos/sorteios (ou a mais próxima disponível)
- **Tags:** ${s.tags.join(", ")}
- **Ícone:** em **Create icon** → **Upload image**, escolha \`icone.png\`
- **Demo video:** opcional

A revisão do TikTok leva até um dia útil.

## Respostas

${s.respostas.map((r, i) => `${i + 1}. ${r}`).join("\n")}
`;
}

/** Adiciona à pasta do zip as imagens e o LEIAME de um sorteio. */
export async function addSorteio(folder: JSZip, s: Sorteio, font: string) {
  folder.file("pergunta.png", await canvasToBlob(renderPergunta(s.pergunta, s.cores, font)));
  folder.file("icone.png", await canvasToBlob(renderIcone(s.icone, s.cores, font)));
  for (const [i, r] of s.respostas.entries()) {
    const n = String(i + 1).padStart(2, "0");
    folder.file(`respostas/${n}-${slug(r)}.png`, await canvasToBlob(renderResposta(r, s.cores, font)));
  }
  folder.file("LEIAME.md", leiame(s));
}

export async function buildSorteios(sorteios: Sorteio[], font: string): Promise<Blob> {
  const zip = new JSZip();
  for (const s of sorteios) await addSorteio(zip.folder(s.id)!, s, font);
  return zip.generateAsync({ type: "blob" });
}
