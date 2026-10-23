// Grava as falas da tela de envio de documentos (src/lib/falas-documentos.ts)
// com a voz "eloisa" do Inworld, a mesma do fluxo de direito bancário no n8n,
// e salva em public/audio/<fala>.mp3.
//
//   INWORLD_API_KEY="Basic ..." npx tsx scripts/gerar-audios.ts          # todas
//   INWORLD_API_KEY="Basic ..." npx tsx scripts/gerar-audios.ts fim erro # só estas
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FALAS, type Fala } from "../src/lib/falas-documentos";

const VOZ = process.env.INWORLD_VOICE_ID ?? "default-jpibcv31cxg-rzgpovh4cg__eloisa";
const MODELO = "inworld-tts-1.5-max";
// um pouco mais devagar que no WhatsApp (1.1): o público é idoso
const VELOCIDADE = 0.95;

async function main() {
  const chave = process.env.INWORLD_API_KEY?.trim();
  if (!chave) {
    console.error("Defina INWORLD_API_KEY (o valor do header Authorization do nó do Inworld no n8n).");
    process.exit(1);
  }
  const authorization = /^(Basic|Bearer) /i.test(chave) ? chave : `Basic ${chave}`;

  const pedidas = process.argv.slice(2) as Fala[];
  const falas = (Object.keys(FALAS) as Fala[]).filter((f) => pedidas.length === 0 || pedidas.includes(f));
  const pasta = join(process.cwd(), "public", "audio");
  mkdirSync(pasta, { recursive: true });

  for (const fala of falas) {
    const resp = await fetch("https://api.inworld.ai/tts/v1/voice", {
      method: "POST",
      headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: FALAS[fala],
        voiceId: VOZ,
        modelId: MODELO,
        audioConfig: {
          audioEncoding: "MP3",
          sampleRateHertz: 48000,
          speakingRate: VELOCIDADE,
          applyTextNormalization: "ON",
        },
        temperature: 1.0,
      }),
    });
    if (!resp.ok) {
      console.error(`${fala}: erro ${resp.status} ${(await resp.text()).slice(0, 300)}`);
      process.exit(1);
    }
    const { audioContent } = (await resp.json()) as { audioContent: string };
    const audio = Buffer.from(audioContent, "base64");
    writeFileSync(join(pasta, `${fala}.mp3`), audio);
    console.log(`${fala}.mp3 (${Math.round(audio.length / 1024)} KB)`);
  }
}

main();
