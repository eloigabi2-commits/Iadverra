import { apagarConexao, conexaoDaRequisicao } from "@/lib/instagram/conexao";
import { json, preflight } from "@/lib/instagram/http";
import { limparSessao } from "@/lib/instagram/sessao";

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request) {
  const conexao = await conexaoDaRequisicao(req);
  if (conexao) await apagarConexao(conexao.id);
  const res = json({ ok: true });
  limparSessao(res, req);
  return res;
}
