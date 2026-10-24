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
  return process.env.NOME_ESCRITORIO?.trim() || "Esclarece Assessoria";
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
  // guarda sempre com o 55 na frente, para "11 99999-8888" e o chat_number do ChatGuru serem o mesmo lead
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos || null;
}

// Cria um link novo, ou devolve o que já está aguardando para o mesmo lead,
// para a IA poder pedir o link de novo sem gerar duplicatas. O lead é
// reconhecido pelo telefone; a referência só vale quando não há telefone.
export async function criarSolicitacao(dados: {
  nome?: unknown;
  telefone?: unknown;
  referencia?: unknown;
  atendente?: unknown;
}) {
  const nome = limpar(dados.nome);
  const telefone = limparTelefone(dados.telefone);
  const referencia = limpar(dados.referencia);
  const atendente = limpar(dados.atendente, 60);

  if (telefone || referencia) {
    const existente = await prisma.solicitacaoDocumento.findFirst({
      where: { status: "aguardando", ...(telefone ? { telefone } : { referencia }) },
      orderBy: { criadoEm: "desc" },
    });
    if (existente) {
      // a distribuição pode ter mudado de atendente desde o primeiro link
      if (atendente && existente.atendente !== atendente) {
        return prisma.solicitacaoDocumento.update({ where: { id: existente.id }, data: { atendente } });
      }
      return existente;
    }
  }

  return prisma.solicitacaoDocumento.create({
    data: {
      token: randomBytes(18).toString("base64url"),
      nome,
      telefone,
      referencia,
      atendente,
    },
  });
}

// Nomes das atendentes que já têm clientes, para os atalhos do painel
export async function listarAtendentes(): Promise<{ nome: string; paraConferir: number }[]> {
  const grupos = await prisma.solicitacaoDocumento.groupBy({
    by: ["atendente", "status"],
    where: { atendente: { not: null } },
    _count: true,
  });
  const mapa = new Map<string, number>();
  for (const g of grupos) {
    if (!g.atendente) continue;
    mapa.set(g.atendente, (mapa.get(g.atendente) ?? 0) + (g.status === "enviado" ? g._count : 0));
  }
  return [...mapa.entries()]
    .map(([nome, paraConferir]) => ({ nome, paraConferir }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function buscarPorToken(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  return prisma.solicitacaoDocumento.findUnique({
    where: { token },
    include: { fotos: { select: { tipo: true } } },
  });
}

export function mensagemWhatsApp(nome: string | null, url: string, refazer = false): string {
  const saudacao = nome ? `Olá, ${nome.split(" ")[0]}!` : "Olá!";
  if (refazer) {
    return `${saudacao} Uma das fotos não ficou boa. Toque no link abaixo e tire só ela de novo: ${url}`;
  }
  return `${saudacao} Para seguir com o seu atendimento, toque no link abaixo e tire as fotos do seu RG e do comprovante de endereço. É rápido e seguro: ${url}`;
}

export function formatarData(data: Date | null): string {
  if (!data) return "—";
  return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

// Abre o WhatsApp da atendente já com a conversa do cliente e a mensagem pronta
export function linkWhatsApp(telefone: string | null, mensagem: string): string {
  let numero = telefone?.replace(/\D/g, "") ?? "";
  if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}
