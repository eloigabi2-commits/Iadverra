import { NextRequest, NextResponse } from "next/server";
import { criarSolicitacao, linkDaSolicitacao } from "@/lib/documentos";
import { chaveApiConfere, COOKIE_PAINEL, sessaoValida } from "@/lib/painel-auth";

// Usado pela IA (ou n8n) para gerar o link de envio de documentos de um lead.
// Autenticação: header "Authorization: Bearer <DOCUMENTOS_API_KEY>".
export async function POST(req: NextRequest) {
  const autorizado =
    chaveApiConfere(req) || sessaoValida(req.cookies.get(COOKIE_PAINEL)?.value);
  if (!autorizado) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const corpo = await req.json().catch(() => ({}));
  const solicitacao = await criarSolicitacao(corpo ?? {});

  return NextResponse.json({
    id: solicitacao.id,
    url: linkDaSolicitacao(solicitacao.token, req),
    status: solicitacao.status,
  });
}
