export const URL_WEBHOOK_CREDITO =
  process.env.CREDITO_WEBHOOK_URL?.trim() || "https://n8n.srv1288686.hstgr.cloud/webhook/credito";

export const PRAZOS = ["Imediato", "30 dias", "60 dias", "90 dias"] as const;

export type FormaCredito = "pix" | "cartao";

export function formaCredito(valor: unknown): FormaCredito | null {
  return valor === "pix" || valor === "cartao" ? valor : null;
}

export function prazoCredito(valor: unknown): string {
  const texto = typeof valor === "string" ? valor.trim().replace(/\s+/g, " ").slice(0, 60) : "";
  return texto || PRAZOS[0];
}

export type RespostaDoWebhook = {
  ok: boolean;
  status: number | null;
  erro: string | null;
};

export async function enviarPedidoAoWebhook(dados: {
  nome: string;
  email: string;
  telefone: string;
  valor: number;
  formaPagamento: FormaCredito;
  prazo: string;
}): Promise<RespostaDoWebhook> {
  try {
    const resposta = await fetch(URL_WEBHOOK_CREDITO, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contratante: {
          nome: dados.nome,
          email: dados.email,
          telefone: dados.telefone,
        },
        servico: {
          valor_implementacao: dados.valor,
          forma_pagamento: dados.formaPagamento,
          prazo: dados.prazo,
        },
      }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });

    if (!resposta.ok) {
      const texto = (await resposta.text().catch(() => "")).slice(0, 300);
      return {
        ok: false,
        status: resposta.status,
        erro: `O webhook respondeu ${resposta.status}${texto ? `: ${texto}` : ""}`,
      };
    }

    return { ok: true, status: resposta.status, erro: null };
  } catch (erro) {
    return {
      ok: false,
      status: null,
      erro: erro instanceof Error ? erro.message : "Não foi possível falar com o webhook",
    };
  }
}

export function rotuloDoPedido(status: string): string {
  if (status === "pago") return "Pago";
  if (status === "erro_webhook") return "Não enviado";
  if (status === "cancelado") return "Cancelado";
  return "Aguardando pagamento";
}

export function corDoPedido(status: string): string {
  if (status === "pago") return "bg-green-100 text-green-800";
  if (status === "erro_webhook") return "bg-red-100 text-red-800";
  if (status === "cancelado") return "bg-tinta/10 text-tinta/60";
  return "bg-amber-100 text-amber-800";
}
