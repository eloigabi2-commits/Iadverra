import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatarData, linkDaSolicitacao, mensagemWhatsApp, ROTULO_FOTO, TIPOS_FOTO } from "@/lib/documentos";
import { estaLogado } from "@/lib/painel-auth";
import CopiarLink from "@/components/CopiarLink";
import BotaoExcluir from "@/components/BotaoExcluir";
import { excluir } from "../actions";
import { headers } from "next/headers";

export default async function Detalhe(props: PageProps<"/painel/[id]">) {
  if (!(await estaLogado())) redirect("/painel/login");
  const { id } = await props.params;

  const s = await prisma.solicitacaoDocumento.findUnique({
    where: { id },
    include: { fotos: { select: { id: true, tipo: true, tamanho: true, criadoEm: true } } },
  });
  if (!s) notFound();

  const h = await headers();
  const origem = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const url = process.env.APP_URL ? linkDaSolicitacao(s.token) : `${origem}/documentos/${s.token}`;

  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <Link href="/painel" className="text-sm text-zinc-600 underline">
        ← Voltar
      </Link>
      <h1 className="mt-4 text-2xl font-bold">{s.nome ?? "Sem nome"}</h1>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-zinc-500">WhatsApp</dt>
        <dd>{s.telefone ?? "—"}</dd>
        {s.referencia && (
          <>
            <dt className="text-zinc-500">Referência</dt>
            <dd>{s.referencia}</dd>
          </>
        )}
        <dt className="text-zinc-500">Situação</dt>
        <dd>{s.status === "enviado" ? `Enviado em ${formatarData(s.enviadoEm)}` : "Aguardando o cliente"}</dd>
        <dt className="text-zinc-500">Aceite da privacidade</dt>
        <dd>{formatarData(s.consentimentoEm)}</dd>
        <dt className="text-zinc-500">Link criado</dt>
        <dd>{formatarData(s.criadoEm)}</dd>
      </dl>

      {s.status === "aguardando" && (
        <section className="mt-6 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Link para o cliente</h2>
          <div className="mt-2">
            <CopiarLink url={url} mensagem={mensagemWhatsApp(s.nome, url)} />
          </div>
        </section>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        {TIPOS_FOTO.map((tipo) => {
          const foto = s.fotos.find((f) => f.tipo === tipo);
          return (
            <figure key={tipo} className="rounded-xl bg-white p-3 shadow-sm">
              <figcaption className="mb-2 font-semibold">{ROTULO_FOTO[tipo]}</figcaption>
              {foto ? (
                <>
                  <a href={`/api/painel/fotos/${foto.id}`} target="_blank">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/painel/fotos/${foto.id}`} alt={ROTULO_FOTO[tipo]} className="w-full rounded-lg border border-zinc-200" />
                  </a>
                  <a href={`/api/painel/fotos/${foto.id}?baixar`} className="mt-2 inline-block text-sm text-blue-700 underline">
                    Baixar
                  </a>
                </>
              ) : (
                <p className="rounded-lg bg-zinc-100 p-6 text-center text-sm text-zinc-500">Ainda não enviada</p>
              )}
            </figure>
          );
        })}
      </section>

      <form action={excluir} className="mt-8">
        <input type="hidden" name="id" value={s.id} />
        <BotaoExcluir />
      </form>
    </main>
  );
}
