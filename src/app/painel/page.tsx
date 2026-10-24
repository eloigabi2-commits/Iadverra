import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatarData, listarAtendentes } from "@/lib/documentos";
import { estaLogado } from "@/lib/painel-auth";
import AtualizarSozinho from "@/components/AtualizarSozinho";
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
  if (!(await estaLogado())) {
    const nome = typeof busca.atendente === "string" ? busca.atendente : "";
    redirect(nome ? `/painel/login?atendente=${encodeURIComponent(nome)}` : "/painel/login");
  }
  const status = ABAS.find((a) => a.status === busca.aba)?.status ?? "enviado";
  const atendente = typeof busca.atendente === "string" && busca.atendente.trim() ? busca.atendente.trim() : null;
  const filtroAtendente = atendente ? { atendente } : {};

  const [solicitacoes, contagem, atendentes] = await Promise.all([
    prisma.solicitacaoDocumento.findMany({
      where: { status, ...filtroAtendente },
      orderBy: status === "aguardando" ? { criadoEm: "desc" } : { enviadoEm: "desc" },
      take: 200,
      include: { _count: { select: { fotos: true } } },
    }),
    prisma.solicitacaoDocumento.groupBy({ by: ["status"], where: filtroAtendente, _count: true }),
    listarAtendentes(),
  ]);
  const total = (s: string) => contagem.find((c) => c.status === s)?._count ?? 0;

  return (
    <main className="mx-auto max-w-4xl px-5 py-6">
      <AtualizarSozinho />

      {atendentes.length > 0 && (
        <nav className="mb-5 flex flex-wrap items-center gap-2" aria-label="Atendente">
          <span className="text-sm font-semibold text-tinta/60">Atendente:</span>
          <Link
            href={endereco(status, null)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${!atendente ? "bg-tinta text-white" : "bg-white"}`}
          >
            Todas
          </Link>
          {atendentes.map((a) => (
            <Link
              key={a.nome}
              href={endereco(status, a.nome)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${
                atendente === a.nome ? "bg-tinta text-white" : "bg-white"
              }`}
            >
              {a.nome}
              {a.paraConferir > 0 && (
                <span className="rounded-full bg-cobre px-1.5 text-xs text-white">{a.paraConferir}</span>
              )}
            </Link>
          ))}
        </nav>
      )}

      {atendente && (
        <p className="mb-5 rounded-xl bg-marfim px-4 py-3 text-sm">
          Painel de <strong>{atendente}</strong>: só os clientes distribuídos para ela. Salve este endereço nos
          favoritos do celular para abrir direto aqui.
        </p>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h1 className="font-marca text-2xl font-bold text-vinho">Pedir documentos a um cliente</h1>
        <form action={gerarLink} className="mt-4 grid gap-3 sm:grid-cols-2">
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
          <label>
            <span className="text-sm font-medium">Atendente</span>
            <input
              name="atendente"
              list="lista-atendentes"
              defaultValue={atendente ?? ""}
              className="mt-1 w-full rounded-lg border border-marfim px-3 py-3 text-lg"
            />
            <datalist id="lista-atendentes">
              {atendentes.map((a) => (
                <option key={a.nome} value={a.nome} />
              ))}
            </datalist>
          </label>
          <button className="self-end rounded-lg bg-vinho px-5 py-3 text-lg font-semibold text-white">Criar link</button>
        </form>
      </section>

      <nav className="mt-6 flex flex-wrap gap-2">
        {ABAS.map((a) => (
          <Link
            key={a.status}
            href={endereco(a.status, atendente)}
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
                <p className="text-sm text-tinta/60">
                  {s.telefone ?? "sem telefone"}
                  {!atendente && s.atendente ? ` · ${s.atendente}` : ""}
                </p>
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
