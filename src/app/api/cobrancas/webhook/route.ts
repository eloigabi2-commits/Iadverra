import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aplicarPagamentoAsaas, webhookAutorizado } from "@/lib/cobrancas";
import { consultarPagamento, type PagamentoAsaas } from "@/lib/asaas";

export const dynamic = "force-dynamic";

type EventoAsaas = {
  id?: string;
  event?: string;
  payment?: {
    id?: string;
    status?: string;
    billingType?: string;
    externalReference?: string | null;
    invoiceUrl?: string | null;
    creditCard?: { creditCardNumber?: string; creditCardBrand?: string } | null;
  } | null;
};

// Recebe os avisos do Asaas. Configure a URL em Asaas > Integrações > Webhooks:
//   https://SEU-DOMINIO/api/cobrancas/webhook
// e o mesmo token de ASAAS_WEBHOOK_TOKEN no campo "Token de autenticação".
export async function POST(req: Request) {
  if (!process.env.ASAAS_WEBHOOK_TOKEN?.trim()) {
    return NextResponse.json({ erro: "webhook não configurado" }, { status: 503 });
  }
  if (!webhookAutorizado(req)) {
    return NextResponse.json({ erro: "token inválido" }, { status: 401 });
  }

  const corpo = (await req.json().catch(() => null)) as EventoAsaas | null;
  if (!corpo?.id || !corpo.event) {
    return NextResponse.json({ erro: "evento inválido" }, { status: 400 });
  }

  const pagamento = corpo.payment ?? null;
  const pagamentoId = pagamento?.id ?? null;

  let cobranca = pagamentoId
    ? await prisma.cobranca.findUnique({ where: { asaasPaymentId: pagamentoId } })
    : null;
  if (!cobranca && pagamento?.externalReference) {
    cobranca = await prisma.cobranca.findUnique({ where: { id: pagamento.externalReference } });
  }

  // O id do evento é único: reenvio do Asaas não muda nada duas vezes
  try {
    await prisma.asaasEvento.create({
      data: {
        id: corpo.id,
        evento: corpo.event.slice(0, 100),
        pagamentoId,
        cobrancaId: cobranca?.id ?? null,
      },
    });
  } catch (erro) {
    if ((erro as { code?: string }).code === "P2002") {
      return NextResponse.json({ ok: true, repetido: true });
    }
    throw erro;
  }

  if (!cobranca || !pagamentoId) return NextResponse.json({ ok: true });

  // Consulta o pagamento para não confiar só no corpo do webhook
  try {
    const atual = await consultarPagamento(pagamentoId);
    await aplicarPagamentoAsaas(cobranca.id, atual);
  } catch {
    // Asaas fora do ar na hora do aviso: aplica o status que veio no evento
    if (pagamento?.status) await aplicarPagamentoAsaas(cobranca.id, pagamento as PagamentoAsaas);
  }

  return NextResponse.json({ ok: true });
}
