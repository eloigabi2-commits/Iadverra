import {
  apagarConexao,
  conexaoDaRequisicao,
  criarConexao,
  salvarPendente,
  salvarSessao,
} from "@/lib/instagram/conexao";
import { dentroDoLimite, ipDaRequisicao, json, preflight } from "@/lib/instagram/http";
import { entrarNoInstagram } from "@/lib/instagram/instagram-api";
import { definirSessao } from "@/lib/instagram/sessao";

export const maxDuration = 60;

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request) {
  if (!dentroDoLimite(`entrar:${ipDaRequisicao(req)}`, 8, 10 * 60_000)) {
    return json({ erro: "Muitas tentativas. Espere alguns minutos." }, 429);
  }

  let corpo: { usuario?: unknown; senha?: unknown };
  try {
    corpo = (await req.json()) as typeof corpo;
  } catch {
    return json({ erro: "Não entendi o pedido." }, 400);
  }

  const usuario = typeof corpo.usuario === "string" ? corpo.usuario.replace(/^@/, "").trim() : "";
  const senha = typeof corpo.senha === "string" ? corpo.senha : "";

  if (!/^[A-Za-z0-9._]{1,30}$/.test(usuario)) {
    return json({ erro: "Digite o @ do Instagram, só com letras, números, ponto e underline." }, 400);
  }
  if (!senha || senha.length > 200) {
    return json({ erro: "Digite a senha do Instagram." }, 400);
  }

  const anterior = await conexaoDaRequisicao(req);
  const resultado = await entrarNoInstagram(usuario, senha);

  if (resultado.tipo === "ok") {
    const mesmaConta = anterior?.username === resultado.sessao.username;
    const conexao = mesmaConta && anterior ? { id: anterior.id } : await criarConexao();
    if (anterior && !mesmaConta) await apagarConexao(anterior.id);
    await salvarSessao(conexao.id, resultado.sessao);
    const res = json({ ok: true, usuario: resultado.sessao.username });
    definirSessao(res, req, conexao.id);
    return res;
  }

  if (resultado.tipo === "2fa") {
    const mesmaConta = anterior?.username === resultado.pendente.username.toLowerCase();
    const conexao = mesmaConta && anterior ? { id: anterior.id } : await criarConexao();
    if (anterior && !mesmaConta) await apagarConexao(anterior.id);
    await salvarPendente(conexao.id, resultado.pendente);
    const res = json({ ok: false, etapa: "2fa", mensagem: resultado.mensagem });
    definirSessao(res, req, conexao.id);
    return res;
  }

  if (resultado.tipo === "desafio") {
    return json({ ok: false, etapa: "desafio", erro: resultado.mensagem }, 409);
  }

  return json({ erro: resultado.mensagem }, resultado.status);
}
