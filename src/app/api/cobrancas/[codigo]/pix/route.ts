import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buscarCobrancaPorCodigo,
  dataDoAsaas,
  limparTentativaPendente,
  sincronizarCobranca,
  vencimentoPadrao,
} from "@/lib/cobrancas";
import { AsaasError, asaasConfigurado, criarPagamentoPix, garantirClienteDaCobranca, obterPix } from "@/lib/asaas";

export const dynamic = "force-dynamic";

function erroAsaas(erro: unknown) {
  if (erro instanceof AsaasError) {
    const semConfiguracao = erro.message.includes("ASAAS_API_KEY");
    return NextResponse.json({ erro: erro.message, detalhes: erro.detalhes }, { status: semConfiguracao ? 503 : 400 });
  }
  return NextResponse.json({ erro: "não foi possível gerar o Pix agora" }, { status: 500 });
}

// Público: gera (ou reaproveita) o Pix da cobrança para o cliente escanear
export async function POST(_req: Request, ctx: RouteContext<"/api/cobrancas/[codigo]/pix">) {
  if (!asaasConfigurado()) {
    return NextResponse.json({ erro: "pagamento online ainda não configurado" }, { status: 503 });
  }

  const { codigo } = await ctx.params;
  const encontrada = await buscarCobrancaPorCodigo(codigo);
  if (!encontrada) return NextResponse.json({ erro: "cobrança não encontrada" }, { status: 404 });

  const cobranca = await sincronizarCobranca(encontrada);
  if (cobranca.status === "paga") {
    return NextResponse.json({ erro: "essa cobrança já foi paga", pago: true }, { status: 409 });
  }
  if (cobranca.status === "estornada" || cobranca.status === "cancelada") {
    return NextResponse.json({ erro: "essa cobrança não está mais disponível" }, { status: 410 });
  }

  // Pix ainda válido: devolve o mesmo para o cliente não pagar dois
  const agora = Date.now();
  if (
    cobranca.pixPayload &&
    cobranca.pixImagem &&
    cobranca.asaasPaymentId &&
    (!cobranca.pixExpiraEm || cobranca.pixExpiraEm.getTime() > agora)
  ) {
    return NextResponse.json({
      ok: true,
      pix: {
        payload: cobranca.pixPayload,
        imagem: cobranca.pixImagem,
        expiraEm: cobranca.pixExpiraEm?.toISOString() ?? null,
      },
    });
  }

  try {
    const podeSeguir = await limparTentativaPendente(cobranca);
    if (!podeSeguir) {
      const atualizada = await buscarCobrancaPorCodigo(codigo);
      const paga = atualizada?.status === "paga";
      return NextResponse.json(
        { erro: paga ? "essa cobrança já foi paga" : "seu pagamento já está em análise", pago: paga },
        { status: 409 },
      );
    }
    const customer = await garantirClienteDaCobranca(cobranca);
    const pagamento = await criarPagamentoPix({
      customer,
      value: Number(cobranca.valor),
      dueDate: vencimentoPadrao(),
      description: cobranca.descricao.slice(0, 500),
      externalReference: cobranca.id,
    });
    const pix = await obterPix(pagamento.id);
    const expiraEm = dataDoAsaas(pix.expirationDate);

    await prisma.cobranca.update({
      where: { id: cobranca.id },
      data: {
        asaasPaymentId: pagamento.id,
        formaPagamento: "PIX",
        invoiceUrl: pagamento.invoiceUrl ?? null,
        pixPayload: pix.payload,
        pixImagem: pix.encodedImage,
        pixExpiraEm: expiraEm,
      },
    });

    return NextResponse.json({
      ok: true,
      pix: { payload: pix.payload, imagem: pix.encodedImage, expiraEm: expiraEm?.toISOString() ?? null },
    });
  } catch (erro) {
    return erroAsaas(erro);
  }
}
