import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chaveApiConfere, podeVer, sessaoAtual } from "@/lib/painel-auth";
import { criarCobranca, mensagemWhatsAppCobranca, urlDaCobranca } from "@/lib/cobrancas";

// Cria a cobrança (o pagamento em si só nasce quando o cliente escolhe Pix ou cartão)
// Aceita sessão do painel ou a mesma chave Bearer usada pela IA/n8n em DOCUMENTOS_API_KEY.
export async function POST(req: Request) {
  const sessao = await sessaoAtual();
  const porChave = chaveApiConfere(req);
  if (!sessao && !porChave) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const corpo = await req.json().catch(() => null);
  if (!corpo || typeof corpo !== "object") {
    return NextResponse.json({ erro: "envio inválido" }, { status: 400 });
  }
  const dados = corpo as Record<string, unknown>;

  // A atendente só cria para ela mesma; gestor e supervisão escolhem (ou usam a chave)
  let atendente: string | null = null;
  if (sessao?.gestor || (sessao && sessao.atendente.veTodos)) {
    if (typeof dados.atendente === "string" && dados.atendente.trim()) atendente = dados.atendente.trim().slice(0, 60);
  } else if (sessao) {
    atendente = sessao.atendente.nome;
  }

  if (sessao && typeof dados.solicitacaoId === "string" && dados.solicitacaoId) {
    const solicitacao = await prisma.solicitacaoDocumento.findUnique({
      where: { id: dados.solicitacaoId },
      select: { atendente: true },
    });
    if (!solicitacao || !podeVer(sessao, solicitacao.atendente)) {
      return NextResponse.json({ erro: "cliente não encontrado" }, { status: 404 });
    }
    // A cobrança herda a atendente do cliente quando quem cria é o gestor
    if (!atendente) atendente = solicitacao.atendente;
  }

  const resultado = await criarCobranca(dados, { atendente });
  if (!resultado.ok) return NextResponse.json({ erro: resultado.erro }, { status: 400 });

  const cobranca = resultado.cobranca;
  const link = urlDaCobranca(req, cobranca);
  return NextResponse.json(
    {
      ok: true,
      cobranca,
      link,
      mensagem: mensagemWhatsAppCobranca(cobranca.nome, link, cobranca.valor),
    },
    { status: 201 },
  );
}
