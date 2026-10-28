import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const TAMANHO = 64;
const CUSTO = 16384;
const BLOCO = 8;
const PARALELO = 1;

function derivar(senha: string, sal: string, custo: number, bloco: number, paralelo: number): Promise<Buffer> {
  return new Promise((resolver, rejeitar) => {
    scryptCallback(senha, sal, TAMANHO, { N: custo, r: bloco, p: paralelo }, (erro, chave) => {
      if (erro) rejeitar(erro);
      else resolver(chave);
    });
  });
}

export async function criarHashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16).toString("base64url");
  const chave = await derivar(senha, sal, CUSTO, BLOCO, PARALELO);
  return `scrypt$${CUSTO}$${BLOCO}$${PARALELO}$${sal}$${chave.toString("base64url")}`;
}

export async function conferirSenha(senha: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;

  const partes = hash.split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;

  const custo = Number(partes[1]);
  const bloco = Number(partes[2]);
  const paralelo = Number(partes[3]);
  const sal = partes[4];
  const esperado = Buffer.from(partes[5], "base64url");

  if (!Number.isInteger(custo) || !Number.isInteger(bloco) || !Number.isInteger(paralelo)) return false;
  if (custo < 1024 || custo > 1_048_576 || bloco < 1 || bloco > 32 || paralelo < 1 || paralelo > 16) return false;
  if (!sal || esperado.length !== TAMANHO) return false;

  const obtido = await derivar(senha, sal, custo, bloco, paralelo);
  return timingSafeEqual(esperado, obtido);
}
