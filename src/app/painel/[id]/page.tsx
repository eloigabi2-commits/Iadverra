import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  garantirCodigo,
  linkDaSolicitacao,
  formatarData,
  isTipoFoto,
  linkWhatsApp,
  mensagemWhatsApp,
  ROTULO_FOTO,
  SEM_ATENDENTE,
  TIPOS_FOTO,
} from "@/lib/documentos";
import { podeVer, sessaoAtual, veTudo } from "@/lib/painel-auth";
import CopiarLink from "@/components/CopiarLink";
import BotaoExcluir from "@/components/BotaoExcluir";
import { excluir, marcarConferido, pedirDeNovo } from "../actions";

export default async function Detalhe(props: PageProps<"/painel/[id]">) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/painel/login");
  const { id } = await props.params;
  const { refazer } = await props.searchParams;

  const s = await prisma.solicitacaoDocumento.findUnique({
    where: { id },
    include: { fotos: { select: { id: true, tipo: true } } },
  });
  // cliente de outra atendente: nem confirma que existe
  if (!s || !podeVer(sessao, s.atendente)) notFound();

  const h = await headers();
  const origem = process.env.APP_URL?.trim().replace(/\/+$/, "") || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const url = linkDaSolicitacao(await garantirCodigo(s), origem);
  const ehRefazer = isTipoFoto(refazer) || (s.status === "aguardando" && s.fotos.length > 0);
  const mensagem = mensagemWhatsApp(s.nome, url, { refazer: ehRefazer, atendente: s.atendente });

  return (
    <main className="mx-auto max-w-4xl px-5 py-6">
      <Link
        href={veTudo(sessao) ? `/painel?atendente=${encodeURIComponent(s.atendente || SEM_ATENDENTE)}` : "/painel"}
        className="text-sm text-tinta/60 underline"
      >
        ← Voltar para a lista
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-marca text-3xl font-bold text-vinho">{s.nome ?? "Sem nome"}</h1>
          <p className="text-tinta/70">
            {s.telefone ?? "sem telefone"}
            {veTudo(sessao) && s.atendente ? ` · atendente ${s.atendente}` : ""}
          </p>
        </div>
        <Situacao status={s.status} />
      </div>

      {s.status === "aguardando" && (
        <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          {isTipoFoto(refazer) && (
            <p className="mb-4 rounded-lg bg-marfim p-3 text-sm">
              A foto <strong>{ROTULO_FOTO[refazer]}</strong> foi apagada. Mande o link de novo: o cliente cai direto
              nela.
            </p>
          )}
          <a
            href={linkWhatsApp(s.telefone, mensagem)}
            target="_blank"
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#25d366] px-5 py-4 text-lg font-bold text-white sm:w-auto sm:inline-flex"
          >
            <IconeWhatsApp /> Enviar link pelo WhatsApp
          </a>
          <p className="mt-3 text-sm text-tinta/60">Abre o WhatsApp com a mensagem pronta. É só apertar enviar.</p>
          <div className="mt-3">
            <CopiarLink url={url} mensagem={mensagem} />
          </div>
        </section>
      )}

      <section className="mt-5 grid gap-4 sm:grid-cols-3">
        {TIPOS_FOTO.map((tipo) => {
          const foto = s.fotos.find((f) => f.tipo === tipo);
          return (
            <figure key={tipo} className="flex flex-col rounded-2xl bg-white p-3 shadow-sm">
              <figcaption className="mb-2 font-semibold">{ROTULO_FOTO[tipo]}</figcaption>
              {foto ? (
                <>
                  <a href={`/api/painel/fotos/${foto.id}`} target="_blank" title="Abrir em tamanho grande">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/painel/fotos/${foto.id}`}
                      alt={ROTULO_FOTO[tipo]}
                      className="aspect-[4/3] w-full rounded-lg border border-marfim bg-creme object-contain"
                    />
                  </a>
                  <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                    <a href={`/api/painel/fotos/${foto.id}?baixar`} className="font-semibold text-vinho underline">
                      Baixar
                    </a>
                    <form action={pedirDeNovo}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="tipo" value={tipo} />
                      <button className="rounded-lg border border-cobre px-2 py-1 font-semibold text-cobre">
                        Pedir de novo
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <p className="flex aspect-[4/3] items-center justify-center rounded-lg bg-creme p-4 text-center text-sm text-tinta/50">
                  Ainda não enviada
                </p>
              )}
            </figure>
          );
        })}
      </section>

      {s.status === "enviado" && (
        <form action={marcarConferido} className="mt-5">
          <input type="hidden" name="id" value={s.id} />
          <button className="w-full rounded-xl bg-folha px-5 py-4 text-lg font-bold text-white sm:w-auto">
            ✓ Conferi, está tudo certo
          </button>
        </form>
      )}

      <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-tinta/70">
        <dt>Link criado</dt>
        <dd>{formatarData(s.criadoEm)}</dd>
        <dt>Aceite da privacidade</dt>
        <dd>{formatarData(s.consentimentoEm)}</dd>
        <dt>Fotos recebidas</dt>
        <dd>{formatarData(s.enviadoEm)}</dd>
        {s.referencia && (
          <>
            <dt>Referência</dt>
            <dd>{s.referencia}</dd>
          </>
        )}
      </dl>

      <form action={excluir} className="mt-6">
        <input type="hidden" name="id" value={s.id} />
        <BotaoExcluir />
      </form>
    </main>
  );
}

function Situacao({ status }: { status: string }) {
  const estilo =
    status === "enviado"
      ? ["bg-cobre/15 text-cobre", "Para conferir"]
      : status === "conferido"
        ? ["bg-folha/15 text-folha", "Conferido"]
        : ["bg-marfim text-tinta/70", "Esperando o cliente"];
  return <span className={`rounded-full px-3 py-1 text-sm font-semibold ${estilo[0]}`}>{estilo[1]}</span>;
}

function IconeWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.2-.3-.2-.5-.3z" />
    </svg>
  );
}
