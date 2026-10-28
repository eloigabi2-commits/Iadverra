import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatarData, linkWhatsApp } from "@/lib/documentos";
import { podeVer, sessaoAtual, veTudo } from "@/lib/painel-auth";
import {
  formatarValor,
  linkDaCobranca,
  mensagemWhatsAppCobranca,
  rotuloDoStatus,
} from "@/lib/cobrancas";
import CopiarLink from "@/components/CopiarLink";
import BotaoCancelarCobranca from "@/components/BotaoCancelarCobranca";
import { cancelarCobranca, gerarCobranca, marcarCobrancaPaga } from "../actions";

export const dynamic = "force-dynamic";

const ABAS = [
  { status: "", rotulo: "Todas" },
  { status: "pendente", rotulo: "Aguardando" },
  { status: "paga", rotulo: "Pagas" },
  { status: "vencida", rotulo: "Vencidas" },
] as const;

export default async function Cobrancas(props: PageProps<"/painel/cobrancas">) {
  const busca = await props.searchParams;
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/painel/login");

  const cliente =
    typeof busca.solicitacao === "string" && busca.solicitacao
      ? await prisma.solicitacaoDocumento.findUnique({
          where: { id: busca.solicitacao },
          select: { id: true, nome: true, telefone: true, atendente: true },
        })
      : null;
  if (busca.solicitacao && (!cliente || !podeVer(sessao, cliente.atendente))) notFound();

  const status = ABAS.find((a) => a.status === busca.status)?.status ?? "";
  const filtroAtendente =
    sessao.gestor || sessao.atendente.veTodos ? {} : { atendente: sessao.atendente.nome };

  const [cobrancas, contagem] = await Promise.all([
    prisma.cobranca.findMany({
      where: { ...filtroAtendente, ...(status ? { status } : {}) },
      orderBy: { criadoEm: "desc" },
      take: 200,
    }),
    prisma.cobranca.groupBy({ by: ["status"], where: filtroAtendente, _count: true }),
  ]);
  const total = (s: string) =>
    s ? (contagem.find((c) => c.status === s)?._count ?? 0) : contagem.reduce((soma, c) => soma + c._count, 0);

  const criada =
    typeof busca.criada === "string"
      ? await prisma.cobranca.findUnique({ where: { codigo: busca.criada } })
      : null;
  const criadaVisivel = criada && podeVer(sessao, criada.atendente) ? criada : null;

  const h = await headers();
  const origem =
    process.env.APP_URL?.trim().replace(/\/+$/, "") || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  const erro = typeof busca.erro === "string" ? busca.erro : null;

  return (
    <main className="mx-auto max-w-4xl px-5 py-6">
      <Link href="/painel" className="text-sm text-tinta/60 underline">
        ← Painel de documentos
      </Link>
      <h1 className="mt-2 font-marca text-3xl font-bold text-vinho">Cobranças</h1>
      <p className="mt-1 text-sm text-tinta/60">
        Pix ou cartão de crédito pela conta do Asaas. O cliente paga pelo link; o painel mostra quando cai.
      </p>

      {erro && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 font-semibold text-red-800">
          {erro}
        </p>
      )}

      {criadaVisivel && (
        <section className="mt-4 rounded-2xl border-2 border-folha/30 bg-white p-5 shadow-sm">
          <p className="font-semibold text-folha">Cobrança criada para {criadaVisivel.nome.split(" ")[0]}.</p>
          <p className="mt-1 break-all text-sm text-tinta/70">{linkDaCobranca(criadaVisivel, origem)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a
              href={linkWhatsApp(
                criadaVisivel.telefone,
                mensagemWhatsAppCobranca(criadaVisivel.nome, linkDaCobranca(criadaVisivel, origem), Number(criadaVisivel.valor)),
              )}
              target="_blank"
              className="rounded-lg bg-[#25d366] px-4 py-2 text-sm font-bold text-white"
            >
              Enviar pelo WhatsApp
            </a>
            <CopiarLink
              url={linkDaCobranca(criadaVisivel, origem)}
              mensagem={mensagemWhatsAppCobranca(
                criadaVisivel.nome,
                linkDaCobranca(criadaVisivel, origem),
                Number(criadaVisivel.valor),
              )}
            />
            <Link href={`/pagar/${criadaVisivel.codigo}`} className="text-sm font-semibold text-vinho underline">
              Abrir a tela do cliente
            </Link>
          </div>
        </section>
      )}

      <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-marca text-2xl font-bold text-vinho">
          {cliente ? `Cobrar ${cliente.nome ?? "este cliente"}` : "Nova cobrança"}
        </h2>
        {cliente && (
          <p className="mt-1 text-sm text-tinta/60">
            Já vinculada ao envio de documentos.{" "}
            <Link href="/painel/cobrancas" className="underline">
              criar sem vincular
            </Link>
          </p>
        )}
        <form action={gerarCobranca} className="mt-4 grid gap-3 sm:grid-cols-2">
          {cliente && <input type="hidden" name="solicitacaoId" value={cliente.id} />}
          {cliente?.atendente && <input type="hidden" name="atendente" value={cliente.atendente} />}
          <label>
            <span className="text-sm font-medium">Nome do cliente</span>
            <input
              name="nome"
              required
              defaultValue={cliente?.nome ?? ""}
              className="mt-1 w-full rounded-lg border border-marfim px-3 py-3 text-lg"
            />
          </label>
          <label>
            <span className="text-sm font-medium">WhatsApp (com DDD)</span>
            <input
              name="telefone"
              inputMode="tel"
              defaultValue={cliente?.telefone ?? ""}
              placeholder="11 99999-8888"
              className="mt-1 w-full rounded-lg border border-marfim px-3 py-3 text-lg"
            />
          </label>
          <label>
            <span className="text-sm font-medium">CPF ou CNPJ</span>
            <input
              name="cpfCnpj"
              required
              inputMode="numeric"
              placeholder="000.000.000-00"
              className="mt-1 w-full rounded-lg border border-marfim px-3 py-3 text-lg"
            />
          </label>
          <label>
            <span className="text-sm font-medium">E-mail (opcional)</span>
            <input
              name="email"
              type="email"
              placeholder="cliente@email.com"
              className="mt-1 w-full rounded-lg border border-marfim px-3 py-3 text-lg"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-medium">Descrição que o cliente vai ler</span>
            <input
              name="descricao"
              placeholder="Assessoria para abertura de empresa"
              className="mt-1 w-full rounded-lg border border-marfim px-3 py-3 text-lg"
            />
          </label>
          <label>
            <span className="text-sm font-medium">Valor (R$)</span>
            <input
              name="valor"
              required
              inputMode="decimal"
              placeholder="1.500,00"
              className="mt-1 w-full rounded-lg border border-marfim px-3 py-3 text-lg"
            />
          </label>
          <button className="self-end rounded-lg bg-vinho px-5 py-3 text-lg font-semibold text-white">
            Criar cobrança
          </button>
        </form>
        <p className="mt-3 text-xs text-tinta/50">
          O link é do tipo /pagar/nome-xxxxxx. Nenhum valor é cobrado até o cliente escolher Pix ou cartão na tela.
        </p>
      </section>

      <nav className="mt-6 flex flex-wrap gap-2">
        {ABAS.map((a) => (
          <Link
            key={a.rotulo}
            href={a.status ? `/painel/cobrancas?status=${a.status}` : "/painel/cobrancas"}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              status === a.status ? "bg-vinho text-white" : "bg-white text-tinta"
            }`}
          >
            {a.rotulo} ({total(a.status)})
          </Link>
        ))}
      </nav>

      <ul className="mt-4 space-y-3">
        {cobrancas.length === 0 && <li className="rounded-2xl bg-white p-5 text-tinta/60">Nenhuma cobrança por aqui.</li>}
        {cobrancas.map((c) => {
          const url = linkDaCobranca(c, origem);
          const mensagem = mensagemWhatsAppCobranca(c.nome, url, Number(c.valor));
          const aberta = c.status === "pendente" || c.status === "vencida";
          return (
            <li key={c.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-semibold">{c.nome}</p>
                  <p className="text-sm text-tinta/60">
                    {c.descricao} · {formatarData(c.criadoEm)}
                    {veTudo(sessao) && c.atendente ? ` · ${c.atendente}` : ""}
                  </p>
                  <p className="mt-1 break-all text-xs text-tinta/40">{url}</p>
                </div>
                <div className="text-right">
                  <p className="font-marca text-xl font-bold text-vinho">{formatarValor(Number(c.valor))}</p>
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${estiloDoStatus(c.status)}`}>
                    {rotuloDoStatus(c.status)}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {(aberta || c.status === "analise") && (
                  <>
                    <a
                      href={linkWhatsApp(c.telefone, mensagem)}
                      target="_blank"
                      className="rounded-lg bg-[#25d366] px-3 py-2 text-sm font-bold text-white"
                    >
                      WhatsApp
                    </a>
                    <CopiarLink url={url} mensagem={mensagem} />
                  </>
                )}
                {!aberta && c.status !== "analise" && (
                  <Link href={`/pagar/${c.codigo}`} className="text-sm font-semibold text-vinho underline">
                    Ver tela do cliente
                  </Link>
                )}
                {(c.status === "pendente" || c.status === "vencida" || c.status === "analise") && (
                  <form action={marcarCobrancaPaga}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="rounded-lg border border-folha px-3 py-2 text-sm font-semibold text-folha">
                      Recebi fora do site
                    </button>
                  </form>
                )}
                {aberta && (
                  <form action={cancelarCobranca}>
                    <input type="hidden" name="id" value={c.id} />
                    <BotaoCancelarCobranca />
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function estiloDoStatus(status: string): string {
  switch (status) {
    case "paga":
      return "bg-folha/15 text-folha";
    case "analise":
      return "bg-amber-100 text-amber-800";
    case "vencida":
      return "bg-red-100 text-red-700";
    case "cancelada":
    case "estornada":
      return "bg-marfim text-tinta/60";
    default:
      return "bg-cobre/15 text-cobre";
  }
}
