import { createHash, randomInt } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularSumidos, compararListas, type ResumoInstagram, type SumidoIg } from "./analise";
import type { Pendente2fa, SessaoIg } from "./instagram-api";
import { criptografar, descriptografar, idAssinado, lerCookie, COOKIE_SESSAO } from "./sessao";
import {
  codigoValido,
  normalizarCodigo,
  normalizarIds,
  normalizarLista,
  normalizarPessoa,
  type PessoaIg,
  type PayloadImportacao,
} from "./tipos";

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const VERIFICAR_DE_NOVO_MS = 7 * 24 * 60 * 60 * 1000;
const PENDENTE_VALIDADE_MS = 15 * 60 * 1000;

export interface ConexaoIg {
  id: string;
  igUserId: string | null;
  username: string | null;
  nome: string | null;
  fotoUrl: string | null;
  cookies: string | null;
  cookiesEm: Date | null;
  pendente: string | null;
  pendenteEm: Date | null;
  ultimaSync: Date | null;
}

function gerarCodigo(): string {
  let bruto = "";
  for (let i = 0; i < 12; i++) bruto += ALFABETO[randomInt(ALFABETO.length)];
  return bruto.match(/.{1,4}/g)!.join("-");
}

export function hashCodigo(codigo: string): string {
  return createHash("sha256").update(normalizarCodigo(codigo)).digest("hex");
}

export async function criarConexao(): Promise<{ codigo: string; id: string }> {
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const codigo = gerarCodigo();
    try {
      const conexao = await prisma.instagramConexao.create({ data: { codigoHash: hashCodigo(codigo) } });
      return { codigo, id: conexao.id };
    } catch {
      // colisão do código único: gera outro
    }
  }
  throw new Error("não foi possível gerar o código da conexão");
}

export async function apagarConexao(id: string): Promise<void> {
  await prisma.instagramConexao.delete({ where: { id } }).catch(() => undefined);
}

export async function conexaoPorCodigo(codigo: string): Promise<ConexaoIg | null> {
  if (!codigoValido(codigo)) return null;
  return prisma.instagramConexao.findUnique({ where: { codigoHash: hashCodigo(codigo) } });
}

export async function conexaoPorId(id: string): Promise<ConexaoIg | null> {
  if (!id) return null;
  return prisma.instagramConexao.findUnique({ where: { id } });
}

export async function conexaoDaRequisicao(req: Request): Promise<ConexaoIg | null> {
  const id = idAssinado(lerCookie(req, COOKIE_SESSAO));
  if (!id) return null;
  return conexaoPorId(id);
}

export async function salvarSessao(conexaoId: string, sessao: SessaoIg): Promise<void> {
  await prisma.instagramConexao.update({
    where: { id: conexaoId },
    data: {
      cookies: criptografar(sessao),
      cookiesEm: new Date(),
      igUserId: sessao.userId,
      username: sessao.username,
      nome: sessao.nome,
      fotoUrl: sessao.foto,
      pendente: null,
      pendenteEm: null,
    },
  });
}

export function lerSessao(conexao: Pick<ConexaoIg, "cookies">): SessaoIg | null {
  const sessao = descriptografar<SessaoIg>(conexao.cookies);
  if (!sessao || typeof sessao !== "object") return null;
  if (!sessao.userId || !sessao.cookies || typeof sessao.cookies !== "object") return null;
  if (!sessao.cookies.sessionid) return null;
  return sessao;
}

export async function salvarPendente(conexaoId: string, pendente: Pendente2fa): Promise<void> {
  await prisma.instagramConexao.update({
    where: { id: conexaoId },
    data: { pendente: criptografar(pendente), pendenteEm: new Date() },
  });
}

export function lerPendente(
  conexao: Pick<ConexaoIg, "pendente" | "pendenteEm">
): Pendente2fa | null {
  if (!conexao.pendente || !conexao.pendenteEm) return null;
  if (Date.now() - conexao.pendenteEm.getTime() > PENDENTE_VALIDADE_MS) return null;
  const pendente = descriptografar<Pendente2fa>(conexao.pendente);
  if (!pendente || !pendente.identifier || !pendente.username) return null;
  if (!pendente.cookies || typeof pendente.cookies !== "object") return null;
  return pendente;
}

export async function limparPendente(conexaoId: string): Promise<void> {
  await prisma.instagramConexao.update({
    where: { id: conexaoId },
    data: { pendente: null, pendenteEm: null },
  });
}

function pessoasDoJson(valor: unknown): PessoaIg[] {
  return normalizarLista(valor);
}

