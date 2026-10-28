import { lerSessao, perfisParaVerificarConexao, importarNaConexao, type ConexaoIg, type ResultadoImportacao } from "./conexao";
import { ErroInstagram, listar, perfilExiste, type SessaoIg } from "./instagram-api";
import type { PessoaIg } from "./tipos";

const PROBES_POR_LOTE = 5;
const PROBES_TOTAL = 300;
const ORCAMENTO_MS = 45_000;

export type ResultadoSync =
  | {
      ok: true;
      resultado: ResultadoImportacao & { ok: true };
      seguidoresTruncado: boolean;
      seguindoTruncado: boolean;
    }
  | { ok: false; status: number; erro: string };

function dormir(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verificarPerfis(
  sessao: SessaoIg,
  ids: string[],
  limite: number
): Promise<{ acessiveis: string[]; inacessiveis: string[] }> {
  const acessiveis: string[] = [];
  const inacessiveis: string[] = [];

  for (let i = 0; i < ids.length; i += PROBES_POR_LOTE) {
    if (Date.now() > limite) break;
    const lote = ids.slice(i, i + PROBES_POR_LOTE);
    let respostas: (boolean | null)[];
    try {
      respostas = await Promise.all(lote.map((id) => perfilExiste(sessao, id)));
    } catch (e) {
      if (e instanceof ErroInstagram && e.codigo === "login_required") throw e;
      respostas = lote.map(() => null);
    }
    respostas.forEach((existe, indice) => {
      if (existe === true) acessiveis.push(lote[indice]);
      else if (existe === false) inacessiveis.push(lote[indice]);
    });
    if (i + PROBES_POR_LOTE < ids.length) await dormir(250);
  }

  return { acessiveis, inacessiveis };
}

export async function sincronizarConexao(conexao: ConexaoIg): Promise<ResultadoSync> {
  const sessao = lerSessao(conexao);
  if (!sessao) {
    return { ok: false, status: 401, erro: "Conecte sua conta do Instagram para sincronizar." };
  }

  const limite = Date.now() + ORCAMENTO_MS;

  let seguidores: PessoaIg[];
  let seguindo: PessoaIg[];
  let seguidoresTruncado: boolean;
  let seguindoTruncado: boolean;

  try {
    const [listaSeguidores, listaSeguindo] = await Promise.all([
      listar(sessao, "followers", limite),
      listar(sessao, "following", limite),
    ]);
    seguidores = listaSeguidores.pessoas;
    seguindo = listaSeguindo.pessoas;
    seguidoresTruncado = listaSeguidores.truncado;
    seguindoTruncado = listaSeguindo.truncado;
  } catch (e) {
    if (e instanceof ErroInstagram) {
      const status = e.codigo === "login_required" ? 401 : e.codigo === "rate_limit" ? 429 : 502;
      return { ok: false, status, erro: e.message };
    }
    return { ok: false, status: 502, erro: "Não consegui ler suas listas do Instagram." };
  }

  if (seguidores.length === 0 && seguindo.length === 0) {
    return { ok: false, status: 502, erro: "O Instagram devolveu listas vazias. Tente de novo." };
  }

  const perfil: PessoaIg = {
    id: sessao.username,
    igId: sessao.userId,
    username: sessao.username,
    nome: sessao.nome,
    foto: sessao.foto,
    privado: false,
    verificado: false,
  };

  let acessiveis: string[] = [];
  let inacessiveis: string[] = [];
  try {
    const pendentes = await perfisParaVerificarConexao(conexao);
    if (pendentes.ids.length > 0) {
      const verificados = await verificarPerfis(
        sessao,
        pendentes.ids.slice(0, PROBES_TOTAL),
        limite
      );
      acessiveis = verificados.acessiveis;
      inacessiveis = verificados.inacessiveis;
    }
  } catch (e) {
    if (e instanceof ErroInstagram && e.codigo === "login_required") {
      return { ok: false, status: 401, erro: e.message };
    }
  }

  const resultado = await importarNaConexao(conexao, {
    perfil,
    seguidores,
    seguindo,
    acessiveis,
    inacessiveis,
    seguidoresTruncado,
  });

  if (!resultado.ok) return resultado;

  return { ok: true, resultado, seguidoresTruncado, seguindoTruncado };
}
