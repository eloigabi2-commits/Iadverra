import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const COOKIE_PREGAO = "pregao_sessao";
const DURACAO_S = 60 * 60 * 24 * 180;

function segredo(): string | null {
  return (
    process.env.PREGAO_SESSAO_KEY?.trim() ||
    process.env.CREDITO_SESSAO_KEY?.trim() ||
    process.env.PAINEL_SENHA?.trim() ||
    null
  );
}

export function pregaoConfigurado(): boolean {
  return segredo() !== null;
}

function assinar(texto: string, chave: string): string {
  return createHmac("sha256", chave).update(texto).digest("base64url");
}

function iguais(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function sessaoDoUsuario(id: string): { valor: string; maxAge: number } {
  const chave = segredo();
  if (!chave) throw new Error("PREGAO_SESSAO_KEY não configurada");
  const expira = Math.floor(Date.now() / 1000) + DURACAO_S;
  return { valor: `${id}.${expira}.${assinar(`pregao:${id}:${expira}`, chave)}`, maxAge: DURACAO_S };
}

export const opcoesDoCookiePregao = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

async function idDaSessao(): Promise<string | null> {
  const chave = segredo();
  if (!chave) return null;
  const valor = (await cookies()).get(COOKIE_PREGAO)?.value;
  if (!valor) return null;
  const partes = valor.split(".");
  if (partes.length !== 3) return null;

  const [id, expiraTexto, assinatura] = partes;
  const expira = Number(expiraTexto);
  if (!id || !Number.isFinite(expira) || expira < Date.now() / 1000) return null;
  if (!iguais(assinatura, assinar(`pregao:${id}:${expira}`, chave))) return null;
  return id;
}

export async function usuarioAtual() {
  const id = await idDaSessao();
  if (!id) return null;
  return prisma.usuarioPregao.findUnique({
    where: { id },
    select: { id: true, nome: true, email: true, estado: true, criadoEm: true },
  });
}

export async function usuarioDaSessao() {
  const id = await idDaSessao();
  if (!id) return null;
  return prisma.usuarioPregao.findUnique({
    where: { id },
    select: { id: true, nome: true },
  });
}
