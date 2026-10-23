"use client";

import { useRef, useState } from "react";

// Tela pensada para quem não sabe ler: cada passo é falado em voz alta,
// os documentos aparecem desenhados e cada tela tem um botão principal só.
// Para trocar a voz do celular por uma gravação de verdade, coloque o MP3 em
// public/audio/<chave>.mp3 (chaves em FALAS); sem o arquivo, o celular lê o texto.

type Tipo = "rg_frente" | "rg_verso" | "comprovante";
type Fala = "inicio" | Tipo | "conferir" | "enviando" | "fim" | "erro";

const FALAS: Record<Fala, string> = {
  inicio:
    "Olá! Vamos tirar três fotos: o seu RG, dos dois lados, e uma conta de luz ou de água. " +
    "As fotos vão direto para o escritório, só para o seu atendimento. " +
    "Se você concorda, toque no botão verde.",
  rg_frente:
    "Pegue o seu RG e tire do plástico. Deixe em cima da mesa, com o lado da sua foto para cima. " +
    "Agora toque no botão azul e tire a foto.",
  rg_verso: "Muito bem! Agora vire o RG, para o outro lado. Toque no botão azul e tire a foto.",
  comprovante:
    "Falta só uma! Pegue uma conta de luz ou de água, com o seu endereço. " +
    "Toque no botão azul e tire a foto.",
  conferir:
    "Olhe a foto. Se o documento aparece inteiro e sem borrão, toque no verde. " +
    "Se ficou ruim, toque no laranja para tirar de novo.",
  enviando: "Enviando. Espere um pouquinho.",
  fim: "Pronto! Recebemos tudo. Muito obrigado. Pode voltar para o WhatsApp.",
  erro: "Não deu certo. Veja se a internet está ligada e toque no botão de novo.",
};

const PASSOS: Tipo[] = ["rg_frente", "rg_verso", "comprovante"];
const LEGENDA: Record<Tipo, string> = {
  rg_frente: "RG – frente",
  rg_verso: "RG – verso",
  comprovante: "Conta de luz ou água",
};

let audioAtual: HTMLAudioElement | null = null;

function falar(chave: Fala) {
  audioAtual?.pause();
  window.speechSynthesis?.cancel();
  const texto = FALAS[chave];
  const lerTexto = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    fala.rate = 0.9;
    const voz = synth.getVoices().find((v) => v.lang.replace("_", "-").toLowerCase() === "pt-br");
    if (voz) fala.voice = voz;
    synth.speak(fala);
  };
  const audio = new Audio(`/audio/${chave}.mp3`);
  audioAtual = audio;
  audio.play().catch(lerTexto);
}

function vibrar() {
  navigator.vibrate?.(40);
}

async function prepararFoto(arquivo: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    if (blob) return blob;
  } catch {
    // formato que o navegador não abre (ex.: HEIC em alguns Android): manda o original
  }
  return arquivo;
}

