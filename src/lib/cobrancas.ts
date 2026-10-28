// Regras das cobranças reais (Pix e cartão) que o painel cria e o cliente paga
// em /pagar/<codigo>. O dinheiro passa pela conta do Asaas configurada em
// ASAAS_API_KEY; aqui ficam só os dados do negócio e a máquina de estados.

import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { gerarCodigo, nomeEscritorio, urlBase } from "@/lib/documentos";
import type { PagamentoAsaas } from "@/lib/asaas";

export const VALOR_MINIMO = 5;
export const VALOR_MAXIMO = 100_000;
export const PARCELAS_MAXIMAS = 12;

export const STATUS_COBRANCA = ["pendente", "analise", "paga", "vencida", "cancelada", "estornada"] as const;
export type StatusCobranca = (typeof STATUS_COBRANCA)[number];

export const ROTULO_STATUS: Record<StatusCobranca, string> = {
  pendente: "Aguardando pagamento",
  analise: "Em análise",
  paga: "Pago",
  vencida: "Vencida",
  cancelada: "Cancelada",
  estornada: "Estornada",
};

export function formatarValor(valor: number | string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor));
}

// "R$ 1.234,56", "1234,56" e "1234.56" viram 1234.56
export function valorDoTexto(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? Math.round(valor * 100) / 100 : null;
  if (typeof valor !== "string") return null;
  const limpo = valor.replace(/[^\d,.-]/g, "").trim();
  if (!limpo) return null;
  let normalizado: string;
  if (limpo.includes(",")) {
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else if (/\.\d{3}(?:\.\d{3})*$/.test(limpo)) {
    // "1.500" e "1.500.000" são milhares; "10.50" continua decimal
    normalizado = limpo.replace(/\./g, "");
  } else {
    normalizado = limpo;
  }
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? Math.round(numero * 100) / 100 : null;
}

export function parcelasPermitidas(valor: number): number {
  return Math.max(1, Math.min(PARCELAS_MAXIMAS, Math.floor(valor / VALOR_MINIMO)));
}

export function cpfCnpjValido(valor: string): boolean {
  const digitos = valor.replace(/\D/g, "");
  if (digitos.length === 11) {
    if (/^(\d)\1{10}$/.test(digitos)) return false;
    const calcular = (ate: number) => {
      let soma = 0;
      for (let i = 0; i < ate; i++) soma += Number(digitos[i]) * (ate + 1 - i);
      const resto = (soma * 10) % 11;
      return resto === 10 ? 0 : resto;
    };
    return calcular(9) === Number(digitos[9]) && calcular(10) === Number(digitos[10]);
  }
  if (digitos.length === 14) {
    if (/^(\d)\1{13}$/.test(digitos)) return false;
    const calcular = (ate: number) => {
      const pesos = ate === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      let soma = 0;
      for (let i = 0; i < ate; i++) soma += Number(digitos[i]) * pesos[i];
      const resto = soma % 11;
      return resto < 2 ? 0 : 11 - resto;
    };
    return calcular(12) === Number(digitos[12]) && calcular(13) === Number(digitos[13]);
  }
  return false;
}

export function cartaoValido(numero: string): boolean {
  const digitos = numero.replace(/\D/g, "");
  if (digitos.length < 13 || digitos.length > 19 || /^(\d)\1+$/.test(digitos)) return false;
  let soma = 0;
  for (let i = 0; i < digitos.length; i++) {
    let digito = Number(digitos[digitos.length - 1 - i]);
    if (i % 2 === 1) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    soma += digito;
  }
  return soma % 10 === 0;
}

export function telefoneComPais(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  let digitos = valor.replace(/\D/g, "").slice(0, 15);
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  return digitos || null;
}

// O Asaas espera DDD + número, sem o 55 do Brasil
export function telefoneSemPais(valor: string | null | undefined): string | null {
  let digitos = (valor ?? "").replace(/\D/g, "");
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) {
    digitos = digitos.slice(2);
  }
  return digitos || null;
}

