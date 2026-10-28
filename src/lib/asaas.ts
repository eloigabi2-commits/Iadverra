// Cliente mínimo da API do Asaas (v3), sem dependências externas.
// Configuração por variáveis de ambiente:
//   ASAAS_API_KEY     chave de API da conta (obrigatória para dinheiro real)
//   ASAAS_BASE_URL    opcional; use https://api-sandbox.asaas.com para testes
//   ASAAS_SANDBOX     "true" usa o sandbox sem precisar da ASAAS_BASE_URL
// Documentação: https://docs.asaas.com/

import { prisma } from "@/lib/prisma";

export type FormaPagamento = "PIX" | "CREDIT_CARD";

export type ClienteAsaas = {
  id: string;
  name?: string;
  cpfCnpj?: string;
};

export type CartaoAsaas = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
};

export type TitularCartaoAsaas = {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  addressComplement?: string;
  phone: string;
  mobilePhone?: string;
};

export type PagamentoAsaas = {
  id: string;
  status: string;
  billingType?: string;
  value?: number;
  dueDate?: string;
  invoiceUrl?: string | null;
  externalReference?: string | null;
  creditCard?: { creditCardNumber?: string; creditCardBrand?: string } | null;
  threeDSecureChallengeUrl?: string | null;
};

export type PixAsaas = {
  encodedImage: string;
  payload: string;
  expirationDate?: string | null;
};

// Erro da API com as mensagens que o Asaas devolveu (para mostrar ao cliente)
export class AsaasError extends Error {
  status: number;
  detalhes: string[];

  constructor(status: number, detalhes: string[]) {
    super(detalhes[0] ?? "falha na comunicação com o Asaas");
    this.name = "AsaasError";
    this.status = status;
    this.detalhes = detalhes;
  }
}

type ErroAsaas = { errors?: { code?: string; description?: string }[] };

export function asaasConfigurado(): boolean {
  return !!process.env.ASAAS_API_KEY?.trim();
}

// O Asaas espera DDD + número, sem o 55 do Brasil
function telefoneSemPais(valor: string | null | undefined): string | undefined {
  let digitos = (valor ?? "").replace(/\D/g, "");
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) digitos = digitos.slice(2);
  return digitos || undefined;
}

function base(): string {
  const configurada = process.env.ASAAS_BASE_URL?.trim().replace(/\/+$/, "");
  if (configurada) return configurada;
  if (process.env.ASAAS_SANDBOX === "true") return "https://api-sandbox.asaas.com";
  return "https://api.asaas.com";
}

