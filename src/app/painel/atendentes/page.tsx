import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { linkDaAtendente, listarAtendentes, mesmaAtendente } from "@/lib/documentos";
import { sessaoAtual } from "@/lib/painel-auth";
import CopiarLink from "@/components/CopiarLink";
import BotaoConfirmar from "@/components/BotaoConfirmar";
import { cadastrarAtendente, removerAtendente, trocarLinkDaAtendente } from "../actions";

// Só o gestor: o link pessoal de cada atendente, para mandar a ela
export default async function Atendentes() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/painel/login");
  if (!sessao.gestor) notFound();

  const [cadastradas, comClientes] = await Promise.all([
    prisma.atendente.findMany({ orderBy: { nome: "asc" } }),
    listarAtendentes(),
  ]);
  // nomes que vieram da planilha e ainda não têm link
  const semLink = comClientes.filter((c) => !cadastradas.some((a) => mesmaAtendente(a.nome, c.nome)));

  const h = await headers();
  const origem = process.env.APP_URL?.trim().replace(/\/+$/, "") || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  return (
    <main className="mx-auto max-w-4xl px-5 py-6">
      <Link href="/painel" className="text-sm text-tinta/60 underline">
        ← Voltar para o painel
      </Link>
      <h1 className="mt-3 font-marca text-3xl font-bold text-vinho">Links das atendentes</h1>
      <p className="mt-2 text-tinta/70">
        Cada atendente entra pelo link dela, sem senha, e vê só os clientes dela. Mande o link no WhatsApp de cada
        uma e peça para salvar nos favoritos. Se um link vazar, toque em <strong>Trocar link</strong>: o antigo para
        de funcionar na hora.
      </p>

      <ul className="mt-5 divide-y divide-marfim overflow-hidden rounded-2xl bg-white shadow-sm">
        {cadastradas.length === 0 && <li className="p-5 text-tinta/60">Nenhuma atendente cadastrada.</li>}
        {cadastradas.map((a) => {
          const url = linkDaAtendente(a.chave, origem);
          const primeiroNome = a.nome.split(" ")[0];
          return (
            <li key={a.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-semibold">{a.nome}</p>
                <div className="flex gap-2 text-sm">
                  <form action={trocarLinkDaAtendente}>
                    <input type="hidden" name="id" value={a.id} />
                    <BotaoConfirmar
                      pergunta={`Trocar o link de ${a.nome}? O link antigo para de funcionar e você precisa mandar o novo para ela.`}
                      className="rounded-lg border border-cobre px-2 py-1 font-semibold text-cobre"
                    >
                      Trocar link
                    </BotaoConfirmar>
                  </form>
                  <form action={removerAtendente}>
                    <input type="hidden" name="id" value={a.id} />
                    <BotaoConfirmar
                      pergunta={`Tirar o acesso de ${a.nome}? O link dela para de funcionar na hora.`}
                      className="rounded-lg border border-red-300 px-2 py-1 font-semibold text-red-700"
                    >
                      Tirar acesso
                    </BotaoConfirmar>
                  </form>
                </div>
              </div>
              <p className="mt-1 break-all font-mono text-sm text-tinta/70">{url}</p>
              <div className="mt-2">
                <CopiarLink
                  url={url}
                  mensagem={`${primeiroNome}, este é o seu acesso ao painel de documentos. Salve nos favoritos e não passe para ninguém 👇\n${url}`}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {semLink.length > 0 && (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Têm clientes, mas ainda não têm link</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {semLink.map((c) => (
              <form key={c.nome} action={cadastrarAtendente}>
                <input type="hidden" name="nome" value={c.nome} />
                <button className="rounded-full bg-marfim px-3 py-1.5 text-sm font-semibold">+ {c.nome}</button>
              </form>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Nova atendente</h2>
        <p className="mt-1 text-sm text-tinta/60">Use o mesmo nome da planilha de distribuição.</p>
        <form action={cadastrarAtendente} className="mt-3 flex gap-2">
          <input name="nome" required className="w-full rounded-lg border border-marfim px-3 py-3 text-lg" />
          <button className="rounded-lg bg-vinho px-5 py-3 font-semibold text-white">Criar link</button>
        </form>
      </section>
    </main>
  );
}
