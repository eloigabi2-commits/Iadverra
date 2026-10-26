import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { mesmaAtendente } from "@/lib/documentos";

export const COOKIE_PAINEL = "painel_sessao";
const DURACAO_GESTOR_S = 60 * 60 * 12;
// a atendente entra pelo link dela, que já é a credencial: a sessão dura mais
const DURACAO_ATENDENTE_S = 60 * 60 * 24 * 30;

// Quem está no painel: o gestor vê todas as atendentes; a atendente só os clientes dela,
// a não ser que seja de supervisão (veTodos), que vê os clientes de todas
export type Sessao =
  | { gestor: true; atendente: null }
  | { gestor: false; atendente: { id: string; nome: string; veTodos: boolean } };

function segredo(): string | null {
  return process.env.PAINEL_SENHA?.trim() || null;
}

function assinar(texto: string, chave: string): string {
  return createHmac("sha256", chave).update(texto).digest("base64url");
}

function iguais(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function senhaConfere(senha: string): boolean {
  const chave = segredo();
  return !!chave && iguais(senha, chave);
}

export function painelConfigurado(): boolean {
  return segredo() !== null;
}

function expiraEm(duracao: number) {
  return Math.floor(Date.now() / 1000) + duracao;
}

// Cookie do gestor: "g.<expira>.<assinatura>". Trocar PAINEL_SENHA derruba todas as sessões.
export function sessaoDoGestor(): { valor: string; maxAge: number } {
  const chave = segredo();
  if (!chave) throw new Error("PAINEL_SENHA não configurada");
  const expira = expiraEm(DURACAO_GESTOR_S);
  return { valor: `g.${expira}.${assinar(`gestor:${expira}`, chave)}`, maxAge: DURACAO_GESTOR_S };
}

// Cookie da atendente: "a.<id>.<expira>.<assinatura>". A assinatura inclui a chave do
// link dela, então trocar o link derruba as sessões abertas com o link antigo.
export function sessaoDaAtendente(a: { id: string; chave: string }): { valor: string; maxAge: number } {
  const chave = segredo();
  if (!chave) throw new Error("PAINEL_SENHA não configurada");
  const expira = expiraEm(DURACAO_ATENDENTE_S);
  return {
    valor: `a.${a.id}.${expira}.${assinar(`atendente:${a.id}:${a.chave}:${expira}`, chave)}`,
    maxAge: DURACAO_ATENDENTE_S,
  };
}

export const opcoesDoCookie = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

async function lerSessao(valor: string | undefined): Promise<Sessao | null> {
  const chave = segredo();
  if (!chave || !valor) return null;
  const partes = valor.split(".");
  const agora = Date.now() / 1000;

  if (partes[0] === "g" && partes.length === 3) {
    const expira = Number(partes[1]);
    if (!Number.isFinite(expira) || expira < agora) return null;
    return iguais(partes[2], assinar(`gestor:${expira}`, chave)) ? { gestor: true, atendente: null } : null;
  }

  if (partes[0] === "a" && partes.length === 4) {
    const [, id, expiraTexto, assinatura] = partes;
    const expira = Number(expiraTexto);
    if (!Number.isFinite(expira) || expira < agora) return null;
    const atendente = await prisma.atendente.findUnique({ where: { id } });
    if (!atendente) return null;
    if (!iguais(assinatura, assinar(`atendente:${id}:${atendente.chave}:${expira}`, chave))) return null;
    return { gestor: false, atendente: { id: atendente.id, nome: atendente.nome, veTodos: atendente.veTodos } };
  }

  return null;
}

// Uma leitura por requisição, mesmo chamada pela página e pelos componentes
export const sessaoAtual = cache(async (): Promise<Sessao | null> => {
  const store = await cookies();
  return lerSessao(store.get(COOKIE_PAINEL)?.value);
});

// Gestor e supervisão veem os clientes de todas as atendentes
export function veTudo(sessao: Sessao): boolean {
  return sessao.gestor || sessao.atendente.veTodos;
}

// O cliente pertence a quem está no painel? Gestor e supervisão podem tudo; a atendente, só os dela.
export function podeVer(sessao: Sessao, atendenteDoCliente: string | null): boolean {
  return sessao.gestor || sessao.atendente.veTodos || mesmaAtendente(sessao.atendente.nome, atendenteDoCliente);
}

// Chave usada pela IA/n8n para criar links pela API
export function chaveApiConfere(req: Request): boolean {
  const chave = process.env.DOCUMENTOS_API_KEY?.trim();
  if (!chave) return false;
  const header = req.headers.get("authorization") ?? "";
  const enviada = header.replace(/^Bearer\s+/i, "").trim();
  return !!enviada && iguais(enviada, chave);
}