export default function EnvioDocumentos(props: {
  token: string;
  primeiroNome: string | null;
  escritorio: string;
  jaAceitou: boolean;
  concluido: boolean;
  fotosEnviadas: string[];
}) {
  const primeiroFaltando = PASSOS.findIndex((p) => !props.fotosEnviadas.includes(p));
  const [etapa, setEtapa] = useState<"inicio" | "passo" | "fim">(props.concluido ? "fim" : "inicio");
  const [ouviu, setOuviu] = useState(false);
  const [indice, setIndice] = useState(primeiroFaltando === -1 ? PASSOS.length - 1 : primeiroFaltando);
  const [foto, setFoto] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  const api = `/api/documentos/${props.token}`;
  const tipo = PASSOS[indice];
  const falaAtual: Fala =
    etapa === "inicio" ? "inicio" : etapa === "fim" ? "fim" : erro ? "erro" : previa ? "conferir" : tipo;

  function trocarFoto(arquivo: File | null) {
    if (previa) URL.revokeObjectURL(previa);
    setFoto(arquivo);
    setPrevia(arquivo ? URL.createObjectURL(arquivo) : null);
    if (arquivo) falar("conferir");
  }

  function falhou() {
    setErro(true);
    falar("erro");
  }

  function ouvirInicio() {
    vibrar();
    setOuviu(true);
    falar("inicio");
  }

  async function comecar() {
    vibrar();
    setErro(false);
    setEnviando(true);
    try {
      if (!props.jaAceitou) {
        const resp = await fetch(`${api}/consentimento`, { method: "POST" });
        if (!resp.ok) throw new Error();
      }
      setEtapa("passo");
      falar(tipo);
    } catch {
      falhou();
    } finally {
      setEnviando(false);
    }
  }

  function abrirCamera() {
    vibrar();
    setErro(false);
    entrada.current?.click();
  }

  async function enviar() {
    if (!foto) return;
    vibrar();
    setErro(false);
    setEnviando(true);
    falar("enviando");
    try {
      const form = new FormData();
      form.set("tipo", tipo);
      form.set("arquivo", await prepararFoto(foto), "foto.jpg");
      const resp = await fetch(`${api}/fotos`, { method: "POST", body: form });
      if (resp.status === 409) {
        setEtapa("fim");
        falar("fim");
        return;
      }
      if (!resp.ok) throw new Error();

      trocarFoto(null);
      if (indice < PASSOS.length - 1) {
        setIndice(indice + 1);
        falar(PASSOS[indice + 1]);
        return;
      }
      const fim = await fetch(`${api}/concluir`, { method: "POST" });
      if (!fim.ok) {
        const corpo = await fim.json().catch(() => ({}));
        const falta = PASSOS.findIndex((p) => corpo.faltando?.includes(p));
        if (falta >= 0) {
          setIndice(falta);
          falar(PASSOS[falta]);
          return;
        }
        throw new Error();
      }
      setEtapa("fim");
      falar("fim");
    } catch {
      falhou();
    } finally {
      setEnviando(false);
    }
  }

  const botao =
    "flex w-full items-center justify-center gap-4 rounded-3xl py-6 text-3xl font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-50";

  return (
    <main className="flex min-h-screen flex-col bg-white px-5 pb-10 pt-5 text-zinc-900">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {etapa !== "fim" && (
          <div className="flex items-center justify-between">
            <Progresso indice={etapa === "passo" ? indice : -1} />
            <button
              onClick={() => falar(falaAtual)}
              aria-label="Ouvir de novo"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 active:scale-95"
            >
              <IconeSom className="h-9 w-9" />
            </button>
          </div>
        )}

        {etapa === "inicio" && (
          <section className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
            <div className="flex items-end justify-center gap-3">
              <Documento tipo="rg_frente" className="w-36" />
              <Documento tipo="comprovante" className="w-24" />
            </div>
            {!ouviu ? (
              <>
                <button
                  onClick={ouvirInicio}
                  aria-label="Toque para ouvir"
                  className="flex h-44 w-44 animate-pulse items-center justify-center rounded-full bg-blue-700 text-white shadow-xl active:scale-95"
                >
                  <IconeSom className="h-24 w-24" />
                </button>
                <p className="text-2xl font-semibold">Toque para ouvir</p>
              </>
            ) : (
              <>
                <button key="comecar" onClick={comecar} disabled={enviando} className={`${botao} bg-green-600 py-8`}>
                  <IconeJoinha className="h-14 w-14" /> Começar
                </button>
                <a href="/privacidade" target="_blank" className="text-base text-zinc-500 underline">
                  Política de privacidade
                </a>
              </>
            )}
          </section>
        )}

        {etapa === "passo" && (
          <section className="flex flex-1 flex-col gap-6 pt-4">
            <input
              ref={entrada}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) trocarFoto(arquivo);
                e.target.value = "";
              }}
            />

            {!previa ? (
              <>
                <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-3xl bg-zinc-100 p-6">
                  <Documento tipo={tipo} className={tipo === "comprovante" ? "w-40" : "w-64"} />
                  <p className="text-2xl font-bold">{LEGENDA[tipo]}</p>
                </div>
                <button onClick={abrirCamera} aria-label="Tirar foto" className={`${botao} bg-blue-700 py-10`}>
                  <IconeCamera className="h-20 w-20" />
                </button>
              </>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previa} alt="" className="max-h-[50vh] w-full rounded-3xl border-4 border-zinc-200 object-contain" />
                <div className="mt-auto grid grid-cols-2 gap-4">
                  <button
                    onClick={abrirCamera}
                    disabled={enviando}
                    aria-label="Tirar de novo"
                    className={`${botao} flex-col bg-orange-500 py-8 text-2xl`}
                  >
                    <IconeDeNovo className="h-16 w-16" />
                    De novo
                  </button>
                  <button
                    onClick={enviar}
                    disabled={enviando}
                    aria-label="Enviar"
                    className={`${botao} flex-col bg-green-600 py-8 text-2xl`}
                  >
                    {enviando ? <Girando className="h-16 w-16" /> : <IconeCerto className="h-16 w-16" />}
                    {enviando ? "Enviando" : "Enviar"}
                  </button>
                </div>
              </>
            )}

            {erro && (
              <div role="alert" className="flex items-center justify-center gap-3 rounded-3xl bg-red-50 p-4 text-red-800">
                <IconeSemInternet className="h-12 w-12" />
                <span className="text-xl font-semibold">Tente de novo</span>
              </div>
            )}
          </section>
        )}

        {etapa === "fim" && (
          <section className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
            <div className="flex h-48 w-48 items-center justify-center rounded-full bg-green-600 text-white shadow-xl">
              <IconeCerto className="h-32 w-32" />
            </div>
            <p className="text-3xl font-bold">Pronto! Obrigado.</p>
            <button
              onClick={() => falar("fim")}
              aria-label="Ouvir de novo"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100"
            >
              <IconeSom className="h-9 w-9" />
            </button>
          </section>
        )}
      </div>
    </main>
  );
}

