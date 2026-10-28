import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { filtroDaAtendente, formatarData, linkDaAtendente, mesmaAtendente, resumoDasAtendentes, SEM_ATENDENTE } from "@/lib/documentos";
import { sessaoAtual, veTudo } from "@/lib/painel-auth";
import AtualizarSozinho from "@/components/AtualizarSozinho";
import CopiarLink from "@/components/CopiarLink";
import { gerarLink, sair } from "./actions";

const ABAS = [
  { status: "enviado", rotulo: "Para conferir" },
  { status: "aguardando", rotulo: "Esperando o cliente" },
  { status: "conferido", rotulo: "Conferidos" },
] as const;

function endereco(status: string, atendente: string | null) {
  const busca = new URLSearchParams();
  if (atendente) busca.set("atendente", atendente);
  if (status !== "enviado") busca.set("aba", status);
  const texto = busca.toString();
  return texto ? `/painel?${texto}` : "/painel";
}

export default async function Painel(props: PageProps<"/painel">) {
  const busca = await props.searchParams;
  const sessao = await sessaoAtual();
  if (!sessao) redirect(typeof busca.atendente === "string" ? "/painel/login?atendente=1" : "/painel/login");
  const status = ABAS.find((a) => a.status === busca.aba)?.status ?? "enviado";
  // a atendente só vê os clientes dela, não importa o que venha no endereço;
  // gestor e supervisão escolhem uma atendente por vez
  const geral = veTudo(sessao);
  const atendente =
    sessao.gestor || sessao.atendente.veTodos
      ? typeof busca.atendente === "string" && busca.atendente.trim()
        ? busca.atendente.trim()
        : null
      : sessao.atendente.nome;

  if (geral && !atendente) return <ListaDeAtendentes ehGestor={sessao.gestor} nome={sessao.atendente?.nome ?? null} />;

  const semAtendente = atendente === SEM_ATENDENTE;
  const filtroAtendente = semAtendente ? { atendente: null } : filtroDaAtendente(atendente);

  const [solicitacoes, contagem] = await Promise.all([
    prisma.solicitacaoDocumento.findMany({
      where: { status, ...filtroAtendente },
      orderBy: status === "aguardando" ? { criadoEm: "desc" } : { enviadoEm: "desc" },
      take: 200,
      include: { _count: { select: { fotos: true } } },
    }),
    prisma.solicitacaoDocumento.groupBy({ by: ["status"], where: filtroAtendente, _count: true }),
  ]);
  const total = (s: string) => contagem.find((c) => c.status === s)?._count ?? 0;

  // o gestor já encontra aqui o link individual da atendente, para mandar a ela
  let linkIndividual: string | null = null;
  if (sessao.gestor && atendente && !semAtendente) {
    const cadastrada = (await prisma.atendente.findMany()).find((a) => mesmaAtendente(a.nome, atendente));
    if (cadastrada) {
      const h = await headers();
      const origem =
        process.env.APP_URL?.trim().replace(/\/+$/, "") || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
      linkIndividual = linkDaAtendente(cadastrada.chave, origem);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-6">
      <AtualizarSozinho />

      {geral ? (
        <div className="mb-5">
          <Link href="/painel" className="text-sm text-tinta/60 underline">
            ← Todas as atendentes
          </Link>
          <h1 className="mt-2 font-marca text-3xl font-bold text-vinho">{atendente}</h1>
          {linkIndividual && (
            <div className="mt-3 rounded-xl bg-marfim px-4 py-3">
              <p className="text-sm font-semibold">Link individual de {atendente} (só para ela, sem senha):</p>
              <p className="mt-1 break-all font-mono text-sm">{linkIndividual}</p>
              <div className="mt-2">
                <CopiarLink
                  url={linkIndividual}
                  mensagem={`${atendente?.split(" ")[0]}, este é o seu acesso ao painel de documentos. Salve nos favoritos e não passe para ninguém 👇\n${linkIndividual}`}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="mb-5 rounded-xl bg-marfim px-4 py-3">
          Olá, <strong>{atendente}</strong>! Aqui aparecem só os seus clientes. Salve esta página nos favoritos do
          celular para abrir direto aqui.
        </p>
      )}

      <p className="mb-4 text-sm">
        <Link href="/painel/cobrancas" className="font-semibold text-vinho underline">
          Cobranças
        </Link>{" "}
        <span className="text-tinta/60">· receber por Pix ou cartão pelo link</span>
      </p>

      {!semAtendente && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-marca text-2xl font-bold text-vinho">Pedir documentos a um cliente</h2>
          <form action={gerarLink} className="mt-4 grid gap-3 sm:grid-cols-2">
            {geral && <input type="hidden" name="atendente" value={atendente ?? ""} />}
            <label>
              <span className="text-sm font-medium">Nome do cliente</span>
              <input name="nome" required className="mt-1 w-full rounded-lg border border-marfim px-3 py-3 text-lg" />
            </label>
            <label>
              <span className="text-sm font-medium">WhatsApp (com DDD)</span>
              <input
                name="telefone"
                required
                inputMode="tel"
                placeholder="11 99999-8888"
                className="mt-1 w-full rounded-lg border border-marfim px-3 py-3 text-lg"
              />
            </label>
            <button className="rounded-lg bg-vinho px-5 py-3 text-lg font-semibold text-white sm:col-span-2 sm:justify-self-start">
              Criar link
            </button>
          </form>
        </section>
      )}

      <nav className="mt-6 flex flex-wrap gap-2">
        {ABAS.map((a) => (
          <Link
            key={a.status}
            href={endereco(a.status, geral ? atendente : null)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              status === a.status ? "bg-vinho text-white" : "bg-white text-tinta"
            }`}
          >
            {a.rotulo} ({total(a.status)})
          </Link>
        ))}
      </nav>

      <ul className="mt-4 divide-y divide-marfim overflow-hidden rounded-2xl bg-white shadow-sm">
        {solicitacoes.length === 0 && (
          <li className="p-5 text-tinta/60">
            {status === "enviado" ? "Nenhum documento novo para conferir." : "Nada por aqui."}
          </li>
        )}
        {solicitacoes.map((s) => (
          <li key={s.id}>
            <Link href={`/painel/${s.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-creme">
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{s.nome ?? "Sem nome"}</p>
                <p className="text-sm text-tinta/60">{s.telefone ?? "sem telefone"}</p>
              </div>
              <div className="shrink-0 text-right text-sm text-tinta/60">
                <p>{status === "aguardando" ? `Link criado ${formatarData(s.criadoEm)}` : `Recebido ${formatarData(s.enviadoEm)}`}</p>
                <p>{s._count.fotos} de 3 fotos</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <form action={sair} className="mt-8 text-center">
        <button className="text-sm text-tinta/60 underline">Sair do painel</button>
      </form>
    </main>
  );
}

// Gestor e supervisão: o nome de cada atendente com a situação dos clientes dela
async function ListaDeAtendentes({ ehGestor, nome }: { ehGestor: boolean; nome: string | null }) {
  const resumo = await resumoDasAtendentes();
  const cadastradas = resumo.filter((r) => r.cadastrada);
  const outras = resumo.filter((r) => !r.cadastrada);

  return (
    <main className="mx-auto max-w-4xl px-5 py-6">
      <AtualizarSozinho />

      {nome && (
        <p className="mb-5 rounded-xl bg-marfim px-4 py-3">
          Olá, <strong>{nome}</strong>! Toque no nome de uma atendente para ver e cuidar dos clientes dela. Salve esta
          página nos favoritos do celular para abrir direto aqui.
        </p>
      )}
      {ehGestor && (
        <p className="mb-4 text-sm">
          <Link href="/painel/atendentes" className="font-semibold text-vinho underline">
            Links das atendentes
          </Link>{" "}
          <span className="text-tinta/60">· cada uma entra pelo link dela e vê só os clientes dela</span>
        </p>
      )}
      <p className="mb-4 text-sm">
        <Link href="/painel/cobrancas" className="font-semibold text-vinho underline">
          Cobranças
        </Link>{" "}
        <span className="text-tinta/60">· Pix e cartão pelo Asaas</span>
      </p>

      <h1 className="font-marca text-3xl font-bold text-vinho">Atendentes</h1>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {cadastradas.map((r) => (
          <CartaoAtendente key={r.nome} resumo={r} />
        ))}
      </ul>

      {outras.length > 0 && (
        <>
          <h2 className="mt-8 font-semibold text-tinta/70">Outros nomes que vieram da planilha</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {outras.map((r) => (
              <CartaoAtendente key={r.nome} resumo={r} />
            ))}
          </ul>
        </>
      )}

      <form action={sair} className="mt-8 text-center">
        <button className="text-sm text-tinta/60 underline">Sair do painel</button>
      </form>
    </main>
  );
}

function CartaoAtendente({
  resumo,
}: {
  resumo: { nome: string; paraConferir: number; esperando: number; conferidos: number };
}) {
  return (
    <li>
      <Link
        href={endereco("enviado", resumo.nome)}
        className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm hover:bg-creme"
      >
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{resumo.nome}</p>
          <p className="text-sm text-tinta/60">
            {resumo.esperando} esperando · {resumo.conferidos} conferidos
          </p>
        </div>
        {resumo.paraConferir > 0 ? (
          <span className="shrink-0 rounded-full bg-cobre px-3 py-1 text-sm font-bold text-white">
            {resumo.paraConferir} para conferir
          </span>
        ) : (
          <span className="shrink-0 text-xl text-tinta/40" aria-hidden>
            ›
          </span>
        )}
      </Link>
    </li>
  );
}
