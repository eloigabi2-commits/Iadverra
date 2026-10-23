import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatarData } from "@/lib/documentos";
import { estaLogado } from "@/lib/painel-auth";
import { gerarLink, sair } from "./actions";

export default async function Painel(props: PageProps<"/painel">) {
  if (!(await estaLogado())) redirect("/painel/login");
  const { aba } = await props.searchParams;
  const status = aba === "aguardando" ? "aguardando" : "enviado";

  const [solicitacoes, contagem] = await Promise.all([
    prisma.solicitacaoDocumento.findMany({
      where: { status },
      orderBy: status === "enviado" ? { enviadoEm: "desc" } : { criadoEm: "desc" },
      take: 200,
      include: { _count: { select: { fotos: true } } },
    }),
    prisma.solicitacaoDocumento.groupBy({ by: ["status"], _count: true }),
  ]);
  const total = (s: string) => contagem.find((c) => c.status === s)?._count ?? 0;

  const aba_ = (valor: string, rotulo: string, n: number) => (
    <Link
      href={valor === "enviado" ? "/painel" : `/painel?aba=${valor}`}
      className={`rounded-lg px-3 py-2 text-sm font-semibold ${status === valor ? "bg-zinc-900 text-white" : "bg-white text-zinc-700"}`}
    >
      {rotulo} ({n})
    </Link>
  );

  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Documentos dos clientes</h1>
        <form action={sair}>
          <button className="text-sm text-zinc-600 underline">Sair</button>
        </form>
      </header>

      <form action={gerarLink} className="mt-6 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm">
        <label className="flex-1">
          <span className="text-sm font-medium">Nome do cliente</span>
          <input name="nome" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
        </label>
        <label className="flex-1">
          <span className="text-sm font-medium">WhatsApp</span>
          <input name="telefone" inputMode="tel" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
        </label>
        <button className="rounded-lg bg-green-700 px-4 py-2 font-semibold text-white">Gerar link</button>
      </form>

      <nav className="mt-6 flex gap-2">
        {aba_("enviado", "Recebidos", total("enviado"))}
        {aba_("aguardando", "Aguardando envio", total("aguardando"))}
      </nav>

      <ul className="mt-4 divide-y divide-zinc-200 overflow-hidden rounded-xl bg-white shadow-sm">
        {solicitacoes.length === 0 && <li className="p-4 text-zinc-500">Nada por aqui ainda.</li>}
        {solicitacoes.map((s) => (
          <li key={s.id}>
            <Link href={`/painel/${s.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-zinc-50">
              <div>
                <p className="font-semibold">{s.nome ?? "Sem nome"}</p>
                <p className="text-sm text-zinc-600">
                  {s.telefone ?? "sem telefone"}
                  {s.referencia ? ` · ref. ${s.referencia}` : ""}
                </p>
              </div>
              <div className="text-right text-sm text-zinc-600">
                <p>{status === "enviado" ? `Enviado ${formatarData(s.enviadoEm)}` : `Criado ${formatarData(s.criadoEm)}`}</p>
                <p>{s._count.fotos} de 3 fotos</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