// Três desenhos pequenos dos documentos: o atual em destaque, os já enviados com ✓
function Progresso({ indice }: { indice: number }) {
  return (
    <div className="flex gap-2" aria-hidden>
      {PASSOS.map((p, i) => (
        <div
          key={p}
          className={`relative flex h-14 w-16 items-center justify-center rounded-xl border-4 ${
            i === indice ? "border-blue-700 bg-blue-50" : i < indice ? "border-green-600 bg-green-50" : "border-zinc-200"
          }`}
        >
          <Documento tipo={p} className={p === "comprovante" ? "w-6" : "w-11"} />
          {i < indice && (
            <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white">
              <IconeCerto className="h-4 w-4" />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// Desenhos coloridos, parecidos com os documentos de verdade
function Documento({ tipo, className }: { tipo: Tipo; className?: string }) {
  if (tipo === "comprovante") {
    return (
      <svg viewBox="0 0 100 140" className={className} aria-hidden>
        <rect x="3" y="3" width="94" height="134" rx="6" fill="#fff" stroke="#3f3f46" strokeWidth="4" />
        <path d="M30 14 L20 34 H30 L24 52 L40 28 H30 L36 14 Z" fill="#facc15" stroke="#a16207" strokeWidth="2" />
        <path d="M70 16 C62 28 58 34 58 40 a12 12 0 0 0 24 0 c0-6-4-12-12-24 Z" fill="#38bdf8" stroke="#0369a1" strokeWidth="2" />
        <rect x="14" y="64" width="72" height="24" rx="3" fill="#dcfce7" stroke="#15803d" strokeWidth="3" />
        <path d="M24 82 V72 L32 66 L40 72 V82 Z" fill="#15803d" />
        <line x1="48" y1="72" x2="78" y2="72" stroke="#15803d" strokeWidth="3" />
        <line x1="48" y1="80" x2="72" y2="80" stroke="#15803d" strokeWidth="3" />
        <line x1="14" y1="102" x2="86" y2="102" stroke="#a1a1aa" strokeWidth="4" />
        <line x1="14" y1="114" x2="86" y2="114" stroke="#a1a1aa" strokeWidth="4" />
        <line x1="14" y1="126" x2="60" y2="126" stroke="#a1a1aa" strokeWidth="4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 160 105" className={className} aria-hidden>
      <rect x="3" y="3" width="154" height="99" rx="10" fill="#d9f0dc" stroke="#166534" strokeWidth="4" />
      {tipo === "rg_frente" ? (
        <>
          <rect x="14" y="16" width="48" height="62" rx="4" fill="#fff" stroke="#166534" strokeWidth="3" />
          <circle cx="38" cy="38" r="11" fill="#a16207" />
          <path d="M20 76 c3-16 33-16 36 0 Z" fill="#a16207" />
          <path d="M80 80 c8-10 16 4 24-6 s14 2 22-4" fill="none" stroke="#1e3a8a" strokeWidth="3" />
          <line x1="76" y1="24" x2="146" y2="24" stroke="#166534" strokeWidth="4" />
          <line x1="76" y1="38" x2="132" y2="38" stroke="#166534" strokeWidth="4" />
          <line x1="76" y1="52" x2="140" y2="52" stroke="#166534" strokeWidth="4" />
        </>
      ) : (
        <>
          <line x1="14" y1="22" x2="106" y2="22" stroke="#166534" strokeWidth="4" />
          <line x1="14" y1="36" x2="96" y2="36" stroke="#166534" strokeWidth="4" />
          <line x1="14" y1="50" x2="106" y2="50" stroke="#166534" strokeWidth="4" />
          <line x1="14" y1="64" x2="86" y2="64" stroke="#166534" strokeWidth="4" />
          <line x1="14" y1="78" x2="100" y2="78" stroke="#166534" strokeWidth="4" />
          <g fill="none" stroke="#3f3f46" strokeWidth="2.5">
            <ellipse cx="132" cy="58" rx="15" ry="21" />
            <ellipse cx="132" cy="58" rx="9" ry="14" />
            <ellipse cx="132" cy="58" rx="3.5" ry="6" />
          </g>
        </>
      )}
    </svg>
  );
}

type PropsIcone = { className?: string };
const traco = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function IconeSom({ className }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...traco}>
      <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" />
      <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
    </svg>
  );
}

function IconeCamera({ className }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...traco}>
      <path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function IconeCerto({ className }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...traco} strokeWidth={3}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

function IconeDeNovo({ className }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...traco} strokeWidth={2.6}>
      <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" />
    </svg>
  );
}

function IconeJoinha({ className }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...traco}>
      <path d="M7 10v10H4V10zM7 10l4-7c1.5 0 2.5 1 2.2 2.6L12.6 9H19a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7" />
    </svg>
  );
}

function IconeSemInternet({ className }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...traco}>
      <path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0" />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

function Girando({ className }: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} animate-spin`} aria-hidden {...traco} strokeWidth={3}>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}
