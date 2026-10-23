import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatarData } from "@/lib/documentos";
import { estaLogado } from "@/lib/painel-auth";
import AtualizarSozinho from "@/components/AtualizarSozinho";
import { gerarLink, sair } from "./actions";

const ABAS = [
  { status: "enviado", rotulo: "Para conferir" },
  { status: "aguardando", rotulo: "Esperando o cliente" },
  { status: "conferido", rotulo: "Conferidos" },
] as const;

export default async function Painel(props: PageProps<"/painel">) {
  if (!(await estaLogado())) redirect("/painel/login");
  const { aba } = await props.searchParams;
  const status = ABAS.find((a) => a.status === aba)?.status ?? "enviado";

  const [solicitacoes, contagem] = await Promise.all([
    prisma.solicitacaoDocumento.findMany({
      where: { status },
      orderBy: status === "aguardando" ? { criadoEm: "desc" } : { enviadoEm: "desc" },
      take: 200,
      include: { _count: { select: { fotos: true } } },
    }),
    prisma.solicitacaoDocumento.groupBy({ by: ["status"], _count: true }),
  ]);
  const total = (s: string) => contagem.find((c) => c.status === s)?._count ?? 0;

  return (
    <main className="mx-auto max-w-4xl px-5 py-6">
      <AtualizarSozinho />

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h1 className="font-marca text-2xl font-bold text-vinho">Pedir documentos a um cliente</h1>
        <form action={gerarLink} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
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
          <button className="rounded-lg bg-vinho px-5 py-3 text-lg font-semibold text-white">Criar link</button>
        </form>
      </section>

      <nav className="mt-6 flex flex-wrap gap-2">
        {ABAS.map((a) => (
          <Link
            key={a.status}
            href={a.status === "enviado" ? "/painel" : `/painel?aba=${a.status}`}
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
