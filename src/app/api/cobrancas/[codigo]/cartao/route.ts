import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buscarCobrancaPorCodigo,
  cartaoValido,
  cpfCnpjValido,
  extrairIp,
  formatarValor,
  limparTentativaPendente,
  parcelasPermitidas,
  sincronizarCobranca,
  telefoneSemPais,
  vencimentoPadrao,
} from "@/lib/cobrancas";
import {
  AsaasError,
  asaasConfigurado,
  criarPagamentoCartao,
  garantirClienteDaCobranca,
  type CartaoAsaas,
} from "@/lib/asaas";

export const dynamic = "force-dynamic";

function erroAsaas(erro: unknown) {
  if (erro instanceof AsaasError) {
    const semConfiguracao = erro.message.includes("ASAAS_API_KEY");
    // 400 na maioria é cartão recusado; a tela mostra a descrição do Asaas
    return NextResponse.json(
      { erro: erro.detalhes.join(" · ") || erro.message, detalhes: erro.detalhes },
      { status: semConfiguracao ? 503 : 400 },
    );
  }
  return NextResponse.json({ erro: "não foi possível processar o cartão agora" }, { status: 500 });
}

function texto(valor: unknown, max = 120): string {
  return typeof valor === "string" ? valor.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

// Público: cobra no cartão de crédito. O número e o CVV passam direto para o
// Asaas e nunca são gravados; no banco ficam só os 4 últimos dígitos.
export async function POST(req: Request, ctx: RouteContext<"/api/cobrancas/[codigo]/cartao">) {
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

  const corpo = await req.json().catch(() => null);
  if (!corpo || typeof corpo !== "object") return NextResponse.json({ erro: "envio inválido" }, { status: 400 });
  const dados = corpo as Record<string, unknown>;

  const nomeTitular = texto(dados.nomeTitular ?? dados.titular, 120);
  const numero = texto(dados.numero, 24).replace(/\D/g, "");
  const mes = Number.parseInt(texto(dados.mes ?? dados.expiryMonth, 2), 10);
  const anoTexto = texto(dados.ano ?? dados.expiryYear, 4);
  const cvv = texto(dados.cvv ?? dados.ccv, 4).replace(/\D/g, "");
  const cpfCnpj = texto(dados.cpfCnpj ?? dados.cpf, 20).replace(/\D/g, "");
  const cep = texto(dados.cep, 10).replace(/\D/g, "");
  const numeroEndereco = texto(dados.numeroEndereco ?? dados.addressNumber, 20) || "S/N";
  const complemento = texto(dados.complemento ?? dados.addressComplement, 80);
  const email = texto(dados.email, 160) || cobranca.email || "";
  const telefone = texto(dados.telefone ?? dados.phone, 20) || cobranca.telefone || "";
  const parcelas = Math.trunc(Number(dados.parcelas ?? dados.installments ?? 1)) || 1;

  if (nomeTitular.length < 2) return NextResponse.json({ erro: "informe o nome impresso no cartão" }, { status: 400 });
  if (!cartaoValido(numero)) return NextResponse.json({ erro: "número do cartão inválido" }, { status: 400 });
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    return NextResponse.json({ erro: "mês de validade inválido" }, { status: 400 });
  }
  const ano = anoTexto.length === 2 ? 2000 + Number(anoTexto) : Number(anoTexto);
  const agora = new Date();
  if (!Number.isInteger(ano) || ano < agora.getFullYear() || ano > agora.getFullYear() + 20) {
    return NextResponse.json({ erro: "ano de validade inválido" }, { status: 400 });
  }
  if (ano === agora.getFullYear() && mes < agora.getMonth() + 1) {
    return NextResponse.json({ erro: "cartão vencido" }, { status: 400 });
  }
  if (cvv.length < 3) return NextResponse.json({ erro: "CVV inválido" }, { status: 400 });
  if (!cpfCnpjValido(cpfCnpj)) return NextResponse.json({ erro: "CPF do titular inválido" }, { status: 400 });
  if (cep.length !== 8) return NextResponse.json({ erro: "CEP inválido" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ erro: "informe um e-mail válido" }, { status: 400 });
  }
  const telefoneDigitos = telefoneSemPais(telefone) ?? "";
  if (telefoneDigitos.length < 10) return NextResponse.json({ erro: "informe um telefone com DDD" }, { status: 400 });

  const valor = Number(cobranca.valor);
  const limiteParcelas = parcelasPermitidas(valor);
  if (parcelas < 1 || parcelas > limiteParcelas) {
    return NextResponse.json(
      { erro: `em até ${limiteParcelas}x, com parcelas de no mínimo ${formatarValor(5)}` },
      { status: 400 },
    );
  }

  const cartao: CartaoAsaas = {
    holderName: nomeTitular,
    number: numero,
    expiryMonth: String(mes).padStart(2, "0"),
    expiryYear: String(ano),
    ccv: cvv,
  };

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
    const pagamento = await criarPagamentoCartao({
      customer,
      value: valor,
      dueDate: vencimentoPadrao(),
      description: cobranca.descricao.slice(0, 500),
      externalReference: cobranca.id,
      remoteIp: extrairIp(req),
      parcelas,
      cartao,
      titular: {
        name: nomeTitular,
        email,
        cpfCnpj,
        postalCode: cep,
        addressNumber: numeroEndereco,
        addressComplement: complemento,
        phone: telefoneDigitos,
      },
    });

    await prisma.cobranca.update({
      where: { id: cobranca.id },
      data: {
        asaasPaymentId: pagamento.id,
        formaPagamento: "CREDIT_CARD",
        parcela: parcelas,
        invoiceUrl: pagamento.invoiceUrl ?? null,
        cartaoFinal: numero.slice(-4),
        cartaoBandeira: pagamento.creditCard?.creditCardBrand ?? null,
        status: pagamento.status === "CONFIRMED" || pagamento.status === "RECEIVED" ? "paga" : "analise",
        pagoEm:
          pagamento.status === "CONFIRMED" || pagamento.status === "RECEIVED" ? (cobranca.pagoEm ?? new Date()) : cobranca.pagoEm,
      },
    });

    const pago = pagamento.status === "CONFIRMED" || pagamento.status === "RECEIVED";
    return NextResponse.json({
      ok: true,
      pago,
      status: pago ? "paga" : "analise",
      invoiceUrl: pagamento.invoiceUrl ?? null,
      requerDesafio: !!pagamento.threeDSecureChallengeUrl,
      desafioUrl: pagamento.threeDSecureChallengeUrl ?? null,
      mensagem: pago
        ? "pagamento aprovado"
        : pagamento.threeDSecureChallengeUrl
          ? "o banco pediu uma confirmação extra"
          : "pagamento em análise; avisamos assim que for confirmado",
    });
  } catch (erro) {
    return erroAsaas(erro);
  }
}
