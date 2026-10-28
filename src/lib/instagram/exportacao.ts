import { Open } from "unzipper";
import { MAX_PESSOAS, normalizarPessoa, type PessoaIg } from "./tipos";

// O Instagram entrega um zip com followers_1.json, followers_2.json, ... e
// following.json. Cada pessoa aparece em string_list_data[].value.

interface BlocoExportado {
  title?: unknown;
  string_list_data?: unknown;
}

function usuariosDaLista(valor: unknown): string[] {
  let itens: unknown[] = [];
  if (Array.isArray(valor)) itens = valor;
  else if (valor && typeof valor === "object") {
    const relacao = (valor as { relationships_following?: unknown }).relationships_following;
    if (Array.isArray(relacao)) itens = relacao;
  }

  const saida: string[] = [];
  for (const item of itens) {
    if (!item || typeof item !== "object") continue;
    const bloco = item as BlocoExportado;
    if (Array.isArray(bloco.string_list_data)) {
      for (const dado of bloco.string_list_data) {
        if (!dado || typeof dado !== "object") continue;
        const username = (dado as { value?: unknown }).value;
        if (typeof username === "string") saida.push(username);
      }
    } else if (typeof bloco.title === "string") {
      saida.push(bloco.title);
    }
  }
  return saida;
}

export interface ListasExportadas {
  seguidores: PessoaIg[];
  seguindo: PessoaIg[];
  achouArquivo: boolean;
  seguidoresTruncado: boolean;
}

const LIMITE_DESCOMPACTADO = 120 * 1024 * 1024;

export async function lerExportacao(conteudo: Buffer): Promise<ListasExportadas> {
  const diretorio = await Open.buffer(conteudo);
  let totalDescompactado = 0;
  const seguidores: PessoaIg[] = [];
  const seguindo: PessoaIg[] = [];
  const vistosSeguidores = new Set<string>();
  const vistosSeguindo = new Set<string>();
  let achouArquivo = false;
  let seguidoresTruncado = false;

  for (const entrada of diretorio.files) {
    const nome = (entrada.path.split("/").pop() ?? "").toLowerCase();
    const ehSeguidores = /^followers(_\d+)?\.json$/.test(nome);
    const ehSeguindo = /^following(_\d+)?\.json$/.test(nome);
    if (!ehSeguidores && !ehSeguindo) continue;
    achouArquivo = true;
    totalDescompactado += entrada.uncompressedSize || 0;
    if (totalDescompactado > LIMITE_DESCOMPACTADO) {
      throw new Error("conteúdo do zip grande demais");
    }

    let json: unknown;
    try {
      const texto = (await entrada.buffer()).toString("utf8").replace(/^\uFEFF/, "");
      json = JSON.parse(texto);
    } catch {
      continue;
    }

    const destino = ehSeguidores ? seguidores : seguindo;
    const vistos = ehSeguidores ? vistosSeguidores : vistosSeguindo;
    for (const username of usuariosDaLista(json)) {
      const pessoa = normalizarPessoa({ username });
      if (!pessoa || vistos.has(pessoa.id)) continue;
      if (destino.length >= MAX_PESSOAS) {
        if (ehSeguidores) seguidoresTruncado = true;
        break;
      }
      vistos.add(pessoa.id);
      destino.push(pessoa);
    }
  }

  return { seguidores, seguindo, achouArquivo, seguidoresTruncado };
}