function pessoaDoSumido(s: {
  chave: string;
  igPerfilId: string | null;
  username: string;
  nome: string | null;
  fotoUrl: string | null;
}): PessoaIg {
  return {
    id: s.chave,
    igId: s.igPerfilId,
    username: s.username,
    nome: s.nome,
    foto: s.fotoUrl,
    privado: false,
    verificado: false,
  };
}

export type ResultadoImportacao =
  | { ok: true; seguidores: number; seguindo: number; novos: number; sumiram: number }
  | { ok: false; status: number; erro: string };

export type DadosImportacao = Omit<PayloadImportacao, "codigo">;

export async function importarNaConexao(
  conexao: ConexaoIg,
  payload: DadosImportacao
): Promise<ResultadoImportacao> {
  const perfil = normalizarPessoa(payload.perfil);
  if (!perfil) return { ok: false, status: 400, erro: "perfil do Instagram inválido" };
  if (conexao.username && conexao.username !== perfil.username) {
    return { ok: false, status: 409, erro: "esta conexão já está ligada a outra conta do Instagram" };
  }

  const seguidores = normalizarLista(payload.seguidores);
  const seguindo = normalizarLista(payload.seguindo);
  if (seguidores.length === 0 && seguindo.length === 0) {
    return { ok: false, status: 400, erro: "nenhum perfil recebido" };
  }

  const acessiveis = normalizarIds(payload.acessiveis);
  const inacessiveis = normalizarIds(payload.inacessiveis);

  const anterior = await prisma.instagramSnapshot.findFirst({
    where: { conexaoId: conexao.id },
    orderBy: { criadoEm: "desc" },
  });
  const seguidoresAntes = pessoasDoJson(anterior?.seguidores);
  const seguindoAntes = pessoasDoJson(anterior?.seguindo);

  const seguidoresAtuaisIds = new Set(seguidores.map((p) => p.id));
  const seguidoresAntesIds = new Set(seguidoresAntes.map((p) => p.id));

  const sumidos =
    payload.seguidoresTruncado === true
      ? []
      : calcularSumidos(seguidoresAntes, seguindoAntes, seguidores, seguindo);

  const novos = anterior ? seguidores.filter((p) => !seguidoresAntesIds.has(p.id)).length : 0;

  await prisma.$transaction(async (tx) => {
    await tx.instagramSnapshot.create({
      data: {
        conexaoId: conexao.id,
        seguidores: seguidores as unknown as Prisma.InputJsonValue,
        seguindo: seguindo as unknown as Prisma.InputJsonValue,
        seguidoresTotal: seguidores.length,
        seguindoTotal: seguindo.length,
      },
    });

    await tx.instagramConexao.update({
      where: { id: conexao.id },
      data: {
        igUserId: perfil.igId ?? conexao.igUserId,
        username: perfil.username,
        nome: perfil.nome ?? conexao.nome,
        fotoUrl: perfil.foto ?? conexao.fotoUrl,
        ultimaSync: new Date(),
      },
    });

    // quem voltou a te seguir não é mais "sumido"
    if (seguidoresAtuaisIds.size > 0) {
      await tx.instagramSumido.deleteMany({
        where: { conexaoId: conexao.id, chave: { in: [...seguidoresAtuaisIds] } },
      });
    }

    if (sumidos.length > 0) {
      // estes saíram entre o snapshot anterior e o atual: recria para atualizar
      // id numérico (extensão) e reiniciar a verificação de quem voltou e saiu de novo
      await tx.instagramSumido.deleteMany({
        where: { conexaoId: conexao.id, chave: { in: sumidos.map((s) => s.chave) } },
      });
      await tx.instagramSumido.createMany({
        data: sumidos.map((s) => ({ conexaoId: conexao.id, ...s })),
      });
    }

    if (acessiveis.length > 0) {
      await tx.instagramSumido.updateMany({
        where: { conexaoId: conexao.id, igPerfilId: { in: acessiveis } },
        data: { estado: "existe", verificadoEm: new Date() },
      });
    }
    if (inacessiveis.length > 0) {
      await tx.instagramSumido.updateMany({
        where: { conexaoId: conexao.id, igPerfilId: { in: inacessiveis } },
        data: { estado: "inacessivel", verificadoEm: new Date() },
      });
    }
  }, { maxWait: 10_000, timeout: 60_000 });

  return {
    ok: true,
    seguidores: seguidores.length,
    seguindo: seguindo.length,
    novos,
    sumiram: sumidos.length,
  };
}

