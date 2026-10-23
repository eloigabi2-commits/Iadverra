import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

// Ordem em que o cliente tira as fotos
export const TIPOS_FOTO = ["rg_frente", "rg_verso", "comprovante"] as const;
export type TipoFoto = (typeof TIPOS_FOTO)[number];

export const ROTULO_FOTO: Record<TipoFoto, string> = {
  rg_frente: "RG (frente)",
  rg_verso: "RG (verso)",
  comprovante: "Comprovante de endereço",
};

export const TAMANHO_MAXIMO_FOTO = 4 * 1024 * 1024;
export const MIMES_ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export function isTipoFoto(valor: unknown): valor is TipoFoto {
  return typeof valor === "string" && (TIPOS_FOTO as readonly string[]).includes(valor);
}

export function nomeEscritorio(): string {
  return process.env.NOME_ESCRITORIO?.trim() || "nosso escritório";
}

export function urlBase(req?: Request): string {
  const configurada = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (configurada) return configurada;
  if (req) return new URL(req.url).origin;
  return "";
}

export function linkDaSolicitacao(token: string, req?: Request): string {
  return `${urlBase(req)}/documentos/${token}`;
}

function limpar(valor: unknown, max = 120): string | null {
  if (typeof valor !== "string") return null;
  const texto = valor.trim().slice(0, max);
  return texto || null;
}

export function limparTelefone(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const digitos = valor.replace(/\D/g, "").slice(0, 15);
  return digitos || null;
}

// Cria um link novo, ou devolve o que já está aguardando para o mesmo lead,
// para a IA poder pedir o link de novo sem gerar duplicatas.
export async function criarSolicitacao(dados: {
  nome?: unknown;
  telefone?: unknown;
  referencia?: unknown;
}) {
  const nome = limpar(dados.nome);
  const telefone = limparTelefone(dados.telefone);
  const referencia = limpar(dados.referencia);

  if (referencia || telefone) {
    const existente = await prisma.solicitacaoDocumento.findFirst({
      where: {
        status: "aguardando",
        ...(referencia ? { referencia } : { telefone }),
      },
      orderBy: { criadoEm: "desc" },
    });
    if (existente) return existente;
  }

  return prisma.solicitacaoDocumento.create({
    data: {
      token: randomBytes(18).toString("base64url"),
      nome,
      telefone,
      referencia,
    },
  });
}

export async function buscarPorToken(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  return prisma.solicitacaoDocumento.findUnique({
    where: { token },
    include: { fotos: { select: { tipo: true } } },
  });
}

export function mensagemWhatsApp(nome: string | null, url: string): string {
  const saudacao = nome ? `Olá, ${nome.split(" ")[0]}!` : "Olá!";
  return `${saudacao} Para seguir com o seu atendimento, toque no link abaixo e tire as fotos do seu RG e do comprovante de endereço. É rápido e seguro: ${url}`;
}

export function formatarData(data: Date | null): string {
  if (!data) return "—";
  return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}
