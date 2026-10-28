import { conexaoDaRequisicao, lerPendente, salvarSessao } from "@/lib/instagram/conexao";
import { dentroDoLimite, ipDaRequisicao, json, preflight } from "@/lib/instagram/http";
import { verificarCodigo2fa } from "@/lib/instagram/instagram-api";

export const maxDuration = 60;

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request) {
  if (!dentroDoLimite(`verificar:${ipDaRequisicao(req)}`, 12, 10 * 60_000)) {
    return json({ erro: "Muitas tentativas. Espere alguns minutos." }, 429);
  }

  const conexao = await conexaoDaRequisicao(req);
  if (!conexao) return json({ erro: "Entre de novo com sua conta do Instagram." }, 401);

  const pendente = lerPendente(conexao);
  if (!pendente) return json({ erro: "A confirmação expirou. Entre de novo." }, 400);

  let corpo: { codigo?: unknown };
  try {
    corpo = (await req.json()) as typeof corpo;
  } catch {
    return json({ erro: "Não entendi o pedido." }, 400);
  }

  const codigo = typeof corpo.codigo === "string" ? corpo.codigo.replace(/\D/g, "") : "";
  if (codigo.length < 4 || codigo.length > 10) {
    return json({ erro: "Digite o código de confirmação do Instagram." }, 400);
  }

  const resultado = await verificarCodigo2fa(pendente, codigo);

  if (resultado.tipo === "ok") {
    await salvarSessao(conexao.id, resultado.sessao);
    return json({ ok: true, usuario: resultado.sessao.username });
  }

  if (resultado.tipo === "desafio") {
    return json({ ok: false, etapa: "desafio", erro: resultado.mensagem }, 409);
  }

  if (resultado.tipo === "2fa") {
    return json({ ok: false, etapa: "2fa", mensagem: resultado.mensagem });
  }

  if (resultado.status === 401 && /incorreto/i.test(resultado.mensagem)) {
    return json({ erro: resultado.mensagem }, 401);
  }

  return json({ erro: resultado.mensagem }, resultado.status);
}