export async function importar(payload: PayloadImportacao): Promise<ResultadoImportacao> {
  const conexao = await conexaoPorCodigo(payload.codigo);
  if (!conexao) return { ok: false, status: 404, erro: "código de conexão inválido" };
  return importarNaConexao(conexao, payload);
}

export async function perfisParaVerificarConexao(
  conexao: ConexaoIg
): Promise<{ ids: string[]; total: number }> {
  const limite = new Date(Date.now() - VERIFICAR_DE_NOVO_MS);
  const where = {
    conexaoId: conexao.id,
    estado: "sumiu",
    igPerfilId: { not: null },
    OR: [{ verificadoEm: null }, { verificadoEm: { lt: limite } }],
  } satisfies Prisma.InstagramSumidoWhereInput;

  const [linhas, total] = await Promise.all([
    prisma.instagramSumido.findMany({
      where,
      take: 300,
      orderBy: { detectadoEm: "asc" },
      select: { igPerfilId: true },
    }),
    prisma.instagramSumido.count({ where }),
  ]);
  return { ids: linhas.flatMap((l) => (l.igPerfilId ? [l.igPerfilId] : [])), total };
}

export async function perfisParaVerificar(codigo: string): Promise<{ ids: string[]; total: number } | null> {
  const conexao = await conexaoPorCodigo(codigo);
  if (!conexao) return null;
  return perfisParaVerificarConexao(conexao);
}

export async function lerDadosParaConexao(conexao: ConexaoIg): Promise<ResumoInstagram> {
  const snapshots = await prisma.instagramSnapshot.findMany({
    where: { conexaoId: conexao.id },
    orderBy: { criadoEm: "desc" },
    take: 12,
  });
  const ultimo = snapshots[0];
  const penultimo = snapshots[1];
  const seguidores = pessoasDoJson(ultimo?.seguidores);
  const seguindo = pessoasDoJson(ultimo?.seguindo);
  const seguidoresAntes = penultimo ? pessoasDoJson(penultimo.seguidores) : null;

  const { naoSeguemDeVolta, naoSigoDeVolta, mutuos, novosSeguidores } = compararListas(
    seguidores,
    seguindo,
    seguidoresAntes
  );

  const sumidos = await prisma.instagramSumido.findMany({
    where: { conexaoId: conexao.id },
    orderBy: { detectadoEm: "desc" },
    take: 5000,
  });
  const paraSumido = (s: (typeof sumidos)[number]): SumidoIg => ({
    ...pessoaDoSumido(s),
    origem: s.origem,
    estado: s.estado,
    detectadoEm: s.detectadoEm.toISOString(),
    verificadoEm: s.verificadoEm?.toISOString() ?? null,
  });

  const deixaramDeSeguir = sumidos
    .filter((s) => s.estado !== "inacessivel" && (s.origem === "seguidores" || s.origem === "ambos"))
    .map(paraSumido);
  const bloqueiosSuspeitos = sumidos.filter((s) => s.estado === "inacessivel").map(paraSumido);
  const naoVerificados = sumidos.filter((s) => s.estado === "sumiu").map(paraSumido);

  const historico = [...snapshots]
    .reverse()
    .map((s) => ({
      quando: s.criadoEm.toISOString(),
      seguidores: s.seguidoresTotal,
      seguindo: s.seguindoTotal,
    }));

  return {
    perfil: {
      id: conexao.igUserId,
      username: conexao.username,
      nome: conexao.nome,
      foto: conexao.fotoUrl,
      ultimaSync: conexao.ultimaSync?.toISOString() ?? null,
    },
    totais: {
      seguidores: seguidores.length,
      seguindo: seguindo.length,
      mutuos: mutuos.length,
      naoSeguemDeVolta: naoSeguemDeVolta.length,
      naoSigoDeVolta: naoSigoDeVolta.length,
      novosSeguidores: novosSeguidores.length,
      deixaramDeSeguir: deixaramDeSeguir.length,
      bloqueiosSuspeitos: bloqueiosSuspeitos.length,
      naoVerificados: naoVerificados.length,
    },
    naoSeguemDeVolta,
    naoSigoDeVolta,
    mutuos,
    novosSeguidores,
    deixaramDeSeguir,
    bloqueiosSuspeitos,
    naoVerificados,
    historico,
  };
}

export async function lerDados(codigo: string): Promise<ResumoInstagram | null> {
  const conexao = await conexaoPorCodigo(codigo);
  if (!conexao) return null;
  return lerDadosParaConexao(conexao);
}
