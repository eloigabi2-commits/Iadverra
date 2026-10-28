import { importar } from "@/lib/instagram/conexao";
import { dentroDoLimite, ipDaRequisicao, json, preflight } from "@/lib/instagram/http";
import { codigoValido, type PayloadImportacao } from "@/lib/instagram/tipos";

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request) {
  if (!dentroDoLimite(`importar:${ipDaRequisicao(req)}`, 20)) {
    return json({ erro: "muitas sincronizações; espere um minuto" }, 429);
  }

  const corpo = (await req.json().catch(() => null)) as Partial<PayloadImportacao> | null;
  if (!corpo || !codigoValido(corpo.codigo)) {
    return json({ erro: "código de conexão inválido" }, 400);
  }

  const resultado = await importar({
    codigo: corpo.codigo,
    perfil: corpo.perfil as PayloadImportacao["perfil"],
    seguidores: corpo.seguidores ?? [],
    seguindo: corpo.seguindo ?? [],
    acessiveis: corpo.acessiveis,
    inacessiveis: corpo.inacessiveis,
    seguidoresTruncado: corpo.seguidoresTruncado === true,
  });

  if (!resultado.ok) return json({ erro: resultado.erro }, resultado.status);
  return json(resultado);
}
