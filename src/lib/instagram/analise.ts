import type { PessoaIg } from "./tipos";

export interface SumidoIg extends PessoaIg {
  origem: string;
  estado: string;
  detectadoEm: string;
  verificadoEm: string | null;
}

export interface PontoHistorico {
  quando: string;
  seguidores: number;
  seguindo: number;
}

export interface ResumoInstagram {
  perfil: {
    id: string | null;
    username: string | null;
    nome: string | null;
    foto: string | null;
    ultimaSync: string | null;
  };
  totais: {
    seguidores: number;
    seguindo: number;
    mutuos: number;
    naoSeguemDeVolta: number;
    naoSigoDeVolta: number;
    novosSeguidores: number;
    deixaramDeSeguir: number;
    bloqueiosSuspeitos: number;
    naoVerificados: number;
  };
  naoSeguemDeVolta: PessoaIg[];
  naoSigoDeVolta: PessoaIg[];
  mutuos: PessoaIg[];
  novosSeguidores: PessoaIg[];
  deixaramDeSeguir: SumidoIg[];
  bloqueiosSuspeitos: SumidoIg[];
  naoVerificados: SumidoIg[];
  historico: PontoHistorico[];
}

export interface SumidoCalculado {
  chave: string;
  igPerfilId: string | null;
  username: string;
  nome: string | null;
  fotoUrl: string | null;
  origem: string;
}

// "Deixou de seguir" é quem estava nos seguidores e não está mais, mesmo que
// você continue seguindo a pessoa. Quem você apenas deixou de seguir não entra.
export function calcularSumidos(
  seguidoresAntes: PessoaIg[],
  seguindoAntes: PessoaIg[],
  seguidoresAgora: PessoaIg[],
  seguindoAgora: PessoaIg[]
): SumidoCalculado[] {
  const continuaTeSeguindo = new Set(seguidoresAgora.map((p) => p.id));
  const seguiaAntes = new Set(seguindoAntes.map((p) => p.id));
  const segueAgora = new Set(seguindoAgora.map((p) => p.id));

  return seguidoresAntes
    .filter((p) => !continuaTeSeguindo.has(p.id))
    .map((p) => ({
      chave: p.id,
      igPerfilId: p.igId,
      username: p.username,
      nome: p.nome,
      fotoUrl: p.foto,
      origem: seguiaAntes.has(p.id) && !segueAgora.has(p.id) ? "ambos" : "seguidores",
    }));
}

function porUsername(a: PessoaIg, b: PessoaIg): number {
  return a.username.localeCompare(b.username, "pt-BR");
}

function mapa(lista: PessoaIg[]): Map<string, PessoaIg> {
  return new Map(lista.map((p) => [p.id, p]));
}

export function compararListas(
  seguidores: PessoaIg[],
  seguindo: PessoaIg[],
  anteriores: PessoaIg[] | null
): {
  naoSeguemDeVolta: PessoaIg[];
  naoSigoDeVolta: PessoaIg[];
  mutuos: PessoaIg[];
  novosSeguidores: PessoaIg[];
} {
  const segue = mapa(seguidores);
  const sigo = mapa(seguindo);

  const naoSeguemDeVolta = seguindo.filter((p) => !segue.has(p.id)).sort(porUsername);
  const naoSigoDeVolta = seguidores.filter((p) => !sigo.has(p.id)).sort(porUsername);
  const mutuos = seguindo.filter((p) => segue.has(p.id)).sort(porUsername);
  const antes = anteriores ? mapa(anteriores) : null;
  const novosSeguidores = antes ? seguidores.filter((p) => !antes.has(p.id)).sort(porUsername) : [];

  return { naoSeguemDeVolta, naoSigoDeVolta, mutuos, novosSeguidores };
}