export function dataEmSaoPaulo(data = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

export function vencimentoPadrao(dias = 3): string {
  const data = new Date();
  data.setUTCDate(data.getUTCDate() + dias);
  return dataEmSaoPaulo(data);
}

// O Asaas devolve "2026-01-31 23:59:59" no fuso de São Paulo
export function dataDoAsaas(texto: string | null | undefined): Date | null {
  if (!texto) return null;
  const m = texto.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] ?? "00"}-03:00`);
  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? null : data;
}

export function extrairIp(req: Request): string {
  const cabecalho = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim() || "";
  return /^[0-9a-fA-F:.]{3,45}$/.test(cabecalho) ? cabecalho : "127.0.0.1";
}

export function linkDaCobranca(c: { codigo: string }, base: string): string {
  return `${base}/pagar/${c.codigo}`;
}

export function mensagemWhatsAppCobranca(
  nome: string,
  url: string,
  valor: number,
  opcoes: { escritorio?: string } = {},
): string {
  const primeiroNome = nome.split(/\s+/)[0];
  const escritorio = opcoes.escritorio ?? nomeEscritorio();
  return `${primeiroNome}, aqui está o link para pagar o seu atendimento (${formatarValor(valor)}) com Pix ou cartão de crédito:\n${url}\n\n${escritorio}`;
}

export function urlDaCobranca(req: Request | undefined, c: { codigo: string }): string {
  return linkDaCobranca(c, urlBase(req));
}

export function rotuloDoStatus(status: string): string {
  return ROTULO_STATUS[status as StatusCobranca] ?? status;
}

export type CobrancaCriada = {
  id: string;
  codigo: string;
  nome: string;
  valor: number;
  descricao: string;
  status: string;
  atendente: string | null;
  telefone: string | null;
};

function texto(valor: unknown, max: number): string {
  return typeof valor === "string" ? valor.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

export async function criarCobranca(dados: {
  nome?: unknown;
  cpfCnpj?: unknown;
  email?: unknown;
  telefone?: unknown;
  descricao?: unknown;
  valor?: unknown;
  solicitacaoId?: unknown;
}, opcoes: { atendente?: string | null } = {}): Promise<
  { ok: true; cobranca: CobrancaCriada } | { ok: false; erro: string }
> {
  const nome = texto(dados.nome, 120);
  if (nome.length < 2) return { ok: false, erro: "informe o nome do cliente" };

  const cpfCnpj = typeof dados.cpfCnpj === "string" ? dados.cpfCnpj.replace(/\D/g, "") : "";
  if (!cpfCnpjValido(cpfCnpj)) return { ok: false, erro: "CPF ou CNPJ inválido" };

  const valor = valorDoTexto(dados.valor);
  if (valor === null) return { ok: false, erro: "informe o valor da cobrança" };
  if (valor < VALOR_MINIMO) return { ok: false, erro: `o valor mínimo é ${formatarValor(VALOR_MINIMO)}` };
  if (valor > VALOR_MAXIMO) return { ok: false, erro: `o valor máximo é ${formatarValor(VALOR_MAXIMO)}` };

  const email = typeof dados.email === "string" ? dados.email.trim().slice(0, 160) : "";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, erro: "e-mail inválido" };

  const descricao = texto(dados.descricao, 500) || "Serviços de assessoria";

  // A cobrança pode nascer dentro do painel do cliente; só vinculamos se ele existir
  let solicitacaoId: string | null = null;
  let atendenteFinal = opcoes.atendente ?? null;
  if (typeof dados.solicitacaoId === "string" && dados.solicitacaoId) {
    const solicitacao = await prisma.solicitacaoDocumento.findUnique({
      where: { id: dados.solicitacaoId },
      select: { id: true, atendente: true },
    });
    if (solicitacao) {
      solicitacaoId = solicitacao.id;
      atendenteFinal ??= solicitacao.atendente;
    }
  }

  let criada;
  for (let tentativa = 0; ; tentativa++) {
    try {
      criada = await prisma.cobranca.create({
        data: {
          codigo: gerarCodigo(nome),
          solicitacaoId,
          atendente: atendenteFinal,
          nome,
          email: email || null,
          cpfCnpj,
          telefone: telefoneComPais(dados.telefone),
          descricao,
          valor,
        },
      });
      break;
    } catch (erro) {
      // colisão do código curto é rara; tenta outro antes de desistir
      if ((erro as { code?: string }).code === "P2002" && tentativa < 4) continue;
      throw erro;
    }
  }

  return {
    ok: true,
    cobranca: {
      id: criada.id,
      codigo: criada.codigo,
      nome: criada.nome,
      valor: Number(criada.valor),
      descricao: criada.descricao,
      status: criada.status,
      atendente: criada.atendente,
      telefone: criada.telefone,
    },
  };
}

const CODIGO_VALIDO = /^[a-z0-9-]{6,32}$/;

export async function buscarCobrancaPorCodigo(codigo: string) {
  if (!CODIGO_VALIDO.test(codigo)) return null;
  return prisma.cobranca.findUnique({ where: { codigo } });
}

export async function buscarCobrancaPorId(id: string) {
  return prisma.cobranca.findUnique({ where: { id } });
}

export function statusDoAsaas(status: string): StatusCobranca {
  switch (status) {
    case "RECEIVED":
    case "CONFIRMED":
    case "RECEIVED_IN_CASH":
      return "paga";
    case "AWAITING_RISK_ANALYSIS":
      return "analise";
    case "OVERDUE":
      return "vencida";
    case "REFUNDED":
    case "REFUND_REQUESTED":
    case "REFUND_IN_PROGRESS":
    case "CHARGEBACK_REQUESTED":
    case "CHARGEBACK_DISPUTE":
    case "AWAITING_CHARGEBACK_REVERSAL":
      return "estornada";
    case "DELETED":
      return "cancelada";
    default:
      return "pendente";
  }
}

export function statusFinal(status: string): boolean {
  return status === "paga" || status === "cancelada" || status === "estornada";
}

export function webhookAutorizado(req: Request): boolean {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  if (!esperado) return false;
  const recebido = req.headers.get("asaas-access-token") ?? "";
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Espelha no banco o estado atual do pagamento no Asaas (webhook e consulta)
export async function aplicarPagamentoAsaas(cobrancaId: string, pagamento: PagamentoAsaas): Promise<void> {
  const atual = await prisma.cobranca.findUnique({ where: { id: cobrancaId } });
  if (!atual) return;

  const status = statusDoAsaas(pagamento.status);

  // webhook fora de ordem não pode desfazer um pagamento nem ressuscitar um encerrado
  if (atual.status === "estornada" || atual.status === "cancelada") return;
  if (atual.status === "analise" && status === "pendente") return;
  if (atual.status === "paga" && (status === "pendente" || status === "analise" || status === "vencida")) return;

  await prisma.cobranca.update({
    where: { id: cobrancaId },
    data: {
      asaasPaymentId: pagamento.id,
      status,
      formaPagamento: pagamento.billingType ?? atual.formaPagamento,
      invoiceUrl: pagamento.invoiceUrl ?? atual.invoiceUrl,
      cartaoFinal: pagamento.creditCard?.creditCardNumber ?? atual.cartaoFinal,
      cartaoBandeira: pagamento.creditCard?.creditCardBrand ?? atual.cartaoBandeira,
      pagoEm: status === "paga" ? (atual.pagoEm ?? new Date()) : atual.pagoEm,
    },
  });

  // O pedido de crédito acompanha a cobrança que o pagou
  if (status === "paga" || status === "cancelada" || status === "estornada") {
    await prisma.pedidoCredito.updateMany({
      where: { cobrancaId, status: { not: status === "paga" ? "pago" : "cancelado" } },
      data: { status: status === "paga" ? "pago" : "cancelado" },
    });
  }
}

// Consulta o Asaas quando o webhook ainda não chegou (a tela fica no ar)
export async function sincronizarCobranca<T extends { id: string; status: string; asaasPaymentId: string | null }>(
  cobranca: T,
): Promise<T> {
  if (!cobranca.asaasPaymentId || statusFinal(cobranca.status)) return cobranca;

  const { consultarPagamento } = await import("@/lib/asaas");
  try {
    const pagamento = await consultarPagamento(cobranca.asaasPaymentId);
    if (statusDoAsaas(pagamento.status) !== cobranca.status) {
      await aplicarPagamentoAsaas(cobranca.id, pagamento);
      const atualizada = await prisma.cobranca.findUnique({ where: { id: cobranca.id } });
      if (atualizada) return { ...cobranca, ...atualizada, valor: atualizada.valor } as T;
    }
  } catch {
    // rede ou Asaas fora do ar: a tela mostra o último estado conhecido
  }
  return cobranca;
}

// Antes de gerar outro pagamento, remove a tentativa pendente anterior.
// Devolve false quando a tentativa já virou pagamento (pago ou em análise):
// aí não pode criar outro, senão o cliente paga duas vezes.
export async function limparTentativaPendente(cobranca: {
  id: string;
  asaasPaymentId: string | null;
  status: string;
}): Promise<boolean> {
  if (!cobranca.asaasPaymentId || statusFinal(cobranca.status)) return true;

  const { consultarPagamento, excluirPagamento } = await import("@/lib/asaas");
  let pagamento: PagamentoAsaas | null = null;
  try {
    pagamento = await consultarPagamento(cobranca.asaasPaymentId, 10_000);
  } catch {
    // sumiu no Asaas ou está fora do ar: segue para a exclusão
  }
  if (pagamento) {
    const status = statusDoAsaas(pagamento.status);
    if (status === "paga" || status === "analise") {
      await aplicarPagamentoAsaas(cobranca.id, pagamento);
      return false;
    }
  }

  await excluirPagamento(cobranca.asaasPaymentId);
  await prisma.cobranca.update({
    where: { id: cobranca.id },
    data: {
      asaasPaymentId: null,
      formaPagamento: null,
      pixPayload: null,
      pixImagem: null,
      pixExpiraEm: null,
      invoiceUrl: null,
    },
  });
  return true;
}

export type CobrancaPublica = {
  codigo: string;
  nome: string;
  descricao: string;
  valor: number;
  status: string;
  formaPagamento: string | null;
  parcela: number;
  pixPayload: string | null;
  pixImagem: string | null;
  pixExpiraEm: string | null;
  invoiceUrl: string | null;
  pagoEm: string | null;
  parcelasPermitidas: number;
};

export function dadosPublicos(c: {
  codigo: string;
  nome: string;
  descricao: string;
  valor: unknown;
  status: string;
  formaPagamento: string | null;
  parcela: number;
  pixPayload: string | null;
  pixImagem: string | null;
  pixExpiraEm: Date | null;
  invoiceUrl: string | null;
  pagoEm: Date | null;
}): CobrancaPublica {
  const valor = Number(c.valor);
  return {
    codigo: c.codigo,
    nome: c.nome,
    descricao: c.descricao,
    valor,
    status: c.status,
    formaPagamento: c.formaPagamento,
    parcela: c.parcela,
    pixPayload: c.status === "paga" ? null : c.pixPayload,
    pixImagem: c.status === "paga" ? null : c.pixImagem,
    pixExpiraEm: c.pixExpiraEm?.toISOString() ?? null,
    invoiceUrl: c.invoiceUrl,
    pagoEm: c.pagoEm?.toISOString() ?? null,
    parcelasPermitidas: parcelasPermitidas(valor),
  };
}