async function chamar<T>(caminho: string, init: RequestInit = {}, timeoutMs = 30_000): Promise<T> {
  const chave = process.env.ASAAS_API_KEY?.trim();
  if (!chave) throw new AsaasError(500, ["ASAAS_API_KEY não configurada"]);

  let resposta: Response;
  try {
    resposta = await fetch(`${base()}/v3${caminho}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Iadverra/1.0",
        access_token: chave,
        ...(init.headers ?? {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new AsaasError(502, ["não foi possível falar com o Asaas agora"]);
  }

  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => null)) as ErroAsaas | null;
    const detalhes = corpo?.errors?.map((e) => e.description ?? e.code ?? "").filter(Boolean) ?? [];
    throw new AsaasError(resposta.status, detalhes.length > 0 ? detalhes : [`o Asaas recusou a operação (${resposta.status})`]);
  }

  if (resposta.status === 204) return undefined as T;
  return (await resposta.json()) as T;
}

// Reaproveita o cliente pelo CPF/CNPJ para não criar cadastros repetidos
export async function criarOuReutilizarCliente(dados: {
  nome: string;
  cpfCnpj: string;
  email?: string | null;
  telefone?: string | null;
  cep?: string | null;
  numero?: string | null;
}): Promise<ClienteAsaas> {
  const cpfCnpj = dados.cpfCnpj.replace(/\D/g, "");
  const existente = await chamar<{ data: ClienteAsaas[] }>(
    `/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}&limit=1`,
  ).catch((erro) => {
    // busca indisponível não impede a cobrança: segue para o cadastro
    if (erro instanceof AsaasError && erro.status === 400) return { data: [] };
    throw erro;
  });
  if (existente.data?.[0]?.id) return existente.data[0];

  return chamar<ClienteAsaas>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: dados.nome,
      cpfCnpj,
      email: dados.email || undefined,
      phone: telefoneSemPais(dados.telefone),
      mobilePhone: telefoneSemPais(dados.telefone),
      postalCode: dados.cep?.replace(/\D/g, "") || undefined,
      addressNumber: dados.numero || undefined,
      notificationDisabled: false,
    }),
  });
}

type PagamentoBase = {
  customer: string;
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
};

export async function criarPagamentoPix(dados: PagamentoBase): Promise<PagamentoAsaas> {
  return chamar<PagamentoAsaas>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: dados.customer,
      billingType: "PIX",
      value: dados.value,
      dueDate: dados.dueDate,
      description: dados.description,
      externalReference: dados.externalReference,
    }),
  });
}

export async function criarPagamentoCartao(
  dados: PagamentoBase & {
    remoteIp: string;
    parcelas: number;
    cartao: CartaoAsaas;
    titular: TitularCartaoAsaas;
  },
): Promise<PagamentoAsaas> {
  const parcelas = Math.min(Math.max(Math.trunc(dados.parcelas) || 1, 1), 12);
  return chamar<PagamentoAsaas>(
    "/payments",
    {
      method: "POST",
      body: JSON.stringify({
        customer: dados.customer,
        billingType: "CREDIT_CARD",
        ...(parcelas > 1 ? { installmentCount: parcelas, totalValue: dados.value } : { value: dados.value }),
        dueDate: dados.dueDate,
        description: dados.description,
        externalReference: dados.externalReference,
        remoteIp: dados.remoteIp,
        creditCard: {
          holderName: dados.cartao.holderName,
          number: dados.cartao.number.replace(/\D/g, ""),
          expiryMonth: dados.cartao.expiryMonth,
          expiryYear: dados.cartao.expiryYear,
          ccv: dados.cartao.ccv.replace(/\D/g, ""),
        },
        creditCardHolderInfo: {
          name: dados.titular.name,
          email: dados.titular.email,
          cpfCnpj: dados.titular.cpfCnpj.replace(/\D/g, ""),
          postalCode: dados.titular.postalCode.replace(/\D/g, ""),
          addressNumber: dados.titular.addressNumber,
          addressComplement: dados.titular.addressComplement || undefined,
          phone: dados.titular.phone.replace(/\D/g, ""),
          mobilePhone: (dados.titular.mobilePhone ?? dados.titular.phone).replace(/\D/g, ""),
        },
      }),
    },
    // o processamento do cartão pode demorar; o próprio Asaas pede 60s
    60_000,
  );
}

export async function consultarPagamento(paymentId: string, timeoutMs = 15_000): Promise<PagamentoAsaas> {
  return chamar<PagamentoAsaas>(`/payments/${encodeURIComponent(paymentId)}`, {}, timeoutMs);
}

export async function obterPix(paymentId: string): Promise<PixAsaas> {
  return chamar<PixAsaas>(`/payments/${encodeURIComponent(paymentId)}/pixQrCode`);
}

// Remove uma tentativa pendente antes de gerar outra (troca de forma ou novo cartão)
export async function excluirPagamento(paymentId: string): Promise<void> {
  await chamar<void>(`/payments/${encodeURIComponent(paymentId)}`, { method: "DELETE" }).catch((erro) => {
    // já recebido/estornado não pode ser apagado: não é motivo para quebrar a cobrança
    if (erro instanceof AsaasError) return;
    throw erro;
  });
}

// Guarda o id do cliente no banco para as próximas tentativas
export async function garantirClienteDaCobranca(cobranca: {
  id: string;
  asaasCustomerId: string | null;
  nome: string;
  cpfCnpj: string;
  email: string | null;
  telefone: string | null;
}): Promise<string> {
  if (cobranca.asaasCustomerId) return cobranca.asaasCustomerId;
  const cliente = await criarOuReutilizarCliente({
    nome: cobranca.nome,
    cpfCnpj: cobranca.cpfCnpj,
    email: cobranca.email,
    telefone: cobranca.telefone,
  });
  await prisma.cobranca.update({ where: { id: cobranca.id }, data: { asaasCustomerId: cliente.id } });
  return cliente.id;
}
