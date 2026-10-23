"use client";

import { useEffect, useRef, useState } from "react";

type Tipo = "rg_frente" | "rg_verso" | "comprovante";

const PASSOS: { tipo: Tipo; titulo: string; destaque: string; dicas: string[] }[] = [
  {
    tipo: "rg_frente",
    titulo: "Foto da FRENTE do seu RG",
    destaque: "o lado com a sua foto",
    dicas: [
      "Tire o RG do plástico",
      "Coloque em cima de uma mesa, num lugar claro",
      "Pode ser o RG ou a carteira de motorista (CNH)",
    ],
  },
  {
    tipo: "rg_verso",
    titulo: "Foto do VERSO do seu RG",
    destaque: "o lado de trás, com o seu nome e os números",
    dicas: [
      "Vire o documento",
      "Veja se dá para ler todas as letras",
      "Se mandou a CNH aberta na frente, tire a foto do outro lado",
    ],
  },
  {
    tipo: "comprovante",
    titulo: "Foto do COMPROVANTE DE ENDEREÇO",
    destaque: "conta de luz, água, telefone ou banco",
    dicas: [
      "Pode ser de qualquer um dos últimos 3 meses",
      "Mostre a parte onde aparece o seu endereço",
      "Pode estar no nome de um parente que mora com você",
    ],
  },
];

type Etapa = "inicio" | "passo" | "fim";

