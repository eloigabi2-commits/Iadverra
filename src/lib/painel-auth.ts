import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const COOKIE_PAINEL = "painel_sessao";
const DURACAO_SESSAO_S = 60 * 60 * 12;

function segredo(): string | null {
  return process.env.PAINEL_SENHA?.trim() || null;
}

function assinar(expira: number, chave: string): string {
  return createHmac("sha256", chave).update(`painel:${expira}`).digest("base64url");
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

// O cookie leva a validade e uma assinatura com a senha do painel:
// trocar PAINEL_SENHA derruba todas as sessões abertas.
export function novaSessao(): { valor: string; maxAge: number } {
  const chave = segredo();
  if (!chave) throw new Error("PAINEL_SENHA não configurada");
  const expira = Math.floor(Date.now() / 1000) + DURACAO_SESSAO_S;
  return { valor: `${expira}.${assinar(expira, chave)}`, maxAge: DURACAO_SESSAO_S };
}

export function sessaoValida(valor: string | undefined): boolean {
  const chave = segredo();
  if (!chave || !valor) return false;
  const [expiraTexto, assinatura] = valor.split(".");
  const expira = Number(expiraTexto);
  if (!Number.isFinite(expira) || expira < Date.now() / 1000 || !assinatura) return false;
  return iguais(assinatura, assinar(expira, chave));
}

export async function estaLogado(): Promise<boolean> {
  const store = await cookies();
  return sessaoValida(store.get(COOKIE_PAINEL)?.value);
}

// Chave usada pela IA/n8n para criar links pela API
export function chaveApiConfere(req: Request): boolean {
  const chave = process.env.DOCUMENTOS_API_KEY?.trim();
  if (!chave) return false;
  const header = req.headers.get("authorization") ?? "";
  const enviada = header.replace(/^Bearer\s+/i, "").trim();
  return !!enviada && iguais(enviada, chave);
}
