import { NextRequest, NextResponse } from "next/server";
import { criarSolicitacao, linkDaSolicitacao, mensagemWhatsApp, urlBase } from "@/lib/documentos";
import { chaveApiConfere, sessaoAtual } from "@/lib/painel-auth";

const MAXIMO_POR_LOTE = 500;

type Lead = { nome?: unknown; telefone?: unknown; chat_number?: unknown; referencia?: unknown; atendente?: unknown };

async function gerar(lead: Lead, req: NextRequest) {
  const solicitacao = await criarSolicitacao({
    nome: lead.nome,
    // aceita o chat_number do ChatGuru no lugar do telefone
    telefone: lead.telefone ?? lead.chat_number,
    referencia: lead.referencia,
    atendente: lead.atendente,
  });
  const url = linkDaSolicitacao(solicitacao, urlBase(req));
  return {
    id: solicitacao.id,
    url,
    mensagem: mensagemWhatsApp(solicitacao.nome, url, { atendente: solicitacao.atendente }),
    status: solicitacao.status,
    telefone: solicitacao.telefone,
    atendente: solicitacao.atendente,
  };
}

// Usado pela IA (ou n8n) para gerar o link de envio de documentos.
// Autenticação: header "Authorization: Bearer <DOCUMENTOS_API_KEY>".
// Um lead: { nome, telefone, referencia } → { id, url, mensagem, ... }
// Em massa: { leads: [{ nome, telefone }, ...] } → { resultados: [...] }
export async function POST(req: NextRequest) {
  // só a IA/n8n (chave da API) e o gestor criam links para qualquer atendente
  const autorizado = chaveApiConfere(req) || (await sessaoAtual())?.gestor === true;
  if (!autorizado) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const corpo = await req.json().catch(() => ({}));

  if (Array.isArray(corpo?.leads)) {
    if (corpo.leads.length > MAXIMO_POR_LOTE) {
      return NextResponse.json({ erro: `no máximo ${MAXIMO_POR_LOTE} leads por vez` }, { status: 400 });
    }
    const resultados = [];
    for (const lead of corpo.leads as Lead[]) resultados.push(await gerar(lead ?? {}, req));
    return NextResponse.json({ resultados });
  }

  return NextResponse.json(await gerar(corpo ?? {}, req));
}
