import { perfisParaVerificar } from "@/lib/instagram/conexao";
import { json, preflight } from "@/lib/instagram/http";
import { codigoValido } from "@/lib/instagram/tipos";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const codigo = req.headers.get("x-codigo") ?? new URL(req.url).searchParams.get("codigo");
  if (!codigoValido(codigo)) return json({ erro: "código inválido" }, 400);
  const pendentes = await perfisParaVerificar(codigo);
  if (!pendentes) return json({ erro: "conexão não encontrada" }, 404);
  return json(pendentes);
}
