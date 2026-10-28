import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import TelaCobranca from "@/components/TelaCobranca";
import BotaoEnviar from "@/components/BotaoEnviar";
import { prisma } from "@/lib/prisma";
import { dadosPublicos, formatarValor } from "@/lib/cobrancas";
import { nomeEscritorio } from "@/lib/documentos";
import { clienteAtual } from "@/lib/credito-auth";
import { reenviarPedido } from "../../actions";

export const metadata: Metadata = {
  title: "Pedido de crédito",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function baseDoSite(cabecalhos: Headers): string {
  const configurada = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (configurada) return configurada;
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host");
  if (!host) return "";
  const protocolo =
    cabecalhos.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${protocolo}://${host}`;
}

export default async function Page(props: PageProps<"/credito/pedido/[id]">) {
  const cliente = await clienteAtual();
  if (!cliente) redirect("/credito");

  const { id } = await props.params;
  const pedido = await prisma.pedidoCredito.findUnique({
    where: { id },
    include: { conta: true, cobranca: true },
  });
  if (!pedido || pedido.contaId !== cliente.id) notFound();

  const pago = pedido.status === "pago" || pedido.cobranca?.status === "paga";

  if (pedido.status === "erro_webhook" && !pago) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-8 text-tinta">
        <Link href="/credito" className="text-sm text-tinta/60 underline">
          ← Voltar
        </Link>
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="font-marca text-2xl font-bold text-vinho">Não conseguimos registrar o pedido</h1>
          <p className="mt-2 text-tinta/70">
            O pedido de {formatarValor(Number(pedido.valor))} foi criado, mas não chegou até a nossa equipe. Tente enviar de
            novo.
          </p>
          <p className="mt-3 rounded-lg bg-marfim p-3 text-xs text-tinta/50">
            Protocolo {pedido.id.slice(-8).toUpperCase()}
          </p>
          <form action={reenviarPedido} className="mt-5">
            <input type="hidden" name="id" value={pedido.id} />
            <BotaoEnviar className="w-full rounded-lg bg-vinho px-4 py-3 text-lg font-semibold text-white disabled:opacity-60">
              Enviar de novo
            </BotaoEnviar>
          </form>
          <p className="mt-3 text-center text-xs text-tinta/50">
            Se o problema continuar, fale com a equipe pelo WhatsApp.
          </p>
        </div>
      </main>
    );
  }

  if (!pedido.cobranca) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-8 text-tinta">
        <Link href="/credito" className="text-sm text-tinta/60 underline">
          ← Voltar
        </Link>
        <p className="mt-6 rounded-xl bg-marfim px-4 py-4 text-sm text-tinta/70">
          Este pedido ainda está sendo preparado. Volte em instantes.
        </p>
      </main>
    );
  }

  const cobranca = dadosPublicos(pedido.cobranca);
  const base = baseDoSite(await headers());
  const linkPublico = base ? `${base}/pagar/${pedido.cobranca.codigo}` : undefined;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-6 text-tinta">
      <Link href="/credito" className="text-sm text-tinta/60 underline">
        ← Meus pedidos
      </Link>
      <div className="mt-4">
        <TelaCobranca
          cobranca={cobranca}
          escritorio={nomeEscritorio()}
          autoPix={pedido.formaPagamento === "pix"}
          formaInicial={pedido.formaPagamento === "cartao" ? "cartao" : "pix"}
          emailInicial={pedido.conta.email}
          telefoneInicial={pedido.conta.telefone}
          cpfInicial={pedido.cobranca.cpfCnpj}
          linkPublico={linkPublico}
        />
      </div>
    </div>
  );
}
