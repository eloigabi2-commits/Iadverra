import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const COOKIE_CREDITO = "credito_sessao";
const DURACAO_S = 60 * 60 * 24 * 180;

export type ClienteDaConta = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
};

function segredo(): string | null {
  return process.env.CREDITO_SESSAO_KEY?.trim() || process.env.PAINEL_SENHA?.trim() || null;
}

export function creditoConfigurado(): boolean {
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

export function sessaoDaConta(id: string): { valor: string; maxAge: number } {
  const chave = segredo();
  if (!chave) throw new Error("CREDITO_SESSAO_KEY não configurada");
  const expira = Math.floor(Date.now() / 1000) + DURACAO_S;
  return { valor: `${id}.${expira}.${assinar(`credito:${id}:${expira}`, chave)}`, maxAge: DURACAO_S };
}

export const opcoesDoCookieCredito = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

export const clienteAtual = cache(async (): Promise<ClienteDaConta | null> => {
  const chave = segredo();
  if (!chave) return null;
  const valor = (await cookies()).get(COOKIE_CREDITO)?.value;
  if (!valor) return null;
  const partes = valor.split(".");
  if (partes.length !== 3) return null;

  const [id, expiraTexto, assinatura] = partes;
  const expira = Number(expiraTexto);
  if (!id || !Number.isFinite(expira) || expira < Date.now() / 1000) return null;
  if (!iguais(assinatura, assinar(`credito:${id}:${expira}`, chave))) return null;

  return prisma.clienteCredito.findUnique({
    where: { id },
    select: { id: true, nome: true, email: true, telefone: true },
  });
});
