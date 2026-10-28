import { criarConexao } from "@/lib/instagram/conexao";
import { dentroDoLimite, ipDaRequisicao, json, preflight } from "@/lib/instagram/http";

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request) {
  if (!dentroDoLimite(`conectar:${ipDaRequisicao(req)}`, 10)) {
    return json({ erro: "muitos códigos pedidos; espere um minuto" }, 429);
  }

  const { codigo } = await criarConexao();
  const base = (process.env.APP_URL ?? "").replace(/\/$/, "");
  return json({
    codigo,
    url: base ? `${base}/instagram?codigo=${encodeURIComponent(codigo)}` : `/instagram?codigo=${encodeURIComponent(codigo)}`,
  });
}
