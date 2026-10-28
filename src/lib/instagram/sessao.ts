import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { NextResponse } from "next/server";

export const COOKIE_SESSAO = "espelho";
export const COOKIE_PENDENTE = "espelho_pendente";

const UM_ANO = 60 * 60 * 24 * 365;

function segredo(): string {
  return process.env.INSTAGRAM_SESSION_KEY || process.env.DATABASE_URL || "espelho-dev";
}

function chave(): Buffer {
  return createHash("sha256").update(`espelho-sessao:${segredo()}`).digest();
}

export function criptografar(valor: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([cipher.update(JSON.stringify(valor), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${dados.toString("base64url")}`;
}

export function descriptografar<T>(texto: string | null | undefined): T | null {
  if (!texto) return null;
  const partes = texto.split(".");
  if (partes.length !== 4 || partes[0] !== "v1") return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", chave(), Buffer.from(partes[1], "base64url"));
    decipher.setAuthTag(Buffer.from(partes[2], "base64url"));
    const json = Buffer.concat([
      decipher.update(Buffer.from(partes[3], "base64url")),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function assinarId(id: string): string {
  const assinatura = createHmac("sha256", chave()).update(id).digest("base64url");
  return `${id}.${assinatura}`;
}

export function idAssinado(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const ponto = valor.lastIndexOf(".");
  if (ponto <= 0) return null;
  const id = valor.slice(0, ponto);
  const recebida = Buffer.from(valor.slice(ponto + 1), "base64url");
  const esperada = createHmac("sha256", chave()).update(id).digest();
  if (recebida.length !== esperada.length) return null;
  return timingSafeEqual(recebida, esperada) ? id : null;
}

export function lerCookie(req: Request, nome: string): string | null {
  const alvo = `${nome}=`;
  for (const parte of (req.headers.get("cookie") ?? "").split(";")) {
    const limpo = parte.trim();
    if (!limpo.startsWith(alvo)) continue;
    try {
      return decodeURIComponent(limpo.slice(alvo.length));
    } catch {
      return null;
    }
  }
  return null;
}

export function ehHttps(req: Request): boolean {
  return new URL(req.url).protocol === "https:";
}

export function definirCookie(
  res: NextResponse,
  req: Request,
  nome: string,
  valor: string,
  maxAge = UM_ANO
): void {
  res.cookies.set(nome, valor, {
    httpOnly: true,
    secure: ehHttps(req),
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export function limparCookie(res: NextResponse, req: Request, nome: string): void {
  res.cookies.set(nome, "", {
    httpOnly: true,
    secure: ehHttps(req),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function definirSessao(res: NextResponse, req: Request, id: string): void {
  definirCookie(res, req, COOKIE_SESSAO, assinarId(id));
}

export function limparSessao(res: NextResponse, req: Request): void {
  limparCookie(res, req, COOKIE_SESSAO);
  limparCookie(res, req, COOKIE_PENDENTE);
}
