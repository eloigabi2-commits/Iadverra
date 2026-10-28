import { conexaoDaRequisicao, conexaoPorId, lerDadosParaConexao } from "@/lib/instagram/conexao";
import { dentroDoLimite, json, preflight } from "@/lib/instagram/http";
import { sincronizarConexao } from "@/lib/instagram/sincronizar";

export const maxDuration = 60;

export function OPTIONS() {
  return preflight();
}

const emAndamento = new Set<string>();

export async function POST(req: Request) {
  const conexao = await conexaoDaRequisicao(req);
  if (!conexao) return json({ erro: "Sua sessão expirou. Entre de novo." }, 401);

  if (!dentroDoLimite(`sincronizar:${conexao.id}`, 4, 60_000)) {
    return json({ erro: "Calma. Espere um minuto para sincronizar de novo." }, 429);
  }
  if (emAndamento.has(conexao.id)) {
    return json({ erro: "Já estou sincronizando. Só um instante." }, 429);
  }

  emAndamento.add(conexao.id);
  try {
    const resultado = await sincronizarConexao(conexao);
    if (!resultado.ok) return json({ erro: resultado.erro }, resultado.status);

    const atualizada = (await conexaoPorId(conexao.id)) ?? conexao;
    const dados = await lerDadosParaConexao(atualizada);
    return json({ ok: true, dados });
  } catch {
    return json({ erro: "Não consegui sincronizar agora. Tente de novo." }, 502);
  } finally {
    emAndamento.delete(conexao.id);
  }
}
