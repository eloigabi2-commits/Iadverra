import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatarValor } from "@/lib/cobrancas";
import { formatarData, nomeEscritorio } from "@/lib/documentos";
import { clienteAtual, creditoConfigurado } from "@/lib/credito-auth";
import { corDoPedido, rotuloDoPedido } from "@/lib/credito";
import BotaoEnviar from "@/components/BotaoEnviar";
import { entrar, sair } from "./actions";

export const metadata: Metadata = {
  title: "Crédito",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function telefoneBonito(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  const local = digitos.startsWith("55") ? digitos.slice(2) : digitos;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return telefone;
}

export default async function Page(props: PageProps<"/credito">) {
  const busca = await props.searchParams;
  const erro = typeof busca.erro === "string" ? busca.erro : null;
  const cliente = await clienteAtual();

  if (!cliente) {
    return (
      <main className="flex flex-1 items-center justify-center bg-creme px-5 py-10 text-tinta">
        <div className="w-full max-w-md">
          <p className="font-marca text-2xl font-bold text-vinho">{nomeEscritorio()}</p>
          <h1 className="mt-6 font-marca text-3xl font-bold text-vinho">Crédito do cliente</h1>
          <p className="mt-2 text-tinta/70">
            Entre com o seu nome, e-mail e WhatsApp para adicionar fundos e acompanhar os seus pedidos.
          </p>

          {!creditoConfigurado() && (
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-amber-900">
              O portal está sendo configurado. Tente novamente mais tarde.
            </p>
          )}
          {erro && <p className="mt-4 rounded-lg bg-red-50 p-3 text-red-800">{erro}</p>}

          <form action={entrar} className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow-sm">
            <label className="block">
              <span className="text-sm font-medium">Nome completo</span>
              <input
                name="nome"
                required
                autoComplete="name"
                className="mt-1 w-full rounded-lg border border-marfim bg-white px-3 py-3 text-lg"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">E-mail</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mt-1 w-full rounded-lg border border-marfim bg-white px-3 py-3 text-lg"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">WhatsApp com DDD</span>
              <input
                name="telefone"
                type="tel"
                required
                autoComplete="tel"
                inputMode="tel"
                placeholder="(11) 99999-9999"
                className="mt-1 w-full rounded-lg border border-marfim bg-white px-3 py-3 text-lg"
              />
            </label>
            <BotaoEnviar
              className="w-full rounded-lg bg-vinho px-4 py-3 text-lg font-semibold text-white disabled:opacity-60"
              enviando="Entrando..."
            >
              Entrar
            </BotaoEnviar>
            <p className="text-center text-xs text-tinta/50">
              Você entra uma vez. Este navegador lembra de você nas próximas visitas.
            </p>
          </form>
        </div>
      </main>
    );
  }

  const pedidos = await prisma.pedidoCredito.findMany({
    where: { contaId: cliente.id },
    orderBy: { criadoEm: "desc" },
    take: 50,
    select: {
      id: true,
      valor: true,
      status: true,
      formaPagamento: true,
      prazo: true,
      criadoEm: true,
    },
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 text-tinta">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-marca text-2xl font-bold text-vinho">{nomeEscritorio()}</p>
          <h1 className="mt-3 font-marca text-3xl font-bold text-vinho">Olá, {cliente.nome.split(" ")[0]}!</h1>
          <p className="mt-1 text-sm text-tinta/60">
            {cliente.email} · {telefoneBonito(cliente.telefone)}
          </p>
        </div>
        <form action={sair}>
          <button className="rounded-lg border border-marfim px-3 py-2 text-sm text-tinta/60">Sair</button>
        </form>
      </div>

      {erro && <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-800">{erro}</p>}

      <Link
        href="/credito/adicionar"
        className="mt-6 flex items-center justify-between rounded-2xl bg-vinho px-5 py-4 text-white shadow-sm"
      >
        <span>
          <span className="block text-lg font-semibold">Adicionar fundos</span>
          <span className="text-sm text-white/70">Pague com Pix ou cartão de crédito</span>
        </span>
        <span aria-hidden className="text-2xl">
          +
        </span>
      </Link>

      <h2 className="mt-8 text-lg font-semibold">Seus pedidos</h2>
      {pedidos.length === 0 ? (
        <p className="mt-3 rounded-xl bg-marfim px-4 py-4 text-sm text-tinta/60">
          Você ainda não fez nenhum pedido de crédito.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-marfim rounded-xl border border-marfim bg-white">
          {pedidos.map((pedido) => (
            <li key={pedido.id}>
              <Link href={`/credito/pedido/${pedido.id}`} className="flex items-center justify-between gap-4 px-4 py-3">
                <span>
                  <span className="block font-semibold">{formatarValor(Number(pedido.valor))}</span>
                  <span className="text-xs text-tinta/50">
                    {formatarData(pedido.criadoEm)} · {pedido.formaPagamento === "cartao" ? "Cartão" : "Pix"} ·{" "}
                    {pedido.prazo}
                  </span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${corDoPedido(pedido.status)}`}>
                  {rotuloDoPedido(pedido.status)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
