"use client";

import { useEffect, useState } from "react";
import { renderIcone, renderPergunta, renderResposta } from "@/lib/effects/cards";
import { download } from "@/lib/effects/export";
import { buildSorteios } from "@/lib/effects/sorteio-export";
import { SORTEIOS, type Sorteio } from "@/lib/effects/sorteios";

interface Previa {
  pergunta: string;
  icone: string;
  respostas: string[];
}

/**
 * Espera a fonte das cartas carregar. Carrega só a primeira família: a
 * "Fallback" do next/font aponta para fontes locais (Arial) que podem não
 * existir, e aí o navegador rejeita a carga inteira.
 */
async function loadFont(font: string) {
  try {
    await document.fonts.load(`800 40px ${font.split(",")[0]}`, "Sorteio ÀÉÇ?");
  } catch {
    // Sem a fonte as cartas saem com a fonte padrão, mas ainda saem.
  }
}

const card =
  "flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900";
const muted = "text-xs text-zinc-500 dark:text-zinc-400";
const button =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800";
const primary =
  "rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300";

export default function SorteiosStudio({ font }: { font: string }) {
  const [previas, setPrevias] = useState<Record<string, Previa>>({});
  const [baixando, setBaixando] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // As cartas são desenhadas no canvas, que só usa a fonte depois de carregada.
      await loadFont(font);
      if (cancelled) return;
      const out: Record<string, Previa> = {};
      for (const s of SORTEIOS) {
        out[s.id] = {
          pergunta: renderPergunta(s.pergunta, s.cores, font).toDataURL(),
          icone: renderIcone(s.icone, s.cores, font).toDataURL(),
          respostas: s.respostas.slice(0, 4).map((r) => renderResposta(r, s.cores, font).toDataURL()),
        };
      }
      setPrevias(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [font]);

  async function baixar(lista: Sorteio[], nome: string, chave: string) {
    setBaixando(chave);
    try {
      await loadFont(font);
      download(await buildSorteios(lista, font), `${nome}.zip`);
    } finally {
      setBaixando(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Sorteios para TikTok</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Pacotes prontos para o modelo oficial <strong>Randomizer 2D</strong> do Effect House:
            pergunta, respostas, ícone e um LEIAME com a montagem e os dados do envio. Sorteios
            precisam de 5 mil vídeos em 30 dias para render no programa de recompensas.
          </p>
        </div>
        <button
          className={primary}
          disabled={baixando !== null}
          onClick={() => baixar(SORTEIOS, "sorteios-tiktok", "todos")}
        >
          {baixando === "todos" ? "Gerando…" : `Baixar todos (${SORTEIOS.length})`}
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SORTEIOS.map((s) => {
          const p = previas[s.id];
          return (
            <section key={s.id} className={card}>
              <div className="flex items-center gap-3">
                {p && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.icone} alt="" className="h-12 w-12 rounded-xl" />
                )}
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{s.nome}</h2>
                  <p className={muted}>
                    {s.respostas.length} respostas{s.sazonal ? ` · ${s.sazonal}` : ""}
                  </p>
                </div>
              </div>
              {p ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.pergunta} alt={s.pergunta} className="w-full max-w-sm" />
                  <div className="grid grid-cols-4 gap-2">
                    {p.respostas.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={src} alt={s.respostas[i]} className="w-full" />
                    ))}
                  </div>
                </>
              ) : (
                <p className={muted}>Gerando prévia…</p>
              )}
              <p className={muted}>{s.respostas.join(" · ")}</p>
              <button
                className={`${button} self-start`}
                disabled={baixando !== null}
                onClick={() => baixar([s], s.id, s.id)}
              >
                {baixando === s.id ? "Gerando…" : "Baixar pacote"}
              </button>
            </section>
          );
        })}
      </div>
    </main>
  );
}