// Diminui a foto antes de enviar: a câmera do celular gera arquivos grandes
// e a internet de muitos clientes é lenta.
async function prepararFoto(arquivo: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    const lado = 1800;
    const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
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
  const primeiroFaltando = PASSOS.findIndex((p) => !props.fotosEnviadas.includes(p.tipo));
  const [etapa, setEtapa] = useState<Etapa>(props.concluido ? "fim" : "inicio");
  const [indice, setIndice] = useState(primeiroFaltando === -1 ? PASSOS.length - 1 : primeiroFaltando);
  const [foto, setFoto] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  function trocarFoto(arquivo: File | null) {
    if (previa) URL.revokeObjectURL(previa);
    setFoto(arquivo);
    setPrevia(arquivo ? URL.createObjectURL(arquivo) : null);
  }

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [etapa, indice]);

  const api = `/api/documentos/${props.token}`;

  async function comecar() {
    setErro(null);
    setEnviando(true);
    try {
      if (!props.jaAceitou) {
        const resp = await fetch(`${api}/consentimento`, { method: "POST" });
        if (!resp.ok) throw new Error();
      }
      setEtapa("passo");
    } catch {
      setErro("Não conseguimos continuar. Confira se a internet está ligada e toque de novo.");
    } finally {
      setEnviando(false);
    }
  }

  function abrirCamera() {
    setErro(null);
    entrada.current?.click();
  }

  async function enviarFoto() {
    if (!foto) return;
    setErro(null);
    setEnviando(true);
    try {
      const form = new FormData();
      form.set("tipo", PASSOS[indice].tipo);
      form.set("arquivo", await prepararFoto(foto), "foto.jpg");
      const resp = await fetch(`${api}/fotos`, { method: "POST", body: form });
      if (resp.status === 409) {
        setEtapa("fim");
        return;
      }
      if (!resp.ok) {
        const corpo = await resp.json().catch(() => ({}));
        throw new Error(corpo.erro === "arquivo não é uma foto" ? "formato" : "envio");
      }

      trocarFoto(null);
      if (indice < PASSOS.length - 1) {
        setIndice(indice + 1);
        return;
      }
      const fim = await fetch(`${api}/concluir`, { method: "POST" });
      if (!fim.ok) {
        const corpo = await fim.json().catch(() => ({}));
        const falta = PASSOS.findIndex((p) => corpo.faltando?.includes(p.tipo));
        if (falta >= 0) {
          setIndice(falta);
          setErro("Falta uma foto. Tire esta de novo, por favor.");
          return;
        }
        throw new Error("envio");
      }
      setEtapa("fim");
    } catch (e) {
      setErro(
        e instanceof Error && e.message === "formato"
          ? "Não conseguimos abrir essa foto. Toque em \"Tirar outra foto\" e use a câmera."
          : "Não conseguimos enviar. Confira se a internet está ligada e toque em \"Enviar\" de novo.",
      );
    } finally {
      setEnviando(false);
    }
  }

  const botao =
    "flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-5 text-2xl font-bold shadow-sm transition active:scale-[0.98] disabled:opacity-60";

  return (
    <main className="min-h-screen bg-white px-5 pb-16 pt-8 text-zinc-900">
      <div className="mx-auto max-w-md">
        {erro && (
          <p role="alert" className="mb-6 rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-xl leading-relaxed text-red-900">
            {erro}
          </p>
        )}

        {etapa === "inicio" && (
          <section>
            <h1 className="text-3xl font-bold leading-tight">
              {props.primeiroNome ? `Olá, ${props.primeiroNome}!` : "Olá!"}
            </h1>
            <p className="mt-4 text-xl leading-relaxed">
              Para seguir com o seu atendimento, precisamos de <strong>3 fotos</strong>:
            </p>
            <ol className="mt-4 space-y-3 text-xl">
              <li className="rounded-2xl bg-zinc-100 p-4">1. Frente do RG</li>
              <li className="rounded-2xl bg-zinc-100 p-4">2. Verso do RG</li>
              <li className="rounded-2xl bg-zinc-100 p-4">3. Comprovante de endereço</li>
            </ol>
            <p className="mt-4 text-xl leading-relaxed">Separe os documentos antes de começar. Leva uns 2 minutos.</p>

            <div className="mt-6 rounded-2xl border-2 border-zinc-200 p-4 text-lg leading-relaxed">
              <p>
                Suas fotos vão direto e com segurança para a equipe do {props.escritorio}. Elas são usadas
                só para o seu atendimento e não ficam no WhatsApp.
              </p>
              <a href="/privacidade" target="_blank" className="mt-2 inline-block font-semibold text-blue-700 underline">
                Ler a política de privacidade
              </a>
            </div>

            <button onClick={comecar} disabled={enviando} className={`${botao} mt-6 bg-green-600 text-white`}>
              {enviando ? "Aguarde..." : "Concordo, vamos começar"}
            </button>
          </section>
        )}

        {etapa === "passo" && (
          <section>
            <p className="text-xl font-semibold text-zinc-600">
              Passo {indice + 1} de {PASSOS.length}
            </p>
            <div className="mt-2 flex gap-2" aria-hidden>
              {PASSOS.map((p, i) => (
                <span key={p.tipo} className={`h-3 flex-1 rounded-full ${i <= indice ? "bg-green-600" : "bg-zinc-200"}`} />
              ))}
            </div>

            <h1 className="mt-6 text-3xl font-bold leading-tight">{PASSOS[indice].titulo}</h1>
            <p className="mt-2 text-xl text-zinc-700">({PASSOS[indice].destaque})</p>

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
                <Ilustracao tipo={PASSOS[indice].tipo} />
                <ul className="mt-6 space-y-3 text-xl leading-relaxed">
                  {PASSOS[indice].dicas.map((dica) => (
                    <li key={dica} className="flex gap-3">
                      <span className="font-bold text-green-700">✓</span>
                      <span>{dica}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={abrirCamera} className={`${botao} mt-8 bg-blue-700 text-white`}>
                  <IconeCamera /> Tirar foto
                </button>
              </>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previa} alt="Foto que você tirou" className="mt-6 w-full rounded-2xl border-2 border-zinc-200" />
                <p className="mt-4 text-xl leading-relaxed">Dá para ler tudo direitinho na foto?</p>
                <button onClick={enviarFoto} disabled={enviando} className={`${botao} mt-4 bg-green-600 text-white`}>
                  {enviando ? "Enviando..." : "Sim, enviar"}
                </button>
                <button
                  onClick={abrirCamera}
                  disabled={enviando}
                  className={`${botao} mt-4 border-2 border-zinc-300 bg-white text-zinc-900`}
                >
                  Tirar outra foto
                </button>
              </>
            )}
          </section>
        )}

        {etapa === "fim" && (
          <section className="pt-8 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-6xl text-green-700">
              ✓
            </div>
            <h1 className="mt-6 text-3xl font-bold">Pronto! Recebemos seus documentos.</h1>
            <p className="mt-4 text-xl leading-relaxed">
              Obrigado! Nossa equipe vai conferir e falar com você pelo WhatsApp. Já pode fechar esta página.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

function IconeCamera() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

// Desenho simples do documento esperado em cada passo
function Ilustracao({ tipo }: { tipo: Tipo }) {
  const traco = "#3f3f46";
  return (
    <svg viewBox="0 0 300 190" className="mt-6 w-full rounded-2xl bg-zinc-100 p-4" aria-hidden>
      {tipo === "comprovante" ? (
        <g fill="none" stroke={traco} strokeWidth="3">
          <rect x="90" y="8" width="120" height="174" rx="6" fill="#fff" />
          <line x1="105" y1="32" x2="175" y2="32" />
          <line x1="105" y1="52" x2="195" y2="52" />
          <rect x="102" y="70" width="96" height="34" rx="4" stroke="#15803d" strokeWidth="4" />
          <line x1="110" y1="82" x2="185" y2="82" />
          <line x1="110" y1="93" x2="165" y2="93" />
          <line x1="105" y1="122" x2="195" y2="122" />
          <line x1="105" y1="140" x2="195" y2="140" />
          <line x1="105" y1="158" x2="160" y2="158" />
        </g>
      ) : (
        <g fill="none" stroke={traco} strokeWidth="3">
          <rect x="20" y="20" width="260" height="150" rx="12" fill="#fff" />
          {tipo === "rg_frente" ? (
            <>
              <rect x="40" y="45" width="75" height="95" rx="6" stroke="#15803d" strokeWidth="4" />
              <circle cx="77" cy="80" r="16" />
              <path d="M52 135c4-20 46-20 50 0" />
              <line x1="135" y1="60" x2="255" y2="60" />
              <line x1="135" y1="85" x2="240" y2="85" />
              <line x1="135" y1="110" x2="255" y2="110" />
              <line x1="135" y1="135" x2="210" y2="135" />
            </>
          ) : (
            <>
              <line x1="40" y1="50" x2="200" y2="50" stroke="#15803d" strokeWidth="4" />
              <line x1="40" y1="75" x2="180" y2="75" />
              <line x1="40" y1="100" x2="200" y2="100" />
              <line x1="40" y1="125" x2="160" y2="125" />
              <line x1="40" y1="150" x2="190" y2="150" />
              <ellipse cx="240" cy="110" rx="22" ry="30" />
              <ellipse cx="240" cy="110" rx="12" ry="18" />
            </>
          )}
        </g>
      )}
    </svg>
  );
}
