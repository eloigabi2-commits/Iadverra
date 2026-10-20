// Narração com o Google Cloud Text-to-Speech (REST).
// Não tem dependências: roda direto com `node`, mesmo sem `npm install`.
//
// Uso:
//   node scripts/google-tts.mjs check                                  # confere se a chave existe (sem mostrar o valor)
//   node scripts/google-tts.mjs vozes [filtro]                         # lista as vozes pt-BR (ex.: filtro "Chirp3")
//   node scripts/google-tts.mjs falar <voz> <saida.wav> "<texto>"      # gera um WAV
//   node scripts/google-tts.mjs narrar <voz> <falas.txt> <pasta>       # uma fala por linha -> voz1.wav, voz2.wav...
//
// Opções:
//   --velocidade 1.05   velocidade da fala (padrão 1.0)
//
// Variável de ambiente:
//   GOOGLE_TTS_API_KEY   chave de API de um projeto com a Cloud Text-to-Speech API ativada

import { readFileSync, writeFileSync } from "node:fs";

const API = "https://texttospeech.googleapis.com/v1";

function parseArgs(argv) {
  const positional = [];
  let speed = 1;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--velocidade") speed = Number(argv[++i]);
    else positional.push(argv[i]);
  }
  return { command: positional[0] ?? "check", rest: positional.slice(1), speed };
}

function apiKey() {
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) {
    console.error("GOOGLE_TTS_API_KEY não está definida no ambiente.");
    process.exit(1);
  }
  return key;
}

async function call(path, body) {
  const res = await fetch(`${API}/${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey() },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`Erro ${res.status}: ${data.error?.message ?? JSON.stringify(data)}`);
    process.exit(1);
  }
  return data;
}

async function speak(voice, out, text) {
  const { audioContent } = await call("text:synthesize", {
    input: { text },
    voice: { languageCode: "pt-BR", name: voice },
    audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: 44100, speakingRate: speed },
  });
  writeFileSync(out, Buffer.from(audioContent, "base64"));
  console.log(out);
}

const { command, rest, speed } = parseArgs(process.argv.slice(2));

if (command === "check") {
  apiKey();
  console.log("GOOGLE_TTS_API_KEY definida.");
} else if (command === "vozes") {
  const { voices } = await call("voices?languageCode=pt-BR");
  const filter = rest[0] ?? "";
  for (const v of voices.filter((v) => v.name.includes(filter)).sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`${v.name}\t${v.ssmlGender}`);
  }
} else if (command === "falar") {
  const [voice, out, text] = rest;
  if (!voice || !out || !text) {
    console.error('Uso: falar <voz> <saida.wav> "<texto>"');
    process.exit(1);
  }
  await speak(voice, out, text);
} else if (command === "narrar") {
  const [voice, file, dir] = rest;
  if (!voice || !file || !dir) {
    console.error("Uso: narrar <voz> <falas.txt> <pasta>");
    process.exit(1);
  }
  const lines = readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
  for (const [i, line] of lines.entries()) await speak(voice, `${dir}/voz${i + 1}.wav`, line);
} else {
  console.error(`Comando desconhecido: ${command}`);
  process.exit(1);
}
