import {
  conexaoDaRequisicao,
  conexaoPorCodigo,
  lerDadosParaConexao,
} from "@/lib/instagram/conexao";
import { json, preflight } from "@/lib/instagram/http";
import { codigoValido } from "@/lib/instagram/tipos";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const conexao = await conexaoDaRequisicao(req);
  if (conexao) return json(await lerDadosParaConexao(conexao));

  const cabecalho = req.headers.get("x-codigo");
  const codigo = cabecalho ?? new URL(req.url).searchParams.get("codigo");
  if (!codigoValido(codigo)) return json({ erro: "não conectado" }, 401);

  const porCodigo = await conexaoPorCodigo(codigo);
  if (!porCodigo) return json({ erro: "conexão não encontrada" }, 404);
  return json(await lerDadosParaConexao(porCodigo));
}
